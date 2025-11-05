import { Task, Plan, Thought, MemoryPattern, ToolPerformance, AgentInsight, UserPreference } from '../models/index.js';
import { logger } from './logger.js';
import {
  extractQueryPattern,
  extractPlanPattern,
  extractGoalPattern,
  extractErrorPattern,
  extractContext,
  calculateSuccessMetrics,
  calculateReliability,
  generatePatternId,
} from './patternExtractor.js';
import { generateEmbedding } from './embeddings.js';
import { upsertParameterMemory } from './pinecone.js';

/**
 * Memory System - Centralized learning and memory management
 */

/**
 * Observe task execution and extract learnings
 * Called automatically after task completion
 */
export async function observeTaskExecution(
  task: any,
  plan: any,
  thought?: any
): Promise<void> {
  try {
    logger.debug(`[MemorySystem] Observing task execution: ${task._id}`);

    // Extract patterns
    await extractPatterns(task, plan, thought);

    // Update tool performance
    await updateToolMemory(task, plan);

    // Store insights
    await extractInsights(task, plan);

    // Learn from outcomes
    await learnFromOutcome(task, plan);

    logger.debug(`[MemorySystem] Completed observation for task: ${task._id}`);
  } catch (error: any) {
    logger.error(`[MemorySystem] Error observing task execution:`, error);
    // Don't throw - memory system failures shouldn't break task execution
  }
}

/**
 * Extract and store patterns from execution
 */
async function extractPatterns(
  task: any,
  plan: any,
  thought?: any
): Promise<void> {
  try {
    const context = extractContext(task, plan);
    const queryPattern = extractQueryPattern(plan.userQuery);
    const goalPattern = extractGoalPattern(plan.goal);
    const stepSequence = extractPlanPattern(plan);

    // Store query pattern
    if (task.status === 'completed' || task.status === 'failed') {
      const patternId = generatePatternId(queryPattern, stepSequence);
      const existingPattern = await MemoryPattern.findOne({ patternId });

      const metrics = calculateSuccessMetrics(task);
      const isSuccess = task.status === 'completed';
      
      // Calculate reliability (simplified - use success rate as proxy)
      const reliability = isSuccess ? 1.0 : 0.5;

      const evidence = {
        taskId: task._id.toString(),
        planId: plan._id.toString(),
        outcome: isSuccess ? 'success' as const : 'failure' as const,
        timestamp: new Date(),
      };

      if (existingPattern) {
        // Update existing pattern
        const newUsageCount = existingPattern.usageCount + 1;
        const successCount = existingPattern.evidence.filter(e => e.outcome === 'success').length + (isSuccess ? 1 : 0);
        const newSuccessRate = successCount / newUsageCount;
        
        const newAvgExecutionTime = (
          (existingPattern.successMetrics.avgExecutionTime * existingPattern.usageCount) +
          metrics.executionTime
        ) / newUsageCount;

        const newAvgSteps = (
          (existingPattern.successMetrics.avgSteps * existingPattern.usageCount) +
          metrics.stepsCompleted
        ) / newUsageCount;

        const newReliability = calculateReliability(
          successCount,
          newUsageCount,
          0.1 // Simplified variance
        );

        existingPattern.usageCount = newUsageCount;
        existingPattern.successMetrics.successRate = newSuccessRate;
        existingPattern.successMetrics.avgExecutionTime = newAvgExecutionTime;
        existingPattern.successMetrics.avgSteps = newAvgSteps;
        existingPattern.successMetrics.reliability = newReliability;
        existingPattern.lastUsed = new Date();
        existingPattern.evidence.push(evidence);
        existingPattern.confidence = Math.min(1.0, newUsageCount / 10); // Confidence increases with usage
        
        await existingPattern.save();
      } else {
        // Create new pattern
        await MemoryPattern.create({
          patternId,
          patternType: 'plan_pattern',
          pattern: {
            query: queryPattern,
            goal: goalPattern,
            steps: stepSequence,
            context,
          },
          successMetrics: {
            successRate: isSuccess ? 1.0 : 0.0,
            avgExecutionTime: metrics.executionTime,
            avgSteps: metrics.stepsCompleted,
            reliability,
          },
          usageCount: 1,
          lastUsed: new Date(),
          firstSeen: new Date(),
          evidence: [evidence],
          confidence: 0.5,
          validatedAt: new Date(),
        });
      }

      // Store error patterns if failed
      if (task.status === 'failed' && task.error) {
        const errorPattern = extractErrorPattern(task.error);
        const errorPatternId = `error_${errorPattern.substring(0, 50).replace(/[^a-z0-9_]/g, '_')}`;
        
        await MemoryPattern.findOneAndUpdate(
          { patternId: errorPatternId },
          {
            patternId: errorPatternId,
            patternType: 'error_pattern',
            pattern: {
              context,
              query: errorPattern,
            },
            successMetrics: {
              successRate: 0.0,
              avgExecutionTime: metrics.executionTime,
              avgSteps: metrics.stepsCompleted,
              reliability: 0.5,
            },
            usageCount: 1,
            lastUsed: new Date(),
            firstSeen: new Date(),
            evidence: [evidence],
            confidence: 0.5,
            validatedAt: new Date(),
          },
          { upsert: true }
        );
      }
    }
  } catch (error: any) {
    logger.error(`[MemorySystem] Error extracting patterns:`, error);
  }
}

/**
 * Update tool memory with performance data
 */
async function updateToolMemory(task: any, plan: any): Promise<void> {
  try {
    const context = extractContext(task, plan);
    const metrics = calculateSuccessMetrics(task);

    for (const step of plan.steps) {
      // Find the latest execution history entry for this step
      const stepHistoryEntries = task.executionHistory
        .filter((e: any) => e.stepId === step.id)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (stepHistoryEntries.length === 0) continue;

      const stepHistory = stepHistoryEntries[0];
      const isSuccess = stepHistory.status === 'completed';
      const duration = stepHistory.duration || 0;
      const retryCount = task.retryCount.get(step.id) || 0;

      // Update tool performance
      const toolPerf = await ToolPerformance.findOne({ toolName: step.action });

      if (toolPerf) {
        // Update performance metrics
        const newTotal = toolPerf.performance.totalExecutions + 1;
        const newSuccessCount = toolPerf.performance.successCount + (isSuccess ? 1 : 0);
        const newFailureCount = toolPerf.performance.failureCount + (isSuccess ? 0 : 1);
        const newSuccessRate = newSuccessCount / newTotal;
        const newAvgDuration = (
          (toolPerf.performance.avgDuration * toolPerf.performance.totalExecutions) + duration
        ) / newTotal;
        const newAvgRetries = (
          (toolPerf.performance.avgRetries * toolPerf.performance.totalExecutions) + retryCount
        ) / newTotal;

        toolPerf.performance.totalExecutions = newTotal;
        toolPerf.performance.successCount = newSuccessCount;
        toolPerf.performance.failureCount = newFailureCount;
        toolPerf.performance.successRate = newSuccessRate;
        toolPerf.performance.avgDuration = newAvgDuration;
        toolPerf.performance.avgRetries = newAvgRetries;

        // Update optimal contexts
        const contextIndex = toolPerf.optimalContexts.findIndex(
          (c: any) => c.context === context
        );

        if (contextIndex >= 0) {
          const ctx = toolPerf.optimalContexts[contextIndex];
          const newCtxUsage = ctx.usageCount + 1;
          const newCtxSuccessCount = (ctx.successRate * ctx.usageCount) + (isSuccess ? 1 : 0);
          const newCtxSuccessRate = newCtxSuccessCount / newCtxUsage;
          const newCtxAvgDuration = (
            (ctx.avgDuration * ctx.usageCount) + duration
          ) / newCtxUsage;

          ctx.usageCount = newCtxUsage;
          ctx.successRate = newCtxSuccessRate;
          ctx.avgDuration = newCtxAvgDuration;
        } else {
          toolPerf.optimalContexts.push({
            context,
            successRate: isSuccess ? 1.0 : 0.0,
            avgDuration: duration,
            usageCount: 1,
          });
        }

        // Update common errors
        if (!isSuccess && stepHistory.error) {
          const errorIndex = toolPerf.commonErrors.findIndex(
            (e: any) => e.error === stepHistory.error?.substring(0, 200)
          );

          if (errorIndex >= 0) {
            toolPerf.commonErrors[errorIndex].frequency += 1;
            if (!toolPerf.commonErrors[errorIndex].contexts.includes(context)) {
              toolPerf.commonErrors[errorIndex].contexts.push(context);
            }
          } else {
            toolPerf.commonErrors.push({
              error: stepHistory.error.substring(0, 200),
              frequency: 1,
              percentage: 0,
              contexts: [context],
              solutions: [],
            });
          }

          // Recalculate percentages
          toolPerf.commonErrors.forEach((err: any) => {
            err.percentage = (err.frequency / newTotal) * 100;
          });
        }

        // Store parameter insights in Pinecone
        if (isSuccess && step.parameters) {
          try {
            for (const [paramName, paramValue] of Object.entries(step.parameters)) {
              const paramText = `${step.action}_${paramName}_${JSON.stringify(paramValue)}`;
              const embedding = await generateEmbedding(paramText);
              
              const memoryId = `${step.action}_${paramName}_${Date.now()}`;
              
              await upsertParameterMemory(
                memoryId,
                step.action,
                paramName,
                paramValue,
                context,
                embedding,
                {
                  successRate: newSuccessRate,
                  usageCount: 1,
                  optimalValue: true,
                }
              );
            }
          } catch (error: any) {
            logger.warn(`[MemorySystem] Failed to store parameter memory:`, error.message);
          }
        }

        toolPerf.lastUpdated = new Date();
        await toolPerf.save();
      } else {
        // Create new tool performance record
        await ToolPerformance.create({
          toolName: step.action,
          performance: {
            totalExecutions: 1,
            successCount: isSuccess ? 1 : 0,
            failureCount: isSuccess ? 0 : 1,
            successRate: isSuccess ? 1.0 : 0.0,
            avgDuration: duration,
            avgRetries: retryCount,
          },
          optimalContexts: [{
            context,
            successRate: isSuccess ? 1.0 : 0.0,
            avgDuration: duration,
            usageCount: 1,
          }],
          commonErrors: !isSuccess && stepHistory.error ? [{
            error: stepHistory.error.substring(0, 200),
            frequency: 1,
            percentage: 100,
            contexts: [context],
            solutions: [],
          }] : [],
          parameterInsights: [],
          recommendations: [],
          lastUpdated: new Date(),
          lastAnalyzed: new Date(),
        });
      }
    }
  } catch (error: any) {
    logger.error(`[MemorySystem] Error updating tool memory:`, error);
  }
}

/**
 * Extract insights from task execution
 */
async function extractInsights(task: any, plan: any): Promise<void> {
  try {
    // This is a basic implementation - can be enhanced with AI analysis
    if (task.status === 'completed') {
      const metrics = calculateSuccessMetrics(task);
      
      // Generate insights based on execution
      if (metrics.userInputsRequired === 0 && metrics.retries === 0) {
        const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        
        await AgentInsight.findOneAndUpdate(
          { insightId },
          {
            insightId,
            agentType: 'executor',
            insightType: 'best_practice',
            insight: `Task completed successfully without user input or retries`,
            appliesTo: {
              contexts: [extractContext(task, plan)],
            },
            evidence: [{
              taskId: task._id.toString(),
              description: 'Successful execution',
              timestamp: new Date(),
            }],
            confidence: 0.7,
            evidenceStrength: 0.8,
            validated: false,
            usageCount: 0,
            lastUsed: new Date(),
          },
          { upsert: true }
        );
      }
    }
  } catch (error: any) {
    logger.error(`[MemorySystem] Error extracting insights:`, error);
  }
}

/**
 * Learn from task outcome
 */
async function learnFromOutcome(task: any, plan: any): Promise<void> {
  try {
    // Additional learning logic can be added here
    // For now, patterns and tool memory are already updated
    logger.debug(`[MemorySystem] Learned from outcome: ${task._id} (${task.status})`);
  } catch (error: any) {
    logger.error(`[MemorySystem] Error learning from outcome:`, error);
  }
}

/**
 * Remember - Query memory for learned knowledge
 */
export async function remember(
  pattern: string,
  context?: string
): Promise<{
  patterns: any[];
  toolMemory: any[];
  insights: any[];
  preferences: any[];
}> {
  try {
    // Find relevant patterns
    const patterns = await findPatterns(pattern, context);

    // Get tool recommendations
    const toolMemory = context ? await getToolMemory(context) : [];

    // Get relevant insights
    const insights = await getInsights(context);

    // Get user preferences (if user context provided)
    const preferences = context ? await getPreferences(context) : [];

    return { patterns, toolMemory, insights, preferences };
  } catch (error: any) {
    logger.error(`[MemorySystem] Error remembering:`, error);
    return { patterns: [], toolMemory: [], insights: [], preferences: [] };
  }
}

/**
 * Find patterns matching query
 */
async function findPatterns(
  pattern: string,
  context?: string
): Promise<any[]> {
  const query: any = {
    $or: [
      { 'pattern.query': { $regex: pattern, $options: 'i' } },
      { 'pattern.goal': { $regex: pattern, $options: 'i' } },
    ],
  };

  if (context) {
    query['pattern.context'] = context;
  }

  return await MemoryPattern.find(query)
    .sort({ 'successMetrics.successRate': -1, usageCount: -1 })
    .limit(10)
    .lean();
}

/**
 * Get tool memory for context
 */
async function getToolMemory(context: string): Promise<any[]> {
  return await ToolPerformance.find({
    'optimalContexts.context': context,
  })
    .sort({ 'performance.successRate': -1 })
    .limit(10)
    .lean();
}

/**
 * Get insights for context
 */
async function getInsights(context?: string): Promise<any[]> {
  const query: any = {
    // Include both validated and unvalidated insights, but prioritize validated ones
    confidence: { $gte: 0.5 }, // Minimum confidence threshold
  };
  
  if (context) {
    query['appliesTo.contexts'] = context;
  }

  return await AgentInsight.find(query)
    .sort({ validated: -1, confidence: -1, usageCount: -1 }) // Validated insights first
    .limit(10)
    .lean();
}

/**
 * Get user preferences
 */
async function getPreferences(userContext: string): Promise<any[]> {
  return await UserPreference.find({ userContext })
    .sort({ lastUpdated: -1 })
    .limit(5)
    .lean();
}

