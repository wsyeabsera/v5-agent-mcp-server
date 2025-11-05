import { Task, Plan } from '../models/index.js';
import { logger } from './logger.js';
import {
  resolveParameters,
  resolveParametersWithUserInputs,
  hasUnresolvedPrompts,
  hasUnresolvedGenerations,
  extractUserPromptFields,
  extractGenerationFields,
  TEMPLATE_MARKERS,
} from './templateResolver.js';
import { aiCallTools } from '../tools/aiCallTools.js';
import {
  retryWithBackoff,
  isRetryableError,
  createErrorContext,
  calculateBackoffDelay,
  sleep,
} from './errorRecovery.js';
import {
  validateStateTransition,
  generateLockToken,
  isTerminalStatus,
  canRetryStatus,
  type TaskStatus,
} from './taskStateMachine.js';
import { withTimeout, TimeoutError } from './taskTimeout.js';
import { aiGenerator } from './aiGeneration.js';
import { calculateSuccessMetrics } from './patternExtractor.js';
// Import individual tool groups to avoid circular dependency with taskTools
import { mcpClientTools } from '../tools/mcpClientTools.js';
import { toolManagementTools } from '../tools/management/index.js';
import { mcpResourceTools } from '../tools/mcpResourceTools.js';
import { mcpPromptTools } from '../tools/mcpPromptTools.js';
import { localPromptTools } from '../tools/localPromptTools.js';
import { thoughtTools } from '../tools/thoughtTools.js';
import { planTools } from '../tools/planTools.js';
import { historyTools } from '../tools/historyTools.js';
import { observeTaskExecution } from './memorySystem.js';
import { trackTaskCost } from './costTracker.js';

// Combine all tools except taskTools to avoid circular dependency
const allTools = {
  ...mcpClientTools,
  ...toolManagementTools,
  ...aiCallTools,
  ...mcpResourceTools,
  ...mcpPromptTools,
  ...localPromptTools,
  ...thoughtTools,
  ...planTools,
};

/**
 * TaskExecutor - Core engine for executing plans
 */
export class TaskExecutor {
  /**
   * Acquire task lock for optimistic locking
   */
  private async acquireTaskLock(taskId: string): Promise<string> {
    const lockToken = generateLockToken();
    const result = await Task.findByIdAndUpdate(
      taskId,
      {
        $set: {
          lockToken,
          status: 'in_progress',
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!result || result.lockToken !== lockToken) {
      throw new Error('Task is already being executed or state changed');
    }

    return lockToken;
  }

  /**
   * Execute a task from start or resume from where it left off
   */
  async executeTask(taskId: string): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Check if task is already in terminal state
    if (isTerminalStatus(task.status as TaskStatus)) {
      logger.warn(`[TaskExecutor] Task ${taskId} is in terminal state: ${task.status}`);
      return;
    }

    // Validate state transition (allow if already in_progress)
    if (task.status !== 'in_progress') {
      if (!validateStateTransition(task.status as TaskStatus, 'in_progress')) {
        throw new Error(`Cannot transition from ${task.status} to in_progress`);
      }
      task.status = 'in_progress';
      await task.save();
    }

    // Acquire lock
    const lockToken = await this.acquireTaskLock(taskId);

    try {
      // Load the plan
      const plan = await Plan.findById(task.planId);
      if (!plan) {
        throw new Error(`Plan not found: ${task.planId}`);
      }

      // Update plan status
      await this.updatePlanStatus(task.planId, 'in_progress');

      // Sort steps by order and dependencies
      const sortedSteps = this.sortStepsByDependencies(plan.steps);

      // Execute steps starting from currentStepIndex
      for (let i = task.currentStepIndex; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];

        // Check if step dependencies are met
        if (!this.checkDependencies(step, task.stepOutputs)) {
          logger.warn(`[TaskExecutor] Step ${step.id} dependencies not met, skipping`);
          continue;
        }

        // Update current step index
        await Task.findByIdAndUpdate(taskId, { currentStepIndex: i });

        // Get retry count for this step
        const retryCount = task.retryCount.get(step.id) || 0;
        const maxRetries = task.maxRetries || 3;
        const timeout = task.timeout || 30000;

        // Execute the step with retry and timeout
        const stepResult = await this.executeStepWithRetryAndTimeout(
          step,
          task,
          plan,
          maxRetries,
          timeout,
          retryCount
        );

        // If step execution was paused (user input needed), stop execution
        if (stepResult.paused) {
          await this.updateTaskStatus(taskId, 'paused');
          return;
        }

        // If step failed, update task and plan status
        if (!stepResult.success) {
          await this.updateTaskStatus(taskId, 'failed', stepResult.error);
          await this.updatePlanStatus(task.planId, 'failed');
          
          // Learn from failed task
          await this.learnFromTask(taskId, task.planId, 'failed', task);
          return;
        }

        // Store step output
        task.stepOutputs.set(step.id, stepResult.output);
        
        // Reset retry count on success
        task.retryCount.set(step.id, 0);
        await task.save();

        // Update step status in plan
        await this.updateStepStatus((plan._id as any).toString(), step.id, 'completed');
      }

      // All steps completed
      await this.updateTaskStatus(taskId, 'completed');
      await this.updatePlanStatus(task.planId, 'completed');
      
      // Learn from completed task
      await this.learnFromTask(taskId, task.planId, 'completed', task);
    } catch (error: any) {
      logger.error(`[TaskExecutor] Error executing task ${taskId}:`, error);
      const errorContext = createErrorContext('task', 0, error);
      logger.error(`[TaskExecutor] Error context:`, errorContext);
      
      // Get task before updating status
      const failedTask = await Task.findById(taskId);
      if (failedTask) {
        await this.updateTaskStatus(taskId, 'failed', error.message);
        await this.updatePlanStatus(failedTask.planId, 'failed');
        
        // Learn from failed task
        await this.learnFromTask(taskId, failedTask.planId, 'failed', failedTask);
      } else {
        await this.updateTaskStatus(taskId, 'failed', error.message);
      }
      
      throw error;
    } finally {
      // Release lock
      await Task.findByIdAndUpdate(taskId, { $unset: { lockToken: '' } });
    }
  }

  /**
   * Execute step with retry and timeout
   */
  private async executeStepWithRetryAndTimeout(
    step: any,
    task: any,
    plan: any,
    maxRetries: number,
    timeoutMs: number,
    currentRetryCount: number
  ): Promise<{
    success: boolean;
    paused?: boolean;
    output?: any;
    error?: string;
  }> {
    // Execute with timeout
    try {
      const stepResult = await withTimeout(
        this.executeStepWithRetry(step, task, plan, maxRetries, currentRetryCount),
        timeoutMs,
        `Step ${step.id} execution`
      );
      return stepResult;
    } catch (error: any) {
      if (error instanceof TimeoutError) {
        logger.error(`[TaskExecutor] Step ${step.id} timed out after ${timeoutMs}ms`);
        return {
          success: false,
          error: `Step execution timed out after ${timeoutMs}ms`,
        };
      }
      throw error;
    }
  }

  /**
   * Execute step with retry logic
   */
  private async executeStepWithRetry(
    step: any,
    task: any,
    plan: any,
    maxRetries: number,
    currentRetryCount: number
  ): Promise<{
    success: boolean;
    paused?: boolean;
    output?: any;
    error?: string;
  }> {
    let lastResult: {
      success: boolean;
      paused?: boolean;
      output?: any;
      error?: string;
    };

    // Try execution with retries
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        lastResult = await this.executeStep(step, task, plan);
        
        // If successful or paused, return immediately
        if (lastResult.success && !lastResult.paused) {
          // Reset retry count on success
          task.retryCount.set(step.id, 0);
          return lastResult;
        }
        
        // If paused, return (don't retry)
        if (lastResult.paused) {
          return lastResult;
        }
        
        // If failed, check if retryable
        if (!lastResult.success && lastResult.error) {
          const error = new Error(lastResult.error);
          
          // Check if error is retryable
          if (isRetryableError(error) && attempt < maxRetries) {
            // Update retry count
            const newCount = currentRetryCount + attempt + 1;
            task.retryCount.set(step.id, newCount);
            task.save().catch((err: any) => logger.error(`[TaskExecutor] Error saving retry count:`, err));
            
            // Calculate backoff delay
            const delay = calculateBackoffDelay(attempt, 1000);
            logger.warn(`[TaskExecutor] Retry attempt ${attempt + 1}/${maxRetries} for step ${step.id} after ${delay}ms`);
            
            // Wait before retrying
            await sleep(delay);
            continue;
          }
          
          // Non-retryable or max retries reached
          return lastResult;
        }
        
        return lastResult;
      } catch (error: any) {
        // If executeStep throws (shouldn't happen, but handle it)
        if (isRetryableError(error) && attempt < maxRetries) {
          const newCount = currentRetryCount + attempt + 1;
          task.retryCount.set(step.id, newCount);
          task.save().catch((err: any) => logger.error(`[TaskExecutor] Error saving retry count:`, err));
          
          const delay = calculateBackoffDelay(attempt, 1000);
          logger.warn(`[TaskExecutor] Retry attempt ${attempt + 1}/${maxRetries} for step ${step.id} after ${delay}ms (thrown error)`);
          await sleep(delay);
          continue;
        }
        
        // Non-retryable or max retries - return error result
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    }

    // If we get here, all retries exhausted
    return lastResult! || {
      success: false,
      error: `Step execution failed after ${maxRetries} retries`,
    };
  }

  /**
   * Execute a single step
   */
  private async executeStep(
    step: any,
    task: any,
    plan: any
  ): Promise<{
    success: boolean;
    paused?: boolean;
    output?: any;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // Log step start
      await this.addExecutionHistory(task._id.toString(), {
        stepId: step.id,
        status: 'started',
        timestamp: new Date(),
      });

      // Update step status in plan
      await this.updateStepStatus((plan._id as any).toString(), step.id, 'in_progress');

      // Create execution context with user inputs
      const context = {
        stepOutputs: task.stepOutputs,
        userInputs: task.userInputs,
        now: new Date().toISOString(),
      };

      // Resolve parameters with user inputs merged in first
      let resolvedParams = await resolveParametersWithUserInputs(
        step.parameters,
        step.id,
        context
      );

      // Check for user prompts that need to be resolved
      if (hasUnresolvedPrompts(resolvedParams)) {
        const promptFields = extractUserPromptFields(resolvedParams, step.id);
        
        // Update task with pending user inputs
        await Task.findByIdAndUpdate(task._id, {
          $push: {
            pendingUserInputs: { $each: promptFields },
          },
        });

        // Mark step as paused
        await this.updateStepStatus((plan._id as any).toString(), step.id, 'pending');
        
        return {
          success: true,
          paused: true,
        };
      }

      // Check for generation markers that need AI generation
      if (hasUnresolvedGenerations(resolvedParams)) {
        const generationFields = extractGenerationFields(resolvedParams, step.id);
        
        // Get field type from step parameters or missingData
        const plan = await Plan.findById(task.planId);
        const missingData = plan?.missingData || [];
        
        // Generate values for each field
        for (const field of generationFields) {
          // Find field type from missingData or infer from field name
          const fieldInfo = missingData.find((md: any) => md.step === step.id && md.field === field.field);
          const fieldType = fieldInfo?.type || 'string';
          
          const generatedValue = await aiGenerator.generateValue(
            field.field,
            fieldType,
            {
              stepId: step.id,
              action: step.action,
              parameters: step.parameters,
              expectedOutput: step.expectedOutput,
            },
            task.agentConfigId
          );
          
          // Set the generated value in resolvedParams
          this.setNestedValue(resolvedParams, field.field, generatedValue);
        }
      }

      // Execute the tool
      const toolName = step.action;
      let tool = allTools[toolName as keyof typeof allTools];
      let result: any;

      // If tool not found locally, try to execute via execute_mcp_tool (remote tool)
      if (!tool) {
        const executeMcpTool = allTools['execute_mcp_tool' as keyof typeof allTools];
        if (executeMcpTool) {
          logger.info(`[TaskExecutor] Tool ${toolName} not found locally, executing via execute_mcp_tool`);
          // Wrap the call in execute_mcp_tool
          const wrappedParams = {
            toolName: toolName,
            arguments: resolvedParams,
          };
          result = await executeMcpTool.handler(wrappedParams as any);
        } else {
          throw new Error(`Tool not found: ${toolName} (and execute_mcp_tool is not available)`);
        }
      } else {
        // Call the tool handler with resolved parameters
        result = await tool.handler(resolvedParams as any);
      }

      // Check if tool execution returned an error
      if ('isError' in result && result.isError) {
        const errorMsg = result.content?.[0]?.text || 'Tool execution failed';
        
        await this.addExecutionHistory(task._id.toString(), {
          stepId: step.id,
          status: 'failed',
          timestamp: new Date(),
          error: errorMsg,
          duration: Date.now() - startTime,
        });

        await this.updateStepStatus((plan._id as any).toString(), step.id, 'failed');

        return {
          success: false,
          error: errorMsg,
        };
      }

      // Extract output from result
      // Result from execute_mcp_tool is: { content: [{ type: 'text', text: JSON.stringify(remoteResult) }] }
      // Where remoteResult is: { content: [{ type: 'text', text: JSON.stringify(actualData) }] }
      let output: any;
      if (result.content && result.content[0]) {
        const contentText = result.content[0].text;
        try {
          // First parse: gets the remote MCP response structure
          const firstParse = JSON.parse(contentText);
          
          // If it's the MCP format with content array, extract the inner text
          if (firstParse && typeof firstParse === 'object' && firstParse.content && Array.isArray(firstParse.content)) {
            const innerText = firstParse.content[0]?.text;
            if (innerText) {
              try {
                // Second parse: gets the actual data (array, object, etc.)
                output = JSON.parse(innerText);
              } catch {
                // If inner parse fails, use the inner text as-is
                output = innerText;
              }
            } else {
              output = firstParse;
            }
          } else {
            // If it's already the actual data (not wrapped), use it directly
            output = firstParse;
          }
        } catch {
          // If not JSON, use as string
          output = contentText;
        }
      } else {
        output = result;
      }
      
      // Normalize output to consistent format
      output = this.normalizeOutput(output);

      const duration = Date.now() - startTime;

      // Log step completion
      await this.addExecutionHistory(task._id.toString(), {
        stepId: step.id,
        status: 'completed',
        timestamp: new Date(),
        duration,
        output,
      });

      return {
        success: true,
        output,
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      logger.error(`[TaskExecutor] Error executing step ${step.id}:`, error);

      await this.addExecutionHistory(task._id.toString(), {
        stepId: step.id,
        status: 'failed',
        timestamp: new Date(),
        error: error.message,
        duration,
      });

      await this.updateStepStatus(plan._id.toString(), step.id, 'failed');

      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Sort steps by dependencies (topological sort)
   */
  private sortStepsByDependencies(steps: any[]): any[] {
    const sorted: any[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (step: any) => {
      if (visiting.has(step.id)) {
        throw new Error(`Circular dependency detected involving step ${step.id}`);
      }
      if (visited.has(step.id)) {
        return;
      }

      visiting.add(step.id);

      // Visit dependencies first
      for (const depId of step.dependencies || []) {
        const depStep = steps.find((s) => s.id === depId);
        if (depStep) {
          visit(depStep);
        }
      }

      visiting.delete(step.id);
      visited.add(step.id);
      sorted.push(step);
    };

    // Sort by order first, then visit
    const orderedSteps = [...steps].sort((a, b) => a.order - b.order);
    
    for (const step of orderedSteps) {
      if (!visited.has(step.id)) {
        visit(step);
      }
    }

    return sorted;
  }

  /**
   * Check if step dependencies are met
   */
  private checkDependencies(step: any, stepOutputs: Map<string, any>): boolean {
    for (const depId of step.dependencies || []) {
      if (!stepOutputs.has(depId)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Normalize output to consistent format
   * Wraps arrays/objects in { output: ... } for template resolution
   * Handles edge cases like null, empty arrays, error responses
   */
  private normalizeOutput(output: any): any {
    // Handle null/undefined
    if (output === null || output === undefined) {
      return { output: null };
    }

    // Handle error responses
    if (typeof output === 'object' && 'isError' in output && output.isError) {
      return { output: null, error: output.content?.[0]?.text || 'Unknown error' };
    }

    // Handle empty arrays
    if (Array.isArray(output) && output.length === 0) {
      return { output: [] };
    }

    // Wrap in { output: ... } format for template resolution
    // This allows templates like {{step1.output[0]._id}} to work
    return { output: output };
  }

  /**
   * Set a nested value in an object using dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split(/[\.\[\]]+/).filter(Boolean);
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrayIndex = parseInt(part, 10);
      
      if (!isNaN(arrayIndex) && Array.isArray(current)) {
        if (!current[arrayIndex]) {
          current[arrayIndex] = {};
        }
        current = current[arrayIndex];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }

    const lastPart = parts[parts.length - 1];
    const lastArrayIndex = parseInt(lastPart, 10);
    
    if (!isNaN(lastArrayIndex) && Array.isArray(current)) {
      current[lastArrayIndex] = value;
    } else {
      current[lastPart] = value;
    }
  }

  /**
   * Update task status with validation
   */
  private async updateTaskStatus(
    taskId: string,
    status: TaskStatus,
    error?: string
  ): Promise<void> {
    // Get current task to validate transition
    const task = await Task.findById(taskId);
    if (task && !validateStateTransition(task.status as TaskStatus, status)) {
      logger.warn(`[TaskExecutor] Invalid state transition: ${task.status} -> ${status}`);
      // Still update, but log warning
    }

    await Task.findByIdAndUpdate(taskId, {
      status,
      ...(error && { error }),
    });
  }

  /**
   * Update plan status
   */
  private async updatePlanStatus(
    planId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'
  ): Promise<void> {
    await Plan.findByIdAndUpdate(planId, { status });
  }

  /**
   * Update step status in plan
   */
  private async updateStepStatus(
    planId: string,
    stepId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  ): Promise<void> {
    await Plan.findByIdAndUpdate(
      planId,
      {
        $set: {
          'steps.$[step].status': status,
        },
      },
      {
        arrayFilters: [{ 'step.id': stepId }],
      }
    );
  }

  /**
   * Add execution history entry
   */
  private async addExecutionHistory(
    taskId: string,
    entry: {
      stepId: string;
      timestamp: Date;
      status: 'started' | 'completed' | 'failed' | 'skipped';
      error?: string;
      duration?: number;
      output?: any;
    }
  ): Promise<void> {
    await Task.findByIdAndUpdate(taskId, {
      $push: {
        executionHistory: entry,
      },
    });
  }

  /**
   * Resume task execution after user input
   */
  async resumeTask(taskId: string, userInputs: Array<{ stepId: string; field: string; value: any }>): Promise<void> {
    const task = await Task.findById(taskId);
    if (!task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    if (task.status !== 'paused') {
      throw new Error(`Task is not paused. Current status: ${task.status}`);
    }

    // Store user inputs in the userInputs map (not stepOutputs)
    // Group inputs by stepId
    const inputsByStep: Map<string, Record<string, any>> = new Map();
    
    for (const input of userInputs) {
      if (!inputsByStep.has(input.stepId)) {
        inputsByStep.set(input.stepId, {});
      }
      const stepInputs = inputsByStep.get(input.stepId)!;
      
      // Set the user input value using dot notation
      this.setNestedValue(stepInputs, input.field, input.value);
    }

    // Store user inputs in task.userInputs map
    for (const [stepId, stepInputs] of inputsByStep.entries()) {
      task.userInputs.set(stepId, stepInputs);
    }

    // Clear pending user inputs
    task.pendingUserInputs = [];
    
    // Validate state transition: paused -> in_progress
    if (!validateStateTransition(task.status as TaskStatus, 'in_progress')) {
      throw new Error(`Cannot transition from ${task.status} to in_progress`);
    }
    task.status = 'in_progress';
    
    // Reset the paused step's status in plan to allow re-execution
    // The currentStepIndex already points to the step that was paused
    const plan = await Plan.findById(task.planId);
    if (plan) {
      const sortedSteps = this.sortStepsByDependencies(plan.steps);
      const pausedStepIndex = task.currentStepIndex;
      
      if (sortedSteps[pausedStepIndex]) {
        const pausedStep = sortedSteps[pausedStepIndex];
        // Reset step status to pending so it can be re-executed
        await this.updateStepStatus((plan._id as any).toString(), pausedStep.id, 'pending');
      }
    }

    await task.save();

    // Continue execution - this will re-execute the current step with user inputs applied
    await this.executeTask(taskId);
  }

  /**
   * Learn from task completion - extracts patterns and updates metrics
   */
  private async learnFromTask(
    taskId: string,
    planId: string,
    status: 'completed' | 'failed',
    task: any
  ): Promise<void> {
    try {
      // Calculate success metrics
      const metrics = calculateSuccessMetrics(task);

      // Call learn_from_task tool (backward compatibility)
      const result = await historyTools.learn_from_task.handler({
        taskId,
        planId,
        status,
        metrics,
        insights: [], // Can be enhanced later to extract insights automatically
      });

      // Parse response
      let resultData: any;
      if (typeof result === 'string') {
        try {
          resultData = JSON.parse(result);
        } catch {
          resultData = { success: false, message: result };
        }
      } else {
        resultData = result;
      }

      if (!resultData.success) {
        logger.warn(`[TaskExecutor] Failed to learn from task ${taskId}:`, resultData.message || 'Unknown error');
      } else {
        logger.debug(`[TaskExecutor] Learned from task ${taskId}: ${resultData.data?.patternsLearned || 0} patterns, ${resultData.data?.insightsStored || 0} insights`);
      }

      // Also call new memory system for enhanced learning
      try {
        const plan = await Plan.findById(planId);
        if (plan) {
          await observeTaskExecution(task, plan, null);
          logger.debug(`[TaskExecutor] Memory system observed task ${taskId}`);
        }
      } catch (memoryError: any) {
        logger.warn(`[TaskExecutor] Memory system observation failed for task ${taskId}:`, memoryError.message);
        // Don't fail the whole task if memory system fails
      }

      // Track cost for the task
      try {
        await trackTaskCost(taskId, planId, task.agentConfigId);
        logger.debug(`[TaskExecutor] Cost tracked for task ${taskId}`);
      } catch (costError: any) {
        logger.warn(`[TaskExecutor] Cost tracking failed for task ${taskId}:`, costError.message);
        // Don't fail the whole task if cost tracking fails
      }
    } catch (error: any) {
      // Don't fail task execution if learning fails
      logger.error(`[TaskExecutor] Error learning from task ${taskId}:`, error);
    }
  }
}

// Export singleton instance
export const taskExecutor = new TaskExecutor();

