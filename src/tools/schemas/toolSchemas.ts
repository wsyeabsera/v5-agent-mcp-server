import { z } from 'zod';

// Common source enum
const sourceEnum = z.enum(['remote', 'local']);

// Tool schemas
export const addToolSchema = z.object({
  name: z.string().describe('Tool name'),
  description: z.string().describe('Tool description'),
  inputSchema: z.record(z.any()).describe('JSON schema for tool inputs'),
  source: sourceEnum.optional().default('remote').describe('Source of the tool'),
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
});

export const removeToolSchema = z.object({
  name: z.string().describe('Tool name'),
});

