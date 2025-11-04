import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Prompt } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  createSourceFilter,
} from '../../utils/toolHelpers.js';
import {
  addPromptSchema,
  getPromptSchema,
  listPromptsSchema,
  updatePromptSchema,
  removePromptSchema,
} from '../schemas/promptSchemas.js';

// ========== Prompt Management Tools ==========
export const promptTools = {
  add_prompt: {
    description: 'Add a new prompt to the database',
    inputSchema: zodToJsonSchema(addPromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addPromptSchema>) => {
      const validatedArgs = addPromptSchema.parse(args);
      return createHandler(Prompt, validatedArgs, 'adding prompt');
    },
  },

  get_prompt: {
    description: 'Get a prompt by name',
    inputSchema: zodToJsonSchema(getPromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getPromptSchema>) => {
      const validatedArgs = getPromptSchema.parse(args);
      return getHandler(Prompt, { name: validatedArgs.name }, validatedArgs.name, 'Prompt');
    },
  },

  list_prompts: {
    description: 'List all prompts with optional filters',
    inputSchema: zodToJsonSchema(listPromptsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listPromptsSchema>) => {
      const validatedArgs = listPromptsSchema.parse(args);
      const filter = createSourceFilter(validatedArgs.source);
      return listHandler(Prompt, filter, 'listing prompts');
    },
  },

  update_prompt: {
    description: 'Update a prompt',
    inputSchema: zodToJsonSchema(updatePromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updatePromptSchema>) => {
      const validatedArgs = updatePromptSchema.parse(args);
      const { name, ...updateData } = validatedArgs;
      return updateHandler(Prompt, { name }, updateData, name, 'Prompt');
    },
  },

  remove_prompt: {
    description: 'Remove a prompt from database',
    inputSchema: zodToJsonSchema(removePromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removePromptSchema>) => {
      const validatedArgs = removePromptSchema.parse(args);
      return removeHandler(Prompt, { name: validatedArgs.name }, validatedArgs.name, 'Prompt', 'Prompt');
    },
  },
};

