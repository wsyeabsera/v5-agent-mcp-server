import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  predictPlanQualitySchema,
  getToolRecommendationsSchema,
  refinePlanSchema,
  trackCostSchema,
  optimizeCostSchema,
} from './schemas/smartSchemas.js';
import {
  Plan,
  PlanQualityPrediction,
  ToolRecommendation,
  CostTracking,
} from '../models/index.js';
import { predictPlanQuality } from '../utils/planQualityPredictor.js';
import { getToolRecommendations } from '../utils/toolRecommendationEngine.js';
import { refinePlan } from '../utils/planRefiner.js';
import { getTaskCost, getPlanCostSummary } from '../utils/costTracker.js';
import { optimizePlanCost } from '../utils/costOptimizer.js';
import { extractContext } from '../utils/patternExtractor.js';
import { Task } from '../models/index.js';

// ========== Smart Feature Tools ==========
export const smartTools = {
  predict_plan_quality: {
    description:
      'Predict plan success probability before execution. Returns success probability, risk factors, and recommendations based on step analysis, tool performance, parameter validation, and historical comparison.',
    inputSchema: zodToJsonSchema(predictPlanQualitySchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof predictPlanQualitySchema>) => {
      try {
        const validatedArgs = predictPlanQualitySchema.parse(args);
        const { planId } = validatedArgs;

        logger.info(`[predict_plan_quality] Predicting quality for plan: ${planId}`);

        const plan = await Plan.findById(planId);
        if (!plan) {
          return createErrorResponse(`Plan not found: ${planId}`);
        }

        const prediction = await predictPlanQuality(plan);

        // Store prediction
        await PlanQualityPrediction.findOneAndUpdate(
          { planId },
          {
            planId,
            prediction: {
              successProbability: prediction.successProbability,
              confidence: prediction.confidence,
              riskLevel: prediction.riskLevel,
              estimatedDuration: prediction.estimatedDuration,
              estimatedCost: prediction.estimatedCost,
            },
            riskFactors: prediction.riskFactors,
            recommendations: prediction.recommendations,
            comparison: prediction.comparison,
            predictedAt: new Date(),
          },
          { upsert: true }
        );

        return createSuccessResponse({
          prediction,
          shouldExecute: prediction.successProbability >= 0.5,
          suggestions: prediction.recommendations.map(r => r.message),
          message: 'Plan quality predicted successfully',
        });
      } catch (error: any) {
        logger.error('[predict_plan_quality] Error:', error);
        return handleToolError(error, 'predicting plan quality');
      }
    },
  },

  get_tool_recommendations: {
    description:
      'Get optimized tool recommendations for an action based on learned performance, context matching, and success patterns. Returns ranked tool suggestions with confidence scores and performance data.',
    inputSchema: zodToJsonSchema(getToolRecommendationsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getToolRecommendationsSchema>) => {
      try {
        const validatedArgs = getToolRecommendationsSchema.parse(args);
        const { requiredAction, context: providedContext, planId } = validatedArgs;

        logger.info(`[get_tool_recommendations] Getting recommendations for action: ${requiredAction}`);

        // Determine context
        let context = providedContext || 'general';
        if (planId) {
          const plan = await Plan.findById(planId).lean();
          if (plan) {
            const task = await Task.findOne({ planId }).lean();
            context = extractContext(task || {}, plan);
          }
        }

        const recommendations = await getToolRecommendations(requiredAction, context, planId ? await Plan.findById(planId).lean() : undefined);

        // Store recommendation
        await ToolRecommendation.create({
          requiredAction,
          context,
          recommendations: recommendations.recommendations,
          warnings: recommendations.warnings,
          recommendedAt: new Date(),
        });

        return createSuccessResponse({
          ...recommendations,
          message: 'Tool recommendations generated successfully',
        });
      } catch (error: any) {
        logger.error('[get_tool_recommendations] Error:', error);
        return handleToolError(error, 'getting tool recommendations');
      }
    },
  },

  refine_plan: {
    description:
      'Automatically improve a failed plan by analyzing the failure, finding similar successful plans, and suggesting improvements. Returns a refined plan with modifications.',
    inputSchema: zodToJsonSchema(refinePlanSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof refinePlanSchema>) => {
      try {
        const validatedArgs = refinePlanSchema.parse(args);
        const { planId, failureReason } = validatedArgs;

        logger.info(`[refine_plan] Refining plan: ${planId}`);

        const refinedPlan = await refinePlan(planId, failureReason);

        if (!refinedPlan) {
          return createErrorResponse(`Failed to refine plan: ${planId}`);
        }

        return createSuccessResponse({
          ...refinedPlan,
          message: 'Plan refined successfully',
        });
      } catch (error: any) {
        logger.error('[refine_plan] Error:', error);
        return handleToolError(error, 'refining plan');
      }
    },
  },

  track_cost: {
    description:
      'Track token usage and API costs for a task. Returns cost tracking data including token usage, API calls, and estimated cost.',
    inputSchema: zodToJsonSchema(trackCostSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof trackCostSchema>) => {
      try {
        const validatedArgs = trackCostSchema.parse(args);
        const { taskId } = validatedArgs;

        logger.info(`[track_cost] Tracking cost for task: ${taskId}`);

        const costData = await getTaskCost(taskId);

        if (!costData) {
          return createSuccessResponse({
            taskId,
            message: 'No cost data found for this task. Cost will be tracked after task completion.',
            tokenUsage: { input: 0, output: 0, total: 0 },
            apiCalls: 0,
            estimatedCost: 0,
          });
        }

        return createSuccessResponse({
          taskId: costData.taskId,
          planId: costData.planId,
          agentConfigId: costData.agentConfigId,
          tokenUsage: costData.tokenUsage,
          apiCalls: costData.apiCalls,
          estimatedCost: costData.estimatedCost,
          timestamp: costData.timestamp,
          message: 'Cost data retrieved successfully',
        });
      } catch (error: any) {
        logger.error('[track_cost] Error:', error);
        return handleToolError(error, 'tracking cost');
      }
    },
  },

  optimize_cost: {
    description:
      'Optimize plan for cost efficiency by analyzing tool usage, suggesting alternatives, and identifying optimization opportunities. Returns optimized plan with cost savings estimate.',
    inputSchema: zodToJsonSchema(optimizeCostSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof optimizeCostSchema>) => {
      try {
        const validatedArgs = optimizeCostSchema.parse(args);
        const { planId } = validatedArgs;

        logger.info(`[optimize_cost] Optimizing cost for plan: ${planId}`);

        const optimization = await optimizePlanCost(planId);

        if (!optimization) {
          return createErrorResponse(`Failed to optimize plan: ${planId}`);
        }

        return createSuccessResponse({
          ...optimization,
          message: 'Plan cost optimized successfully',
        });
      } catch (error: any) {
        logger.error('[optimize_cost] Error:', error);
        return handleToolError(error, 'optimizing cost');
      }
    },
  },
};

