import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Request } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  handleToolError,
} from '../../utils/toolHelpers.js';
import {
  addRequestSchema,
  getRequestSchema,
  listRequestsSchema,
  updateRequestSchema,
  removeRequestSchema,
} from '../schemas/requestSchemas.js';

// ========== Request Management Tools ==========
export const requestTools = {
  add_request: {
    description: 'Add a new request to the database',
    inputSchema: zodToJsonSchema(addRequestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addRequestSchema>) => {
      try {
        const validatedArgs = addRequestSchema.parse(args);
        return createHandler(Request, validatedArgs, 'adding request');
      } catch (error: any) {
        return handleToolError(error, 'adding request');
      }
    },
  },

  get_request: {
    description: 'Get a request by ID',
    inputSchema: zodToJsonSchema(getRequestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getRequestSchema>) => {
      const validatedArgs = getRequestSchema.parse(args);
      return getHandler(Request, { _id: validatedArgs.id }, validatedArgs.id, 'Request');
    },
  },

  list_requests: {
    description: 'List all requests with optional filters',
    inputSchema: zodToJsonSchema(listRequestsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listRequestsSchema>) => {
      const validatedArgs = listRequestsSchema.parse(args);
      const filter: {
        categories?: { $in: string[] };
        tags?: { $in: string[] };
        version?: string;
      } = {};
      
      if (validatedArgs.categories && validatedArgs.categories.length > 0) {
        filter.categories = { $in: validatedArgs.categories };
      }
      if (validatedArgs.tags && validatedArgs.tags.length > 0) {
        filter.tags = { $in: validatedArgs.tags };
      }
      if (validatedArgs.version) {
        filter.version = validatedArgs.version;
      }
      
      return listHandler(Request, filter, 'listing requests');
    },
  },

  update_request: {
    description: 'Update a request',
    inputSchema: zodToJsonSchema(updateRequestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updateRequestSchema>) => {
      try {
        const validatedArgs = updateRequestSchema.parse(args);
        const { id, ...updateData } = validatedArgs;
        return updateHandler(Request, { _id: id }, updateData, id, 'Request');
      } catch (error: any) {
        return handleToolError(error, 'updating request');
      }
    },
  },

  remove_request: {
    description: 'Remove a request from database',
    inputSchema: zodToJsonSchema(removeRequestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeRequestSchema>) => {
      const validatedArgs = removeRequestSchema.parse(args);
      return removeHandler(Request, { _id: validatedArgs.id }, validatedArgs.id, 'Request', 'Request');
    },
  },
};

