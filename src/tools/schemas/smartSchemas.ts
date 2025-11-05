import { z } from 'zod';

// Predict plan quality input schema
export const predictPlanQualitySchema = z.object({
  planId: z.string().describe('Plan ID to predict quality for'),
});

// Get tool recommendations input schema
export const getToolRecommendationsSchema = z.object({
  requiredAction: z.string().describe('Action that needs to be performed'),
  context: z.string().optional().describe('Execution context'),
  planId: z.string().optional().describe('Optional plan ID for context'),
});

// Refine plan input schema
export const refinePlanSchema = z.object({
  planId: z.string().describe('Plan ID to refine'),
  failureReason: z.string().optional().describe('Optional failure reason for better refinement'),
});

// Track cost input schema
export const trackCostSchema = z.object({
  taskId: z.string().describe('Task ID to track cost for'),
});

// Optimize cost input schema
export const optimizeCostSchema = z.object({
  planId: z.string().describe('Plan ID to optimize cost for'),
});

// List cost trackings input schema
export const listCostTrackingsSchema = z.object({
  taskId: z.string().optional().describe('Filter by task ID'),
  planId: z.string().optional().describe('Filter by plan ID'),
  agentConfigId: z.string().optional().describe('Filter by agent config ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Get cost tracking input schema
export const getCostTrackingSchema = z.object({
  id: z.string().optional().describe('Cost tracking ID (MongoDB _id)'),
  taskId: z.string().optional().describe('Task ID (alternative to id)'),
}).refine((data) => data.id || data.taskId, {
  message: 'Either id or taskId must be provided',
});

// List plan quality predictions input schema
export const listPlanQualityPredictionsSchema = z.object({
  planId: z.string().optional().describe('Filter by plan ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// List tool recommendations input schema
export const listToolRecommendationsSchema = z.object({
  requiredAction: z.string().optional().describe('Filter by required action'),
  context: z.string().optional().describe('Filter by context'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

