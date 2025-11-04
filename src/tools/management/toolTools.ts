import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  createSourceFilter,
} from '../../utils/toolHelpers.js';
import {
  addToolSchema,
  getToolSchema,
  listToolsSchema,
  updateToolSchema,
  removeToolSchema,
} from '../schemas/toolSchemas.js';

// ========== Tool Management Tools ==========
export const toolTools = {
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
};

