import { z } from 'zod';

const sourceEnum = z.enum(['remote', 'local']);

// Resource schemas
export const addResourceSchema = z.object({
  uri: z.string().describe('Resource URI'),
  name: z.string().describe('Resource name'),
  description: z.string().optional().describe('Resource description'),
  mimeType: z.string().optional().describe('MIME type of resource'),
  source: sourceEnum.optional().default('remote').describe('Source of the resource'),
});

export const getResourceSchema = z.object({
  uri: z.string().describe('Resource URI'),
});

export const listResourcesSchema = z.object({
  source: sourceEnum.optional().describe('Filter by source'),
});

export const updateResourceSchema = z.object({
  uri: z.string().describe('Resource URI'),
  name: z.string().optional().describe('Resource name'),
  description: z.string().optional().describe('Resource description'),
  mimeType: z.string().optional().describe('MIME type of resource'),
  source: sourceEnum.optional().describe('Source of the resource'),
});

export const removeResourceSchema = z.object({
  uri: z.string().describe('Resource URI'),
});

