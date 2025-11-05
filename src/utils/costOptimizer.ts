import { Plan, ToolPerformance } from '../models/index.js';
import { logger } from './logger.js';
import { getToolRecommendations } from './toolRecommendationEngine.js';

/**
 * Cost Optimizer - Optimize plans for cost efficiency
 */

export interface CostOptimizationResult {
  originalPlanId: string;
  optimizations: Array<{
    type: 'tool_replacement' | 'step_removal' | 'step_consolidation' | 'parameter_optimization';
    description: string;
    estimatedSavings: number; // in USD
    change: any;
  }>;
  estimatedSavings: number;
  optimizedSteps: any[];
  confidence: number;
}

/**
 * Optimize plan for cost
 */
export async function optimizePlanCost(planId: string): Promise<CostOptimizationResult | null> {
  try {
    logger.debug(`[CostOptimizer] Optimizing plan cost: ${planId}`);

    const plan = await Plan.findById(planId);
    if (!plan) {
      logger.warn(`[CostOptimizer] Plan not found: ${planId}`);
      return null;
    }

    // 1. Analyze current cost
    const currentCost = estimatePlanCost(plan);

    // 2. Find optimization opportunities
    const optimizations = await findOptimizations(plan);

    // 3. Calculate savings
    const estimatedSavings = optimizations.reduce((sum, opt) => sum + opt.estimatedSavings, 0);

    // 4. Generate optimized steps
    const optimizedSteps = generateOptimizedSteps(plan, optimizations);

    // Calculate confidence
    const confidence = calculateOptimizationConfidence(optimizations);

    return {
      originalPlanId: planId,
      optimizations,
      estimatedSavings,
      optimizedSteps,
      confidence,
    };
  } catch (error: any) {
    logger.error('[CostOptimizer] Error optimizing plan cost:', error);
    return null;
  }
}

/**
 * Estimate plan cost
 */
function estimatePlanCost(plan: any): number {
  // Rough estimate: 100 tokens per step
  const estimatedTokens = plan.steps.length * 100;
  const estimatedCost = (estimatedTokens / 1000) * 0.0015; // Average cost per 1K tokens
  return estimatedCost;
}

/**
 * Find optimization opportunities
 */
async function findOptimizations(plan: any): Promise<Array<{
  type: 'tool_replacement' | 'step_removal' | 'step_consolidation' | 'parameter_optimization';
  description: string;
  estimatedSavings: number;
  change: any;
}>> {
  const optimizations: Array<{
    type: 'tool_replacement' | 'step_removal' | 'step_consolidation' | 'parameter_optimization';
    description: string;
    estimatedSavings: number;
    change: any;
  }> = [];

  // 1. Check for expensive tools that could be replaced
  for (const step of plan.steps) {
    const toolPerf = await ToolPerformance.findOne({ toolName: step.action }).lean();
    
    if (toolPerf) {
      // Check if tool has high duration (costs more time/resources)
      const avgDuration = toolPerf.performance?.avgDuration || 0;
      if (avgDuration > 10000) {
        // Try to find cheaper alternative
        const context = 'general'; // Simplified
        const recommendations = await getToolRecommendations(step.action, context, plan);
        
        if (recommendations.recommendations.length > 0) {
          const alternative = recommendations.recommendations[0];
          if (alternative.performance.avgDuration < avgDuration * 0.7) {
            const savings = ((avgDuration - alternative.performance.avgDuration) / 1000) * 0.0001; // Rough estimate
            optimizations.push({
              type: 'tool_replacement',
              description: `Replace ${step.action} with ${alternative.toolName} (faster execution)`,
              estimatedSavings: savings,
              change: {
                originalTool: step.action,
                alternativeTool: alternative.toolName,
                stepId: step.id,
              },
            });
          }
        }
      }
    }
  }

  // 2. Check for redundant steps
  const stepActions = plan.steps.map((s: any) => s.action);
  const stepCounts = new Map<string, number>();
  stepActions.forEach((action: string) => {
    stepCounts.set(action, (stepCounts.get(action) || 0) + 1);
  });

  for (const [action, count] of stepCounts.entries()) {
    if (count > 1) {
      // Multiple uses of same tool - might be able to consolidate
      optimizations.push({
        type: 'step_consolidation',
        description: `Consolidate ${count} uses of ${action} into single step`,
        estimatedSavings: ((count - 1) * 100 / 1000) * 0.0015, // Save tokens from redundant calls
        change: {
          tool: action,
          count,
        },
      });
    }
  }

  // 3. Check for unnecessary steps (simplified - would need more analysis)
  if (plan.steps.length > 5) {
    optimizations.push({
      type: 'step_removal',
      description: 'Consider simplifying plan - many steps increase cost',
      estimatedSavings: ((plan.steps.length - 5) * 50 / 1000) * 0.0015, // Rough estimate
      change: {
        currentStepCount: plan.steps.length,
        suggestedMax: 5,
      },
    });
  }

  return optimizations;
}

/**
 * Generate optimized steps
 */
function generateOptimizedSteps(plan: any, optimizations: any[]): any[] {
  const optimizedSteps = [...plan.steps];

  // Apply optimizations (simplified - would need more sophisticated logic)
  for (const opt of optimizations) {
    if (opt.type === 'tool_replacement') {
      const step = optimizedSteps.find((s: any) => s.id === opt.change.stepId);
      if (step) {
        step.action = opt.change.alternativeTool;
        logger.debug(`[CostOptimizer] Would replace ${opt.change.originalTool} with ${opt.change.alternativeTool}`);
      }
    }
    // Other optimizations would require more complex logic
  }

  return optimizedSteps;
}

/**
 * Calculate optimization confidence
 */
function calculateOptimizationConfidence(optimizations: any[]): number {
  if (optimizations.length === 0) {
    return 0.0;
  }

  // Higher confidence with more specific optimizations
  const toolReplacements = optimizations.filter(o => o.type === 'tool_replacement').length;
  const confidence = Math.min(1.0, 0.5 + (toolReplacements * 0.2) + (optimizations.length * 0.1));

  return confidence;
}

