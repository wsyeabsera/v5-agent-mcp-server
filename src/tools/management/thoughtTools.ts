import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Thought } from '../../models/index.js';
import {
  getHandler,
  listHandler,
  removeHandler,
} from '../../utils/toolHelpers.js';
import {
  getThoughtSchema,
  listThoughtsSchema,
  removeThoughtSchema,
} from '../schemas/thoughtSchemas.js';

// ========== Thought Management Tools ==========
export const thoughtManagementTools = {
  get_thought: {
    description: 'Get a thought by ID',
    inputSchema: zodToJsonSchema(getThoughtSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getThoughtSchema>) => {
      const validatedArgs = getThoughtSchema.parse(args);
      return getHandler(Thought, { _id: validatedArgs.id }, validatedArgs.id, 'Thought');
    },
  },

  list_thoughts: {
    description: 'List thoughts with optional filters',
    inputSchema: zodToJsonSchema(listThoughtsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listThoughtsSchema>) => {
      const validatedArgs = listThoughtsSchema.parse(args);
      const { userQuery, agentConfigId, startDate, endDate, limit, skip } = validatedArgs;

      // Build filter object
      const filter: any = {};

      if (userQuery) {
        filter.userQuery = { $regex: userQuery, $options: 'i' }; // Case-insensitive partial match
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
        const thoughts = await Thought.find(filter)
          .sort({ createdAt: -1 }) // Most recent first
          .limit(limit || 50)
          .skip(skip || 0)
          .lean();

        const total = await Thought.countDocuments(filter);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                thoughts,
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
              text: `Error listing thoughts: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  },

  remove_thought: {
    description: 'Delete a thought by ID',
    inputSchema: zodToJsonSchema(removeThoughtSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeThoughtSchema>) => {
      const validatedArgs = removeThoughtSchema.parse(args);
      return removeHandler(Thought, { _id: validatedArgs.id }, validatedArgs.id, 'Thought', 'Thought');
    },
  },
};

