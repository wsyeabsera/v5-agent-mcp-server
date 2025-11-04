import { z } from 'zod';

const sourceEnum = z.enum(['remote', 'local']);

// Prompt argument schema
const promptArgumentSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  required: z.boolean().optional(),
});

// Prompt schemas
export const addPromptSchema = z.object({
  name: z.string().describe('Prompt name'),
  description: z.string().describe('Prompt description'),
  arguments: z.array(promptArgumentSchema).optional().describe('Prompt arguments schema'),
  source: sourceEnum.optional().default('remote').describe('Source of the prompt'),
});

export const getPromptSchema = z.object({
  name: z.string().describe('Prompt name'),
});

export const listPromptsSchema = z.object({
  source: sourceEnum.optional().describe('Filter by source'),
});

export const updatePromptSchema = z.object({
  name: z.string().describe('Prompt name'),
  description: z.string().optional().describe('Prompt description'),
  arguments: z.array(promptArgumentSchema).optional().describe('Prompt arguments schema'),
  source: sourceEnum.optional().describe('Source of the prompt'),
});

export const removePromptSchema = z.object({
  name: z.string().describe('Prompt name'),
});

export const initPromptsSchema = z.object({
  force: z.boolean().optional().default(false).describe('If true, update existing prompts; if false, skip duplicates'),
  source: sourceEnum.optional().default('remote').describe('Source to set for seeded prompts'),
});

export const getPromptForUserPromptSchema = z.object({
  userPrompt: z.string().describe('User query or request to find the best prompt for'),
  topK: z.number().optional().default(3).describe('Number of top prompts to return'),
});

