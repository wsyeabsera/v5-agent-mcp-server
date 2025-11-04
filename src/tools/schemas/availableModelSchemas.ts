import { z } from 'zod';

// Available Model schemas
export const addAvailableModelSchema = z.object({
  provider: z.string().describe('Provider name'),
  modelName: z.string().describe('Model name'),
  modelId: z.string().describe('Model ID'),
});

export const getAvailableModelSchema = z.object({
  id: z.string().describe('Available model ID'),
});

export const listAvailableModelsSchema = z.object({
  provider: z.string().optional().describe('Filter by provider'),
});

export const updateAvailableModelSchema = z.object({
  id: z.string().describe('Available model ID'),
  provider: z.string().optional().describe('Provider name'),
  modelName: z.string().optional().describe('Model name'),
  modelId: z.string().optional().describe('Model ID'),
});

export const removeAvailableModelSchema = z.object({
  id: z.string().describe('Available model ID'),
});

