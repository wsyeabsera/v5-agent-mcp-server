import { z } from 'zod';

// Agent Config schemas
export const addAgentConfigSchema = z.object({
  availableModelId: z.string().describe('Available model ID'),
  apiKey: z.string().describe('API key'),
  maxTokenCount: z.number().describe('Maximum token count'),
  isEnabled: z.boolean().optional().default(true).describe('Whether the config is enabled'),
});

export const getAgentConfigSchema = z.object({
  id: z.string().describe('Agent config ID'),
});

export const listAgentConfigsSchema = z.object({
  isEnabled: z.boolean().optional().describe('Filter by enabled status'),
});

export const updateAgentConfigSchema = z.object({
  id: z.string().describe('Agent config ID'),
  availableModelId: z.string().optional().describe('Available model ID'),
  apiKey: z.string().optional().describe('API key'),
  maxTokenCount: z.number().optional().describe('Maximum token count'),
  isEnabled: z.boolean().optional().describe('Whether the config is enabled'),
});

export const removeAgentConfigSchema = z.object({
  id: z.string().describe('Agent config ID'),
});

