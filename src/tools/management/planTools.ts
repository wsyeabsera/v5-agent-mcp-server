import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Plan } from '../../models/index.js';
import {
  getHandler,
  removeHandler,
} from '../../utils/toolHelpers.js';
import {
  getPlanSchema,
  listPlansSchema,
  removePlanSchema,
} from '../schemas/planSchemas.js';

// ========== Plan Management Tools ==========
export const planManagementTools = {
  get_plan: {
    description: 'Get a plan by ID',
    inputSchema: zodToJsonSchema(getPlanSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getPlanSchema>) => {
      const validatedArgs = getPlanSchema.parse(args);
      return getHandler(Plan, { _id: validatedArgs.id }, validatedArgs.id, 'Plan');
    },
  },

  list_plans: {
    description: 'List plans with optional filters',
    inputSchema: zodToJsonSchema(listPlansSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listPlansSchema>) => {
      const validatedArgs = listPlansSchema.parse(args);
      const { thoughtId, status, agentConfigId, startDate, endDate, limit, skip } = validatedArgs;

      // Build filter object
      const filter: any = {};

      if (thoughtId) {
        filter.thoughtId = thoughtId;
      }

      if (status) {
        filter.status = status;
      }

      if (agentConfigId) {
        filter.agentConfigId = agentConfigId;
      }

      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) {
          filter.createdAt.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.createdAt.$lte = new Date(endDate);
        }
      }

      // Use listHandler with pagination
      try {
        const plans = await Plan.find(filter)
          .sort({ createdAt: -1 }) // Most recent first
          .limit(limit || 50)
          .skip(skip || 0)
          .lean();

        const total = await Plan.countDocuments(filter);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                plans,
                total,
                limit: limit || 50,
                skip: skip || 0,
                hasMore: (skip || 0) + (limit || 50) < total,
              }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error listing plans: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  },

  remove_plan: {
    description: 'Delete a plan by ID',
    inputSchema: zodToJsonSchema(removePlanSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removePlanSchema>) => {
      const validatedArgs = removePlanSchema.parse(args);
      return removeHandler(Plan, { _id: validatedArgs.id }, validatedArgs.id, 'Plan', 'Plan');
    },
  },
};

