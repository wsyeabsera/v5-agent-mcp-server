import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AvailableModel } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
} from '../../utils/toolHelpers.js';
import {
  addAvailableModelSchema,
  getAvailableModelSchema,
  listAvailableModelsSchema,
  updateAvailableModelSchema,
  removeAvailableModelSchema,
} from '../schemas/availableModelSchemas.js';

// ========== Available Model Management Tools ==========
export const availableModelTools = {
  add_available_model: {
    description: 'Add a new available model to the database',
    inputSchema: zodToJsonSchema(addAvailableModelSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addAvailableModelSchema>) => {
      const validatedArgs = addAvailableModelSchema.parse(args);
      return createHandler(AvailableModel, validatedArgs, 'adding available model');
    },
  },

  get_available_model: {
    description: 'Get an available model by ID',
    inputSchema: zodToJsonSchema(getAvailableModelSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getAvailableModelSchema>) => {
      const validatedArgs = getAvailableModelSchema.parse(args);
      return getHandler(AvailableModel, { _id: validatedArgs.id }, validatedArgs.id, 'Available model');
    },
  },

  list_available_models: {
    description: 'List all available models with optional filters',
    inputSchema: zodToJsonSchema(listAvailableModelsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listAvailableModelsSchema>) => {
      const validatedArgs = listAvailableModelsSchema.parse(args);
      const filter: { provider?: string } = {};
      if (validatedArgs.provider) {
        filter.provider = validatedArgs.provider;
      }
      return listHandler(AvailableModel, filter, 'listing available models');
    },
  },

  update_available_model: {
    description: 'Update an available model',
    inputSchema: zodToJsonSchema(updateAvailableModelSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updateAvailableModelSchema>) => {
      const validatedArgs = updateAvailableModelSchema.parse(args);
      const { id, ...updateData } = validatedArgs;
      return updateHandler(AvailableModel, { _id: id }, updateData, id, 'Available model');
    },
  },

  remove_available_model: {
    description: 'Remove an available model from database',
    inputSchema: zodToJsonSchema(removeAvailableModelSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeAvailableModelSchema>) => {
      const validatedArgs = removeAvailableModelSchema.parse(args);
      return removeHandler(AvailableModel, { _id: validatedArgs.id }, validatedArgs.id, 'Available model', 'Available model');
    },
  },
};

