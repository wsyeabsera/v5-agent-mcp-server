import { z } from 'zod';

// Get similar tasks input schema
export const getSimilarTasksSchema = z.object({
  query: z.string().optional().describe('User query to match'),
  goal: z.string().optional().describe('Goal pattern to match'),
  limit: z.number().optional().default(10).describe('Max results (default: 10)'),
  status: z.enum(['completed', 'failed']).optional().describe('Filter by status'),
  minSimilarity: z.number().min(0).max(1).optional().default(0.7).describe('Min similarity score (0-1, default: 0.7)'),
});

// Get successful plans input schema
export const getSuccessfulPlansSchema = z.object({
  goal: z.string().describe('Goal to match'),
  limit: z.number().optional().default(5).describe('Max results (default: 5)'),
  minSuccessRate: z.number().min(0).max(1).optional().default(0.8).describe('Min success rate (0-1, default: 0.8)'),
});

// Get tool performance input schema
export const getToolPerformanceSchema = z.object({
  toolName: z.string().describe('Tool name'),
  context: z.string().optional().describe('Filter by context (e.g., "facility_management")'),
});

// Get agent insights input schema
export const getAgentInsightsSchema = z.object({
  agentType: z.enum(['thought', 'planner', 'executor']).describe('Agent type'),
  insightType: z.enum(['patterns', 'optimizations', 'warnings']).optional().describe('Filter by insight type'),
  limit: z.number().optional().default(10).describe('Max results'),
});

// Learn from task input schema
export const learnFromTaskSchema = z.object({
  taskId: z.string().describe('Task ID'),
  planId: z.string().describe('Plan ID'),
  status: z.enum(['completed', 'failed']).describe('Task status'),
  metrics: z.object({
    executionTime: z.number().describe('Execution time in milliseconds'),
    stepsCompleted: z.number().describe('Number of steps completed'),
    retries: z.number().describe('Number of retries'),
    userInputsRequired: z.number().describe('Number of user inputs required'),
  }).describe('Success metrics'),
  insights: z.array(z.string()).optional().describe('Key learnings from this execution'),
});

