import { Plan, Task, PlanPattern, MemoryPattern } from '../models/index.js';
import { logger } from './logger.js';
import { extractQueryPattern, extractPlanPattern } from './patternExtractor.js';
import { historyTools } from '../tools/historyTools.js';

/**
 * Plan Refiner - Automatically improve failed plans
 */

export interface RefinedPlan {
  originalPlanId: string;
  refinements: Array<{
    type: 'step_added' | 'step_removed' | 'step_modified' | 'parameter_fixed' | 'dependency_fixed';
    description: string;
    change: any;
  }>;
  refinedSteps: any[];
  confidence: number;
  reasoning: string[];
}

/**
 * Refine a failed plan
 */
export async function refinePlan(
  planId: string,
  failureReason?: string
): Promise<RefinedPlan | null> {
  try {
    logger.debug(`[PlanRefiner] Refining plan: ${planId}`);

    const plan = await Plan.findById(planId);
    if (!plan) {
      logger.warn(`[PlanRefiner] Plan not found: ${planId}`);
      return null;
    }

    // Find the task for this plan
    const task = await Task.findOne({ planId }).sort({ createdAt: -1 });
    if (!task) {
      logger.warn(`[PlanRefiner] No task found for plan: ${planId}`);
      return null;
    }

    // 1. Analyze failure
    const failureAnalysis = analyzeFailure(task, plan, failureReason);

    // 2. Find similar successful plans
    const similarPlans = await findSimilarSuccessfulPlans(plan);

    // 3. Identify improvements
    const improvements = identifyImprovements(failureAnalysis, similarPlans, plan);

    // 4. Generate refined steps
    const refinedSteps = generateRefinedSteps(plan, improvements);

    // 5. Generate reasoning
    const reasoning = generateReasoning(improvements, similarPlans);

    // Calculate confidence
    const confidence = calculateConfidence(similarPlans, improvements);

    return {
      originalPlanId: planId,
      refinements: improvements,
      refinedSteps,
      confidence,
      reasoning,
    };
  } catch (error: any) {
    logger.error('[PlanRefiner] Error refining plan:', error);
    return null;
  }
}

/**
 * Analyze failure
 */
function analyzeFailure(task: any, plan: any, failureReason?: string): {
  failedStep?: string;
  error?: string;
  issues: string[];
} {
  const issues: string[] = [];
  let failedStep: string | undefined;
  let error: string | undefined;

  // Check task error
  if (task.error) {
    error = task.error;
    issues.push(`Task error: ${task.error.substring(0, 100)}`);
  }

  // Check execution history for failed steps
  const failedEntries = task.executionHistory.filter((e: any) => e.status === 'failed');
  if (failedEntries.length > 0) {
    failedStep = failedEntries[0].stepId;
    if (failedEntries[0].error) {
      error = failedEntries[0].error;
      issues.push(`Step ${failedStep} failed: ${failedEntries[0].error.substring(0, 100)}`);
    }
  }

    // Check retries
    const retryCountMap = task.retryCount as Map<string, number> | undefined;
    const retryCount = retryCountMap ? Array.from(retryCountMap.values()).reduce((sum: number, count: number) => sum + count, 0) : 0;
    if (retryCount > 0) {
      issues.push(`Multiple retries (${retryCount}) indicate reliability issues`);
    }

  // Check user input requirements
  if (task.pendingUserInputs.length > 0) {
    issues.push(`Plan requires user input which may not have been provided`);
  }

  // Use provided failure reason
  if (failureReason) {
    issues.push(`Failure reason: ${failureReason}`);
  }

  return { failedStep, error, issues };
}

/**
 * Find similar successful plans
 */
async function findSimilarSuccessfulPlans(plan: any): Promise<any[]> {
  try {
    const queryPattern = extractQueryPattern(plan.userQuery);
    const stepSequence = extractPlanPattern(plan);

    // Find similar patterns
    const similarPatterns = await PlanPattern.find({
      'successMetrics.successRate': { $gte: 0.7 }, // High success rate
      $or: [
        { 'pattern.goal': { $regex: queryPattern, $options: 'i' } },
        { 'pattern.query': { $regex: queryPattern, $options: 'i' } },
      ],
    })
      .sort({ 'successMetrics.successRate': -1, usageCount: -1 })
      .limit(10)
      .lean();

    // Also find similar tasks
    let similarTasksResult: any;
    try {
      similarTasksResult = await historyTools.get_similar_tasks.handler({
        query: plan.userQuery,
        status: 'completed',
        limit: 5,
        minSimilarity: 0.5,
      });
    } catch (error: any) {
      logger.warn('[PlanRefiner] Error getting similar tasks:', error.message);
      similarTasksResult = { success: false };
    }

    const similarPlans: any[] = [];

    // Add patterns
    for (const pattern of similarPatterns) {
      const patternData = pattern as any;
      similarPlans.push({
        type: 'pattern',
        goal: patternData.pattern?.goal,
        steps: patternData.pattern?.steps || [],
        successRate: patternData.successMetrics?.successRate || 0.7,
        evidence: patternData.evidence || [],
      });
    }

    // Add successful tasks
    if (similarTasksResult && similarTasksResult.success && similarTasksResult.data?.tasks) {
      for (const task of similarTasksResult.data.tasks) {
        const taskPlan = await Plan.findById(task.planId).lean();
        if (taskPlan) {
          similarPlans.push({
            type: 'task',
            planId: task.planId,
            goal: taskPlan.goal,
            steps: taskPlan.steps,
            successRate: 1.0, // Completed tasks
          });
        }
      }
    }

    return similarPlans;
  } catch (error: any) {
    logger.error('[PlanRefiner] Error finding similar plans:', error);
    return [];
  }
}

/**
 * Identify improvements
 */
function identifyImprovements(
  failureAnalysis: any,
  similarPlans: any[],
  plan: any
): Array<{
  type: 'step_added' | 'step_removed' | 'step_modified' | 'parameter_fixed' | 'dependency_fixed';
  description: string;
  change: any;
}> {
  const improvements: Array<{
    type: 'step_added' | 'step_removed' | 'step_modified' | 'parameter_fixed' | 'dependency_fixed';
    description: string;
    change: any;
  }> = [];

  // If we have similar successful plans, compare step sequences
  if (similarPlans.length > 0) {
    const bestPlan = similarPlans[0];
    const currentSteps = extractPlanPattern(plan);
    const bestSteps = bestPlan.steps || [];

    // Find missing steps
    for (const step of bestSteps) {
      if (!currentSteps.includes(step)) {
        improvements.push({
          type: 'step_added',
          description: `Add missing step: ${step} (found in successful plans)`,
          change: { step },
        });
      }
    }

    // Find extra steps that might be problematic
    for (const step of currentSteps) {
      if (!bestSteps.includes(step)) {
        improvements.push({
          type: 'step_removed',
          description: `Remove potentially problematic step: ${step} (not in successful plans)`,
          change: { step },
        });
      }
    }
  }

  // Fix parameter issues if identified
  if (failureAnalysis.error) {
    const errorLower = failureAnalysis.error.toLowerCase();
    if (errorLower.includes('parameter') || errorLower.includes('missing') || errorLower.includes('required')) {
      improvements.push({
        type: 'parameter_fixed',
        description: 'Fix parameter issues identified in error',
        change: { error: failureAnalysis.error },
      });
    }
  }

  // Fix dependency issues
  if (failureAnalysis.failedStep) {
    const failedStepObj = plan.steps.find((s: any) => s.id === failureAnalysis.failedStep);
    if (failedStepObj && failedStepObj.dependencies && failedStepObj.dependencies.length > 0) {
      improvements.push({
        type: 'dependency_fixed',
        description: `Review dependencies for step ${failureAnalysis.failedStep}`,
        change: { stepId: failureAnalysis.failedStep, dependencies: failedStepObj.dependencies },
      });
    }
  }

  return improvements;
}

/**
 * Generate refined steps
 */
function generateRefinedSteps(plan: any, improvements: any[]): any[] {
  const refinedSteps = [...plan.steps];

  // Apply improvements
  for (const improvement of improvements) {
    if (improvement.type === 'step_added') {
      // Add step (simplified - would need to determine where to insert)
      // For now, just note that step should be added
      logger.debug(`[PlanRefiner] Would add step: ${improvement.change.step}`);
    } else if (improvement.type === 'step_removed') {
      // Remove step
      const index = refinedSteps.findIndex((s: any) => s.action === improvement.change.step);
      if (index >= 0) {
        refinedSteps.splice(index, 1);
      }
    } else if (improvement.type === 'parameter_fixed') {
      // Fix parameters - would need more context to fix properly
      logger.debug(`[PlanRefiner] Would fix parameters based on error`);
    } else if (improvement.type === 'dependency_fixed') {
      // Fix dependencies
      const step = refinedSteps.find((s: any) => s.id === improvement.change.stepId);
      if (step) {
        // Review and potentially fix dependencies
        logger.debug(`[PlanRefiner] Would review dependencies for step ${improvement.change.stepId}`);
      }
    }
  }

  return refinedSteps;
}

/**
 * Generate reasoning
 */
function generateReasoning(improvements: any[], similarPlans: any[]): string[] {
  const reasoning: string[] = [];

  if (similarPlans.length > 0) {
    reasoning.push(`Found ${similarPlans.length} similar successful plan(s) to learn from`);
  }

  if (improvements.length > 0) {
    reasoning.push(`Identified ${improvements.length} improvement(s) based on failure analysis`);
  }

  const stepChanges = improvements.filter(i => i.type === 'step_added' || i.type === 'step_removed');
  if (stepChanges.length > 0) {
    reasoning.push(`Step sequence adjustments based on successful patterns`);
  }

  return reasoning;
}

/**
 * Calculate confidence
 */
function calculateConfidence(similarPlans: any[], improvements: any[]): number {
  let confidence = 0.5; // Base confidence

  // More similar plans = higher confidence
  if (similarPlans.length >= 5) {
    confidence += 0.3;
  } else if (similarPlans.length >= 2) {
    confidence += 0.2;
  } else if (similarPlans.length >= 1) {
    confidence += 0.1;
  }

  // More improvements = higher confidence (we have actionable changes)
  if (improvements.length >= 3) {
    confidence += 0.2;
  } else if (improvements.length >= 1) {
    confidence += 0.1;
  }

  return Math.min(1.0, confidence);
}

