import { z } from 'zod';

// Plan step schema
export const planStepSchema = z.object({
  id: z.string().describe('Unique step identifier'),
  order: z.number().describe('Step execution order (1-based)'),
  action: z.string().describe('Tool name to execute'),
  parameters: z.record(z.any()).describe('Tool parameters (can include template syntax like {{step1.output._id}})'),
  expectedOutput: z.record(z.any()).optional().describe('Expected output structure'),
  dependencies: z.array(z.string()).describe('List of step IDs this step depends on'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'skipped']).default('pending').describe('Current status of the step'),
});

// Missing data schema
export const missingDataSchema = z.object({
  step: z.string().describe('Step ID that needs this data'),
  field: z.string().describe('Field name that is missing'),
  type: z.string().describe('Expected data type'),
  description: z.string().optional().describe('Description of what data is needed'),
});

// Complete plan schema
export const planSchema = z.object({
  goal: z.string().describe('High-level goal of the plan'),
  steps: z.array(planStepSchema).describe('Ordered list of execution steps'),
  missingData: z.array(missingDataSchema).optional().describe('List of missing data that needs to be provided'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).default('pending').describe('Overall plan status'),
});

// Generate plan input schema
export const generatePlanSchema = z.object({
  thoughtId: z.string().optional().describe('ID of the thought to convert into a plan'),
  thought: z.any().optional().describe('Thought object (alternative to thoughtId)'),
  agentConfigId: z.string().describe('Agent config ID to use for AI call'),
  enableToolSearch: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable automatic tool search to discover relevant tools'),
});

// Plan management schemas
export const getPlanSchema = z.object({
  id: z.string().describe('Plan ID'),
});

export const listPlansSchema = z.object({
  thoughtId: z.string().optional().describe('Filter by thought ID'),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']).optional().describe('Filter by plan status'),
  agentConfigId: z.string().optional().describe('Filter by agent config ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

export const removePlanSchema = z.object({
  id: z.string().describe('Plan ID to delete'),
});

