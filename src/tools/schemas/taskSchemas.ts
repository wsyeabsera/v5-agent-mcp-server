import { z } from 'zod';

// User input schema for resume_task
export const userInputSchema = z.object({
  stepId: z.string().describe('Step ID that needs this input'),
  field: z.string().describe('Field path (supports dot notation and array indices)'),
  value: z.any().describe('Value provided by user'),
});

// Execute task input schema
export const executeTaskSchema = z.object({
  planId: z.string().describe('Plan ID to execute'),
  agentConfigId: z.string().describe('Agent config ID for AI generation'),
});

// Resume task input schema
export const resumeTaskSchema = z.object({
  taskId: z.string().describe('Task ID to resume'),
  userInputs: z
    .array(userInputSchema)
    .describe('Array of user inputs to resolve pending prompts'),
});

// Get task input schema
export const getTaskSchema = z.object({
  id: z.string().describe('Task ID'),
});

// List tasks input schema
export const listTasksSchema = z.object({
  planId: z.string().optional().describe('Filter by plan ID'),
  status: z
    .enum(['pending', 'in_progress', 'paused', 'completed', 'failed'])
    .optional()
    .describe('Filter by task status'),
  agentConfigId: z.string().optional().describe('Filter by agent config ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Summarize task input schema
export const summarizeTaskSchema = z.object({
  taskId: z.string().describe('Task ID to summarize'),
  format: z
    .enum(['brief', 'detailed', 'technical'])
    .optional()
    .default('detailed')
    .describe('Summary format: brief (2-3 paragraphs), detailed (full narrative), or technical (includes raw data)'),
  includeInsights: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include insights and patterns in the summary'),
  includeRecommendations: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include recommendations and next steps in the summary'),
});

