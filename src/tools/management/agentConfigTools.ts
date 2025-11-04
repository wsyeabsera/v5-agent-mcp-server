import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AgentConfig, AvailableModel } from '../../models/index.js';
import {
  createHandler,
  getHandler,
  listHandler,
  updateHandler,
  removeHandler,
  createErrorResponse,
  handleToolError,
} from '../../utils/toolHelpers.js';
import {
  addAgentConfigSchema,
  getAgentConfigSchema,
  listAgentConfigsSchema,
  updateAgentConfigSchema,
  removeAgentConfigSchema,
} from '../schemas/agentConfigSchemas.js';

// ========== Agent Config Management Tools ==========
export const agentConfigTools = {
  add_agent_config: {
    description: 'Add a new agent config to the database',
    inputSchema: zodToJsonSchema(addAgentConfigSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof addAgentConfigSchema>) => {
      try {
        const validatedArgs = addAgentConfigSchema.parse(args);
        return createHandler(AgentConfig, validatedArgs, 'adding agent config');
      } catch (error: any) {
        return handleToolError(error, 'adding agent config');
      }
    },
  },

  get_agent_config: {
    description: 'Get an agent config by ID',
    inputSchema: zodToJsonSchema(getAgentConfigSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getAgentConfigSchema>) => {
      const validatedArgs = getAgentConfigSchema.parse(args);
      return getHandler(AgentConfig, { _id: validatedArgs.id }, validatedArgs.id, 'Agent config');
    },
  },

  list_agent_configs: {
    description: 'List all agent configs with optional filters',
    inputSchema: zodToJsonSchema(listAgentConfigsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listAgentConfigsSchema>) => {
      const validatedArgs = listAgentConfigsSchema.parse(args);
      const filter: { isEnabled?: boolean } = {};
      if (validatedArgs.isEnabled !== undefined) {
        filter.isEnabled = validatedArgs.isEnabled;
      }
      return listHandler(AgentConfig, filter, 'listing agent configs');
    },
  },

  update_agent_config: {
    description: 'Update an agent config',
    inputSchema: zodToJsonSchema(updateAgentConfigSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof updateAgentConfigSchema>) => {
      try {
        const validatedArgs = updateAgentConfigSchema.parse(args);
        const { id, ...updateData } = validatedArgs;
        
        // Validate that the availableModelId exists if it's being updated
        if (updateData.availableModelId) {
          const availableModel = await AvailableModel.findById(updateData.availableModelId);
          if (!availableModel) {
            return createErrorResponse(`Available model not found: ${updateData.availableModelId}`);
          }
        }
        
        return updateHandler(AgentConfig, { _id: id }, updateData, id, 'Agent config');
      } catch (error: any) {
        return handleToolError(error, 'updating agent config');
      }
    },
  },

  remove_agent_config: {
    description: 'Remove an agent config from database',
    inputSchema: zodToJsonSchema(removeAgentConfigSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof removeAgentConfigSchema>) => {
      const validatedArgs = removeAgentConfigSchema.parse(args);
      return removeHandler(AgentConfig, { _id: validatedArgs.id }, validatedArgs.id, 'Agent config', 'Agent config');
    },
  },
};

