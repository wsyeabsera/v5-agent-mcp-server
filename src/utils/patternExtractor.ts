import { IPlan } from '../models/Plan.js';
import { ITask } from '../models/Task.js';
import { logger } from './logger.js';

/**
 * Extract query pattern from a user query
 * Converts "Create a shipment for facility HAN" → "create_*_for_facility_*"
 */
export function extractQueryPattern(query: string): string {
  // Replace specific values with wildcards
  let pattern = query
    // Replace facility codes (2-3 uppercase letters)
    .replace(/\b[A-Z]{2,3}\b/g, '*')
    // Replace IDs (MongoDB ObjectIds or UUIDs)
    .replace(/\b[0-9a-fA-F]{24}\b/g, '*')
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '*')
    // Replace numbers
    .replace(/\b\d+\b/g, '*')
    // Replace emails
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, '*')
    // Replace URLs
    .replace(/https?:\/\/[^\s]+/g, '*')
    // Replace license plates (common patterns)
    .replace(/\b[A-Z0-9]{6,8}\b/g, '*')
    .toLowerCase()
    // Replace multiple spaces with single space
    .replace(/\s+/g, ' ')
    .trim()
    // Replace spaces with underscores
    .replace(/\s+/g, '_');

  return pattern;
}

/**
 * Extract plan pattern from a plan
 * Returns step sequence: ["list_facilities", "create_shipment"]
 */
export function extractPlanPattern(plan: IPlan): string[] {
  return plan.steps
    .sort((a, b) => a.order - b.order)
    .map(step => step.action);
}

/**
 * Extract goal pattern from a goal string
 * Similar to query pattern extraction
 */
export function extractGoalPattern(goal: string): string {
  return extractQueryPattern(goal);
}

/**
 * Calculate success metrics from a task
 */
export function calculateSuccessMetrics(task: ITask): {
  executionTime: number;
  stepsCompleted: number;
  retries: number;
  userInputsRequired: number;
} {
  const completedSteps = task.executionHistory.filter(
    e => e.status === 'completed'
  ).length;
  
  const totalRetries = Array.from(task.retryCount.values()).reduce(
    (sum, count) => sum + count,
    0
  );

  const userInputsRequired = task.pendingUserInputs.length;

  // Calculate execution time from history
  let executionTime = 0;
  if (task.executionHistory.length > 0) {
    const firstStep = task.executionHistory[0];
    const lastStep = task.executionHistory[task.executionHistory.length - 1];
    if (firstStep.timestamp && lastStep.timestamp) {
      executionTime = new Date(lastStep.timestamp).getTime() - 
                     new Date(firstStep.timestamp).getTime();
    }
  }

  // If no history, use duration from individual steps
  if (executionTime === 0) {
    executionTime = task.executionHistory.reduce(
      (sum, entry) => sum + (entry.duration || 0),
      0
    );
  }

  return {
    executionTime: Math.max(0, executionTime),
    stepsCompleted: completedSteps,
    retries: totalRetries,
    userInputsRequired,
  };
}

/**
 * Generate a unique pattern ID from goal pattern and step sequence
 */
export function generatePatternId(
  goalPattern: string,
  stepSequence: string[]
): string {
  const stepHash = stepSequence.join('→');
  const combined = `${goalPattern}:${stepHash}`;
  
  // Create a simple hash (not cryptographically secure, but good enough for IDs)
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return `pattern_${Math.abs(hash).toString(36)}`;
}

/**
 * Calculate success rate from plan pattern usage
 */
export function calculateSuccessRate(
  successfulUsages: number,
  totalUsages: number
): number {
  if (totalUsages === 0) return 0;
  return successfulUsages / totalUsages;
}

/**
 * Extract common issues from failed tasks
 */
export function extractCommonIssues(
  tasks: Array<{ taskId: string; error?: string; executionHistory: Array<{ error?: string }> }>
): string[] {
  const issues: Map<string, number> = new Map();

  for (const task of tasks) {
    // Check task-level error
    if (task.error) {
      const errorKey = task.error.substring(0, 100); // Truncate long errors
      issues.set(errorKey, (issues.get(errorKey) || 0) + 1);
    }

    // Check step-level errors
    for (const entry of task.executionHistory) {
      if (entry.error) {
        const errorKey = entry.error.substring(0, 100);
        issues.set(errorKey, (issues.get(errorKey) || 0) + 1);
      }
    }
  }

  // Sort by frequency and return top issues
  return Array.from(issues.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue]) => issue);
}

/**
 * Extract error pattern from a failure
 */
export function extractErrorPattern(error: string): string {
  // Normalize error messages to patterns
  let pattern = error
    // Remove specific IDs and values
    .replace(/\b[0-9a-fA-F]{24}\b/g, '*') // MongoDB ObjectIds
    .replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '*') // UUIDs
    .replace(/\b\d+\b/g, '*') // Numbers
    .replace(/"[^"]*"/g, '"*"') // String values in quotes
    .replace(/'[^']*'/g, "'*'") // String values in single quotes
    .toLowerCase()
    .trim();

  return pattern;
}

/**
 * Calculate reliability score for a pattern (consistency measure)
 */
export function calculateReliability(
  successCount: number,
  totalCount: number,
  variance: number // Variance in execution times or success rates
): number {
  if (totalCount === 0) return 0;

  // Base reliability from success rate
  const baseReliability = successCount / totalCount;

  // Adjust for variance (lower variance = higher reliability)
  // Normalize variance to 0-1 range (assuming max variance of 1.0)
  const variancePenalty = Math.min(variance, 1.0);

  // Reliability = base * (1 - variance_penalty * 0.3)
  // This means perfect consistency (variance=0) gives full reliability
  // High variance reduces reliability by up to 30%
  const reliability = baseReliability * (1 - variancePenalty * 0.3);

  return Math.max(0, Math.min(1, reliability));
}

/**
 * Extract execution context from task and plan
 */
export function extractContext(task: any, plan: any): string {
  const contexts: string[] = [];

  // Extract context from goal
  if (plan.goal) {
    const goalLower = plan.goal.toLowerCase();
    if (goalLower.includes('facility')) contexts.push('facility_management');
    if (goalLower.includes('shipment')) contexts.push('shipment_creation');
    if (goalLower.includes('contaminant')) contexts.push('contaminant_detection');
    if (goalLower.includes('inspection')) contexts.push('inspection');
    if (goalLower.includes('contract')) contexts.push('contract_management');
  }

  // Extract context from steps
  const stepActions = plan.steps.map((s: any) => s.action);
  if (stepActions.includes('create_facility') || stepActions.includes('list_facilities')) {
    contexts.push('facility_operations');
  }
  if (stepActions.includes('create_shipment')) {
    contexts.push('shipment_operations');
  }

  // Extract context from tool usage
  const toolsUsed = new Set(stepActions);
  if (toolsUsed.size === 1) {
    contexts.push('single_tool_operation');
  } else if (toolsUsed.size > 3) {
    contexts.push('complex_workflow');
  }

  return contexts.join('_') || 'general';
}

