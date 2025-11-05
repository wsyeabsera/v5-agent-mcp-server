import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { getPrompt } from '../utils/mcpClient.js';
import { logger } from '../utils/logger.js';
import { extractRemotePromptSchema } from './schemas/mcpPromptSchemas.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';

// ========== MCP Prompt Tools ==========
export const mcpPromptTools = {
  extract_remote_prompt: {
    description: 'Extract and resolve a prompt from the remote MCP server with optional arguments',
    inputSchema: zodToJsonSchema(extractRemotePromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof extractRemotePromptSchema>) => {
      try {
        const validatedArgs = extractRemotePromptSchema.parse(args);
        const { name, arguments: promptArguments = {} } = validatedArgs;

        logger.info(`[extract_remote_prompt] Extracting prompt: ${name}`, {
          arguments: promptArguments,
        });

        const resolvedPrompt = await getPrompt(name, promptArguments);

        return createSuccessResponse({
          promptName: name,
          resolvedText: resolvedPrompt,
          arguments: promptArguments,
        });
      } catch (error: any) {
        logger.error('[extract_remote_prompt] Error:', error);
        return handleToolError(error, 'extracting remote prompt');
      }
    },
  },
};

