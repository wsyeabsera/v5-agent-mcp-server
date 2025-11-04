import { z } from 'zod';

// Common source enum
const sourceEnum = z.enum(['remote', 'local']);

// Tool schemas
export const addToolSchema = z.object({
  name: z.string().describe('Tool name'),
  description: z.string().describe('Tool description'),
  inputSchema: z.record(z.any()).describe('JSON schema for tool inputs'),
  source: sourceEnum.optional().default('remote').describe('Source of the tool'),
  operationType: z.enum(['query', 'mutation']).optional().describe('Operation type (query or mutation)'),
  entityType: z.enum(['facility', 'shipment', 'contaminant', 'contract', 'inspection', 'other']).optional().describe('Entity type'),
});

export const getToolSchema = z.object({
  name: z.string().describe('Tool name'),
});

export const listToolsSchema = z.object({
  source: sourceEnum.optional().describe('Filter by source'),
});

export const updateToolSchema = z.object({
  name: z.string().describe('Tool name'),
  description: z.string().optional().describe('Tool description'),
  inputSchema: z.record(z.any()).optional().describe('JSON schema for tool inputs'),
  source: sourceEnum.optional().describe('Source of the tool'),
  operationType: z.enum(['query', 'mutation']).optional().describe('Operation type (query or mutation)'),
  entityType: z.enum(['facility', 'shipment', 'contaminant', 'contract', 'inspection', 'other']).optional().describe('Entity type'),
});

export const removeToolSchema = z.object({
  name: z.string().describe('Tool name'),
});

export const initToolsSchema = z.object({
  force: z.boolean().optional().default(false).describe('If true, update existing tools; if false, skip duplicates'),
  source: sourceEnum.optional().default('remote').describe('Source to set for seeded tools'),
});

export const getToolForUserPromptSchema = z.object({
  userPrompt: z.string().describe('User query or request to find the best tool for'),
  topK: z.number().optional().default(3).describe('Number of top tools to return'),
});

