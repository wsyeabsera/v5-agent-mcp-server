import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Prompt } from '../models/index.js';
import { logger } from '../utils/logger.js';
import { extractLocalPromptSchema } from './schemas/localPromptSchemas.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  resolvePromptTemplate,
  validatePromptArguments,
} from '../utils/promptResolver.js';

// ========== Local Prompt Tools ==========
export const localPromptTools = {
  extract_local_prompt: {
    description: 'Extract and resolve a prompt from the local database with optional arguments',
    inputSchema: zodToJsonSchema(extractLocalPromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof extractLocalPromptSchema>) => {
      try {
        const validatedArgs = extractLocalPromptSchema.parse(args);
        const { name, arguments: promptArguments = {} } = validatedArgs;

        logger.info(`[extract_local_prompt] Extracting prompt: ${name}`, {
          arguments: promptArguments,
        });

        // Fetch prompt from local database
        const prompt = await Prompt.findOne({ name });
        if (!prompt) {
          return createErrorResponse(`Prompt not found: ${name}`);
        }

        // Validate required arguments
        if (prompt.arguments && prompt.arguments.length > 0) {
          const validation = validatePromptArguments(prompt.arguments, promptArguments);
          if (!validation.valid) {
            return createErrorResponse(
              `Missing required arguments: ${validation.missing.join(', ')}`
            );
          }
        }

        // Resolve the prompt template (use description as template)
        const template = prompt.description || '';
        const resolvedText = resolvePromptTemplate(template, promptArguments);

        return createSuccessResponse({
          promptName: name,
          resolvedText,
          arguments: promptArguments,
          promptMetadata: {
            description: prompt.description,
            source: prompt.source,
          },
        });
      } catch (error: any) {
        logger.error('[extract_local_prompt] Error:', error);
        return handleToolError(error, 'extracting local prompt');
      }
    },
  },
};

