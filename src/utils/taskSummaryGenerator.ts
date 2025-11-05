import { logger } from './logger.js';
import { aiCallTools } from '../tools/aiCallTools.js';
import { Task, Plan, Thought } from '../models/index.js';

/**
 * Summary context data structure
 */
export interface SummaryContext {
  task: {
    id: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    error?: string;
    currentStepIndex: number;
    timeout?: number;
    maxRetries?: number;
  };
  plan: {
    goal: string;
    userQuery: string;
    steps: Array<{
      id: string;
      order: number;
      action: string;
      status: string;
      parameters?: Record<string, any>;
    }>;
  };
  thought?: {
    userQuery: string;
    primaryApproach: string;
    keyInsights: string[];
    recommendedTools: string[];
  };
  executionHistory: Array<{
    stepId: string;
    timestamp: Date;
    status: string;
    duration?: number;
    error?: string;
    output?: any;
  }>;
  stepOutputs: Record<string, any>;
  userInputs: Record<string, any>;
  retryCounts: Record<string, number>;
  pendingUserInputs: Array<{
    stepId: string;
    field: string;
    description?: string;
  }>;
  statistics: {
    totalDuration?: number;
    completedSteps: number;
    failedSteps: number;
    pausedSteps: number;
    totalRetries: number;
    averageStepDuration?: number;
  };
  createdEntities: Array<{
    type: string;
    id?: string;
    name?: string;
    stepId: string;
  }>;
}

/**
 * Task Summary Generator
 * Generates intelligent, first-person conversational markdown summaries of task execution
 */
export class TaskSummaryGenerator {
  /**
   * Generate a summary for a task
   */
  async generateSummary(
    taskId: string,
    format: 'brief' | 'detailed' | 'technical' = 'detailed',
    includeInsights: boolean = true,
    includeRecommendations: boolean = true,
    agentConfigId: string
  ): Promise<string> {
    try {
      // Fetch task, plan, and thought
      const task = await Task.findById(taskId);
      if (!task) {
        throw new Error(`Task not found: ${taskId}`);
      }

      const plan = await Plan.findById(task.planId);
      if (!plan) {
        throw new Error(`Plan not found: ${task.planId}`);
      }

      // Fetch thought if available
      let thought = null;
      if (plan.thoughtId) {
        thought = await Thought.findById(plan.thoughtId);
      }

      // Build summary context
      const context = this.buildSummaryContext(task, plan, thought);

      // Build AI prompt
      const prompt = this.buildAIPrompt(context, format, includeInsights, includeRecommendations);

      // Generate summary using AI
      const aiResult = await aiCallTools.execute_ai_call.handler({
        agentConfigId,
        messages: [
          {
            role: 'system',
            content: `You are an intelligent task execution assistant. Your role is to provide clear, conversational, first-person summaries of task execution in markdown format. Write as if you performed the task yourself, using "I" statements. Be helpful, concise, and provide actionable insights when relevant.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      if ('isError' in aiResult && aiResult.isError) {
        throw new Error(aiResult.content?.[0]?.text || 'AI generation failed');
      }

      // Extract summary from AI response
      // execute_ai_call returns { content: [{ text: JSON.stringify({ response: "..." }) }] }
      const contentText = aiResult.content?.[0]?.text || '';
      let summary = '';

      try {
        // Parse the response wrapper from execute_ai_call
        const responseData = JSON.parse(contentText);
        // Extract the actual response text (could be markdown or JSON)
        const rawResponse = responseData.response || responseData.text || contentText;

        // If the response is JSON (unlikely for markdown, but handle it), try to extract summary field
        try {
          const innerData = JSON.parse(rawResponse);
          summary = innerData.summary || innerData.text || innerData.response || rawResponse;
        } catch {
          // If not JSON, use rawResponse directly (should be markdown text)
          summary = rawResponse;
        }
      } catch {
        // If parsing fails, use contentText directly
        summary = contentText;
      }

      // Format and return summary
      return this.formatSummaryResponse(summary, context, format);
    } catch (error: any) {
      logger.error(`[TaskSummaryGenerator] Error generating summary:`, error);
      throw new Error(`Failed to generate summary: ${error.message}`);
    }
  }

  /**
   * Build summary context from task, plan, and thought
   */
  private buildSummaryContext(task: any, plan: any, thought: any | null): SummaryContext {
    // Convert Maps to objects
    const stepOutputs: Record<string, any> = {};
    task.stepOutputs.forEach((value: any, key: string) => {
      stepOutputs[key] = value;
    });

    const userInputs: Record<string, any> = {};
    task.userInputs.forEach((value: any, key: string) => {
      userInputs[key] = value;
    });

    const retryCounts: Record<string, number> = {};
    task.retryCount.forEach((value: number, key: string) => {
      retryCounts[key] = value;
    });

    // Calculate statistics
    const executionHistory = task.executionHistory || [];
    const completedEntries = executionHistory.filter((e: any) => e.status === 'completed');
    const failedEntries = executionHistory.filter((e: any) => e.status === 'failed');
    const pausedEntries = executionHistory.filter((e: any) => e.status === 'started' && task.status === 'paused');

    const durations = executionHistory
      .filter((e: any) => e.duration)
      .map((e: any) => e.duration);
    const totalDuration = durations.reduce((sum: number, d: number) => sum + d, 0);
    const averageStepDuration = durations.length > 0 ? totalDuration / durations.length : undefined;

    const totalRetries = Object.values(retryCounts).reduce((sum, count) => sum + count, 0);

    // Extract created entities from step outputs
    const createdEntities = this.extractCreatedEntities(stepOutputs, plan.steps);

    return {
      task: {
        id: task._id.toString(),
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        error: task.error,
        currentStepIndex: task.currentStepIndex,
        timeout: task.timeout,
        maxRetries: task.maxRetries,
      },
      plan: {
        goal: plan.goal,
        userQuery: plan.userQuery,
        steps: plan.steps.map((step: any) => ({
          id: step.id,
          order: step.order,
          action: step.action,
          status: step.status,
          parameters: step.parameters,
        })),
      },
      thought: thought
        ? {
            userQuery: thought.userQuery,
            primaryApproach: thought.primaryApproach,
            keyInsights: thought.keyInsights || [],
            recommendedTools: thought.recommendedTools || [],
          }
        : undefined,
      executionHistory,
      stepOutputs,
      userInputs,
      retryCounts,
      pendingUserInputs: task.pendingUserInputs || [],
      statistics: {
        totalDuration,
        completedSteps: completedEntries.length,
        failedSteps: failedEntries.length,
        pausedSteps: pausedEntries.length,
        totalRetries,
        averageStepDuration,
      },
      createdEntities,
    };
  }

  /**
   * Extract created entities from step outputs
   */
  private extractCreatedEntities(
    stepOutputs: Record<string, any>,
    planSteps: Array<{ id: string; action: string }>
  ): Array<{ type: string; id?: string; name?: string; stepId: string }> {
    const entities: Array<{ type: string; id?: string; name?: string; stepId: string }> = [];

    for (const [stepId, output] of Object.entries(stepOutputs)) {
      const step = planSteps.find((s) => s.id === stepId);
      const action = step?.action || '';

      // Extract entity type from action (e.g., "create_facility" -> "facility")
      const entityType = action.replace(/^(create_|get_|update_|delete_)/, '').replace(/_/g, ' ');

      // Try to extract ID and name from output
      const outputData = output?.output || output;
      let entityId: string | undefined;
      let entityName: string | undefined;

      if (outputData) {
        // Handle array output (e.g., list operations)
        if (Array.isArray(outputData)) {
          for (const item of outputData) {
            if (item?._id) {
              entityId = item._id;
              entityName = item.name || item.title || item.shortCode || undefined;
              entities.push({
                type: entityType,
                id: entityId,
                name: entityName,
                stepId,
              });
            }
          }
        } else if (outputData._id) {
          // Handle single object output
          entityId = outputData._id;
          entityName =
            outputData.name ||
            outputData.title ||
            outputData.shortCode ||
            outputData.license_plate ||
            outputData.contract_reference_id ||
            undefined;

          entities.push({
            type: entityType,
            id: entityId,
            name: entityName,
            stepId,
          });
        }
      }
    }

    return entities;
  }

  /**
   * Build AI prompt for summary generation
   */
  private buildAIPrompt(
    context: SummaryContext,
    format: 'brief' | 'detailed' | 'technical',
    includeInsights: boolean,
    includeRecommendations: boolean
  ): string {
    const statusEmoji =
      context.task.status === 'completed'
        ? '✅'
        : context.task.status === 'failed'
        ? '❌'
        : context.task.status === 'paused'
        ? '⏸️'
        : '🔄';

    let prompt = `Generate a ${format} first-person markdown summary of this task execution. Write as if you performed the task yourself.

# Task Information

**Status**: ${statusEmoji} ${context.task.status}
**Goal**: ${context.plan.goal}
**User Query**: ${context.plan.userQuery}
**Started**: ${context.task.createdAt.toISOString()}
${context.task.updatedAt ? `**Last Updated**: ${context.task.updatedAt.toISOString()}` : ''}
${context.statistics.totalDuration ? `**Total Duration**: ${context.statistics.totalDuration}ms` : ''}

## Plan Steps

${context.plan.steps
  .map(
    (step) => `- **${step.id}** (${step.action}): ${step.status}`
  )
  .join('\n')}

## Execution History

${context.executionHistory
  .map((entry) => {
    let line = `- **${entry.stepId}** (${entry.status})`;
    if (entry.duration) {
      line += ` - ${entry.duration}ms`;
    }
    if (entry.error) {
      line += ` - Error: ${entry.error}`;
    }
    if (entry.timestamp) {
      line += ` - ${new Date(entry.timestamp).toISOString()}`;
    }
    return line;
  })
  .join('\n')}

## Results

${context.createdEntities.length > 0
  ? `Created/Retrieved Entities:\n${context.createdEntities
      .map((e) => `- ${e.type}: ${e.name || e.id || 'N/A'} (${e.stepId})`)
      .join('\n')}`
  : 'No entities created or retrieved'}

${Object.keys(context.userInputs).length > 0
  ? `\n## User Inputs Provided\n${Object.entries(context.userInputs)
      .map(([stepId, inputs]) => `- **${stepId}**: ${JSON.stringify(inputs, null, 2)}`)
      .join('\n')}`
  : ''}

${Object.keys(context.retryCounts).length > 0
  ? `\n## Retry Attempts\n${Object.entries(context.retryCounts)
      .map(([stepId, count]) => `- **${stepId}**: ${count} retry(ies)`)
      .join('\n')}`
  : ''}

${context.pendingUserInputs.length > 0
  ? `\n## Pending User Inputs\n${context.pendingUserInputs
      .map((input) => `- **${input.stepId}.${input.field}**: ${input.description || 'Required'}`)
      .join('\n')}`
  : ''}

${context.task.error ? `\n## Error\n${context.task.error}` : ''}

## Statistics

- Completed Steps: ${context.statistics.completedSteps}
- Failed Steps: ${context.statistics.failedSteps}
${context.statistics.pausedSteps > 0 ? `- Paused Steps: ${context.statistics.pausedSteps}` : ''}
- Total Retries: ${context.statistics.totalRetries}
${context.statistics.averageStepDuration ? `- Average Step Duration: ${context.statistics.averageStepDuration.toFixed(2)}ms` : ''}

${context.thought
  ? `\n## Original Reasoning\n${context.thought.primaryApproach}\n\nKey Insights: ${context.thought.keyInsights.join(', ')}`
  : ''}

---

# Summary Requirements

Write a ${format} markdown summary in first person. Use the following structure:

${format === 'brief'
  ? `- Brief overview (2-3 paragraphs)
- Key outcomes
${includeRecommendations ? '- Next steps (if applicable)' : ''}`
  : format === 'detailed'
  ? `## What You Asked For
Brief summary of the request and outcome.

## What I Did
Step-by-step narrative of execution.

## Results
What was created/modified (with IDs, names, etc.).

## Timing
Duration information.

## Issues Encountered
Any errors, retries, or user input requests.

${includeInsights ? '## Insights\nPatterns, observations, and recommendations.\n' : ''}${includeRecommendations ? '## Next Steps\nWhat needs to happen next (if paused/failed) or confirmation of completion.\n' : ''}`
  : `## Executive Summary
Technical overview with status.

## Execution Details
Step-by-step technical details with timestamps, durations, and outputs.

## Technical Data
- Step outputs: ${JSON.stringify(context.stepOutputs, null, 2)}
- User inputs: ${JSON.stringify(context.userInputs, null, 2)}
- Retry counts: ${JSON.stringify(context.retryCounts, null, 2)}

${includeInsights ? '## Technical Insights\nPerformance analysis and technical observations.\n' : ''}${includeRecommendations ? '## Recommendations\nTechnical recommendations and optimizations.\n' : ''}`}

**Important**: 
- Write in first person ("I successfully completed...", "I encountered an issue...")
- Use markdown formatting with headers, lists, code blocks, emphasis
- Be conversational and helpful
- Highlight important information (IDs, names, status)
- ${includeInsights ? 'Include insights and patterns' : 'Skip insights'}
- ${includeRecommendations ? 'Include recommendations and next steps' : 'Skip recommendations'}

Generate the summary now:`;

    return prompt;
  }

  /**
   * Format summary response
   */
  private formatSummaryResponse(
    summary: string,
    context: SummaryContext,
    format: 'brief' | 'detailed' | 'technical'
  ): string {
    // Clean up the summary
    let formatted = summary.trim();

    // Ensure it starts with a header
    if (!formatted.startsWith('#')) {
      formatted = `# Task Execution Summary\n\n${formatted}`;
    }

    // Add metadata footer for technical format
    if (format === 'technical') {
      formatted += `\n\n---\n\n**Task ID**: ${context.task.id}\n**Generated**: ${new Date().toISOString()}`;
    }

    return formatted;
  }
}

// Export singleton instance
export const taskSummaryGenerator = new TaskSummaryGenerator();

