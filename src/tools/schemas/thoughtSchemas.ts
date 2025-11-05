import { z } from 'zod';

export const generateThoughtsSchema = z.object({
  userQuery: z.string().describe('User query or request to generate thoughts for'),
  agentConfigId: z.string().describe('Agent config ID to use for AI call'),
  availableTools: z.array(z.string()).optional().describe('List of available tool names for context'),
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string(),
      })
    )
    .optional()
    .describe('Previous conversation history for context'),
  enableToolSearch: z
    .boolean()
    .optional()
    .default(true)
    .describe('Enable automatic tool search to discover relevant tools from user query'),
});

// Thought management schemas
export const getThoughtSchema = z.object({
  id: z.string().describe('Thought ID'),
});

export const listThoughtsSchema = z.object({
  userQuery: z.string().optional().describe('Filter by user query (partial match)'),
  agentConfigId: z.string().optional().describe('Filter by agent config ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

export const removeThoughtSchema = z.object({
  id: z.string().describe('Thought ID to delete'),
});

