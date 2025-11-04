import { z } from 'zod';

// Message schema for AI calls
const messageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant']).describe('Message role'),
  content: z.string().describe('Message content'),
});

// Execute AI call schema
export const executeAiCallSchema = z.object({
  agentConfigId: z.string().describe('Agent config ID'),
  messages: z.array(messageSchema).min(1).describe('Array of messages for the AI call'),
  temperature: z.number().optional().describe('Temperature parameter for the model'),
  maxTokens: z.number().optional().describe('Maximum tokens in the response'),
  topP: z.number().optional().describe('Top-p parameter for the model'),
  responseFormat: z
    .object({
      type: z.literal('json_object').describe('Response format type'),
    })
    .optional()
    .describe('Response format (JSON object)'),
});

