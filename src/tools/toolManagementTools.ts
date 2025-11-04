import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool, Resource, Prompt } from '../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  createSourceFilter,
} from '../utils/toolHelpers.js';
import {
  addToolSchema,
  getToolSchema,
  listToolsSchema,
  updateToolSchema,
  removeToolSchema,
} from './schemas/toolSchemas.js';
import {
  addResourceSchema,
  getResourceSchema,
  listResourcesSchema,
  updateResourceSchema,
  removeResourceSchema,
} from './schemas/resourceSchemas.js';
import {
  addPromptSchema,
  getPromptSchema,
  listPromptsSchema,
  updatePromptSchema,
  removePromptSchema,
} from './schemas/promptSchemas.js';

// ========== Tool Management Tools ==========
export const toolManagementTools = {
  add_tool: {
    description: 'Add a new tool to the database',
    inputSchema: zodToJsonSchema(addToolSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addToolSchema>) => {
      const validatedArgs = addToolSchema.parse(args);
      return createHandler(Tool, validatedArgs, 'adding tool');
    },
  },

  get_tool: {
    description: 'Get a tool by name',
    inputSchema: zodToJsonSchema(getToolSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getToolSchema>) => {
      const validatedArgs = getToolSchema.parse(args);
      return getHandler(Tool, { name: validatedArgs.name }, validatedArgs.name, 'Tool');
    },
  },

  list_tools: {
    description: 'List all tools with optional filters',
    inputSchema: zodToJsonSchema(listToolsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listToolsSchema>) => {
      const validatedArgs = listToolsSchema.parse(args);
      const filter = createSourceFilter(validatedArgs.source);
      return listHandler(Tool, filter, 'listing tools');
    },
  },

  update_tool: {
    description: 'Update a tool',
    inputSchema: zodToJsonSchema(updateToolSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updateToolSchema>) => {
      const validatedArgs = updateToolSchema.parse(args);
      const { name, ...updateData } = validatedArgs;
      return updateHandler(Tool, { name }, updateData, name, 'Tool');
    },
  },

  remove_tool: {
    description: 'Remove a tool from database',
    inputSchema: zodToJsonSchema(removeToolSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeToolSchema>) => {
      const validatedArgs = removeToolSchema.parse(args);
      return removeHandler(Tool, { name: validatedArgs.name }, validatedArgs.name, 'Tool', 'Tool');
    },
  },

  // ========== Resource Management Tools ==========
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

  // ========== Prompt Management Tools ==========
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
