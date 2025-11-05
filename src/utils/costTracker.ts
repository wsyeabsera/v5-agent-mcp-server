import { CostTracking, Task, Plan } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Cost Tracker - Track token usage and API costs
 */

// Cost per token (approximate, should be configurable)
const DEFAULT_COST_PER_1K_INPUT_TOKENS = 0.001; // $0.001 per 1K input tokens
const DEFAULT_COST_PER_1K_OUTPUT_TOKENS = 0.002; // $0.002 per 1K output tokens
const DEFAULT_COST_PER_API_CALL = 0.0001; // $0.0001 per API call

/**
 * Track cost for a task
 */
export async function trackTaskCost(
  taskId: string,
  planId: string,
  agentConfigId: string,
  tokenUsage?: {
    input?: number;
    output?: number;
    total?: number;
  },
  apiCalls?: number
): Promise<void> {
  try {
    const task = await Task.findById(taskId);
    if (!task) {
      logger.warn(`[CostTracker] Task not found: ${taskId}`);
      return;
    }

    // Calculate token usage if not provided
    let inputTokens = tokenUsage?.input || 0;
    let outputTokens = tokenUsage?.output || 0;
    let totalTokens = tokenUsage?.total || (inputTokens + outputTokens);

    // Estimate from execution history if not provided
    if (totalTokens === 0 && task.executionHistory.length > 0) {
      // Rough estimate: 100 tokens per step (conservative estimate)
      totalTokens = task.executionHistory.length * 100;
      inputTokens = Math.floor(totalTokens * 0.7);
      outputTokens = Math.floor(totalTokens * 0.3);
    }

    // Calculate API calls if not provided
    const estimatedApiCalls = apiCalls || task.executionHistory.length;

    // Calculate estimated cost
    const inputCost = (inputTokens / 1000) * DEFAULT_COST_PER_1K_INPUT_TOKENS;
    const outputCost = (outputTokens / 1000) * DEFAULT_COST_PER_1K_OUTPUT_TOKENS;
    const apiCallCost = estimatedApiCalls * DEFAULT_COST_PER_API_CALL;
    const estimatedCost = inputCost + outputCost + apiCallCost;

    // Store cost tracking
    await CostTracking.findOneAndUpdate(
      { taskId },
      {
        taskId,
        planId,
        agentConfigId,
        tokenUsage: {
          input: inputTokens,
          output: outputTokens,
          total: totalTokens,
        },
        apiCalls: estimatedApiCalls,
        estimatedCost,
        timestamp: new Date(),
      },
      { upsert: true }
    );

    logger.debug(`[CostTracker] Tracked cost for task ${taskId}: ${estimatedCost.toFixed(4)} USD`);
  } catch (error: any) {
    logger.error(`[CostTracker] Error tracking cost for task ${taskId}:`, error);
  }
}

/**
 * Get cost tracking for a task
 */
export async function getTaskCost(taskId: string): Promise<any | null> {
  try {
    return await CostTracking.findOne({ taskId }).lean();
  } catch (error: any) {
    logger.error(`[CostTracker] Error getting cost for task ${taskId}:`, error);
    return null;
  }
}

/**
 * Get cost summary for a plan
 */
export async function getPlanCostSummary(planId: string): Promise<{
  totalCost: number;
  totalTasks: number;
  avgCostPerTask: number;
  totalTokens: number;
  totalApiCalls: number;
}> {
  try {
    const costs = await CostTracking.find({ planId }).lean();

    const totalCost = costs.reduce((sum, cost) => sum + (cost.estimatedCost || 0), 0);
    const totalTokens = costs.reduce((sum, cost) => sum + (cost.tokenUsage?.total || 0), 0);
    const totalApiCalls = costs.reduce((sum, cost) => sum + (cost.apiCalls || 0), 0);
    const totalTasks = costs.length;
    const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;

    return {
      totalCost,
      totalTasks,
      avgCostPerTask,
      totalTokens,
      totalApiCalls,
    };
  } catch (error: any) {
    logger.error(`[CostTracker] Error getting plan cost summary:`, error);
    return {
      totalCost: 0,
      totalTasks: 0,
      avgCostPerTask: 0,
      totalTokens: 0,
      totalApiCalls: 0,
    };
  }
}

/**
 * Get cost summary for an agent config
 */
export async function getAgentConfigCostSummary(
  agentConfigId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalCost: number;
  totalTasks: number;
  avgCostPerTask: number;
  totalTokens: number;
  totalApiCalls: number;
  period: { start: Date | null; end: Date | null };
}> {
  try {
    const query: any = { agentConfigId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = startDate;
      if (endDate) query.timestamp.$lte = endDate;
    }

    const costs = await CostTracking.find(query).lean();

    const totalCost = costs.reduce((sum, cost) => sum + (cost.estimatedCost || 0), 0);
    const totalTokens = costs.reduce((sum, cost) => sum + (cost.tokenUsage?.total || 0), 0);
    const totalApiCalls = costs.reduce((sum, cost) => sum + (cost.apiCalls || 0), 0);
    const totalTasks = costs.length;
    const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;

    return {
      totalCost,
      totalTasks,
      avgCostPerTask,
      totalTokens,
      totalApiCalls,
      period: {
        start: startDate || null,
        end: endDate || null,
      },
    };
  } catch (error: any) {
    logger.error(`[CostTracker] Error getting agent config cost summary:`, error);
    return {
      totalCost: 0,
      totalTasks: 0,
      avgCostPerTask: 0,
      totalTokens: 0,
      totalApiCalls: 0,
      period: { start: null, end: null },
    };
  }
}

