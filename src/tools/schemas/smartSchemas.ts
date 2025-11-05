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

