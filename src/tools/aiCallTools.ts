import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { AgentConfig, AvailableModel } from '../models/index.js';
import { config } from '../config.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import { logger } from '../utils/logger.js';
import { executeAiCallSchema } from './schemas/aiCallSchemas.js';

/**
 * Read streaming response from AI server
 * Parses SSE format and accumulates the full response text
 */
async function readStreamResponse(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let fullText = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
    }
    // Decode any remaining text
    if (fullText) {
      fullText += decoder.decode();
    }
  } finally {
    reader.releaseLock();
  }

  // Parse data stream format from Vercel AI SDK
  // Format is either:
  // 1. Plain text (older format)
  // 2. Data stream chunks: "0:\"text\"" (current format)
  
  const lines = fullText.split('\n');
  const textParts: string[] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // Match data stream format: "0:"text content"" or "0:"text""
    // Use non-greedy match to handle escaped quotes properly
    const match = trimmedLine.match(/^\d+:"(.+)"$/)
    if (match) {
      // Unescape but preserve JSON backslashes
      const unescaped = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')  // Unescape quotes
        .replace(/\\\\\\\\/g, '\\\\') // Preserve JSON backslashes (reduce quad backslash to double)
      textParts.push(unescaped)
    } else if (trimmedLine && !trimmedLine.startsWith('e:') && !trimmedLine.startsWith('d:')) {
      // Skip metadata lines (e: and d:), but include other non-matching lines
      // This handles plain text format or unexpected formats
      textParts.push(trimmedLine)
    }
  }

  // Return concatenated text or original if no matches found
  const result = textParts.length > 0 ? textParts.join('') : fullText.trim()
  return result
}

// ========== AI Call Tools ==========
export const aiCallTools = {
  execute_ai_call: {
    description: 'Execute an AI call using a stored agent configuration',
    inputSchema: zodToJsonSchema(executeAiCallSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof executeAiCallSchema>) => {
      try {
        const validatedArgs = executeAiCallSchema.parse(args);

        // Fetch agent config
        const agentConfig = await AgentConfig.findById(validatedArgs.agentConfigId);
        if (!agentConfig) {
          return createErrorResponse(`Agent config not found: ${validatedArgs.agentConfigId}`);
        }

        // Check if config is enabled
        if (!agentConfig.isEnabled) {
          return createErrorResponse(`Agent config is disabled: ${validatedArgs.agentConfigId}`);
        }

        // Fetch available model to get provider and modelId
        const availableModel = await AvailableModel.findById(agentConfig.availableModelId);
        if (!availableModel) {
          return createErrorResponse(
            `Available model not found: ${agentConfig.availableModelId}`
          );
        }

        // Extract system prompt from messages if present
        const systemPrompt = validatedArgs.messages.find(m => m.role === 'system')?.content;

        // Build request body matching base-agent format
        const requestBody: any = {
          messages: validatedArgs.messages,
          modelId: availableModel.modelId,
          provider: availableModel.provider,
          apiKey: agentConfig.apiKey,
        };

        // Add optional fields only if they have values
        if (systemPrompt) {
          requestBody.systemPrompt = systemPrompt;
        }
        if (validatedArgs.temperature !== undefined) {
          requestBody.temperature = validatedArgs.temperature;
        }
        if (validatedArgs.maxTokens !== undefined) {
          requestBody.maxTokens = validatedArgs.maxTokens;
        } else {
          requestBody.maxTokens = agentConfig.maxTokenCount;
        }
        if (validatedArgs.topP !== undefined) {
          requestBody.topP = validatedArgs.topP;
        }
        if (validatedArgs.responseFormat) {
          requestBody.responseFormat = validatedArgs.responseFormat;
        }

        logger.debug(`[execute_ai_call] Making request to AI server`, {
          agentConfigId: validatedArgs.agentConfigId,
          modelId: availableModel.modelId,
          provider: availableModel.provider,
          messageCount: validatedArgs.messages.length,
        });

        // Make POST request to AI server
        const response = await fetch(config.aiServerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          logger.error(`[execute_ai_call] AI server error`, {
            status: response.status,
            error: errorText,
          });
          return createErrorResponse(
            `AI call failed: ${response.status} - ${errorText}`
          );
        }

        // Read streaming response
        const fullText = await readStreamResponse(response);
        
        logger.debug(`[execute_ai_call] Response received`, {
          agentConfigId: validatedArgs.agentConfigId,
          responseLength: fullText.length,
        });

        // Return response as string in success response format
        return createSuccessResponse({
          response: fullText.trim(),
          agentConfigId: validatedArgs.agentConfigId,
          modelId: availableModel.modelId,
          provider: availableModel.provider,
        });
      } catch (error: any) {
        return handleToolError(error, 'executing AI call');
      }
    },
  },
};

