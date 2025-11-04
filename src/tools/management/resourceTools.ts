import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Resource } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  createSourceFilter,
} from '../../utils/toolHelpers.js';
import {
  addResourceSchema,
  getResourceSchema,
  listResourcesSchema,
  updateResourceSchema,
  removeResourceSchema,
} from '../schemas/resourceSchemas.js';

// ========== Resource Management Tools ==========
export const resourceTools = {
  add_resource: {
    description: 'Add a new resource to the database',
    inputSchema: zodToJsonSchema(addResourceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addResourceSchema>) => {
      const validatedArgs = addResourceSchema.parse(args);
      return createHandler(Resource, validatedArgs, 'adding resource');
    },
  },

  get_resource: {
    description: 'Get a resource by URI',
    inputSchema: zodToJsonSchema(getResourceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getResourceSchema>) => {
      const validatedArgs = getResourceSchema.parse(args);
      return getHandler(Resource, { uri: validatedArgs.uri }, validatedArgs.uri, 'Resource');
    },
  },

  list_resources: {
    description: 'List all resources with optional filters',
    inputSchema: zodToJsonSchema(listResourcesSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listResourcesSchema>) => {
      const validatedArgs = listResourcesSchema.parse(args);
      const filter = createSourceFilter(validatedArgs.source);
      return listHandler(Resource, filter, 'listing resources');
    },
  },

  update_resource: {
    description: 'Update a resource',
    inputSchema: zodToJsonSchema(updateResourceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updateResourceSchema>) => {
      const validatedArgs = updateResourceSchema.parse(args);
      const { uri, ...updateData } = validatedArgs;
      return updateHandler(Resource, { uri }, updateData, uri, 'Resource');
    },
  },

  remove_resource: {
    description: 'Remove a resource from database',
    inputSchema: zodToJsonSchema(removeResourceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeResourceSchema>) => {
      const validatedArgs = removeResourceSchema.parse(args);
      return removeHandler(Resource, { uri: validatedArgs.uri }, validatedArgs.uri, 'Resource', 'Resource');
    },
  },
};

