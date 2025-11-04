import { z } from 'zod';

// Request schemas
export const addRequestSchema = z.object({
  query: z.string().describe("User's prompt"),
  categories: z.array(z.string()).min(1).describe('Array of categories'),
  version: z.string().describe('Version identifier'),
  tags: z.array(z.string()).min(1).describe('Array of tags'),
});

export const getRequestSchema = z.object({
  id: z.string().describe('Request ID'),
});

export const listRequestsSchema = z.object({
  categories: z.array(z.string()).optional().describe('Filter by categories'),
  tags: z.array(z.string()).optional().describe('Filter by tags'),
  version: z.string().optional().describe('Filter by version'),
});

export const updateRequestSchema = z.object({
  id: z.string().describe('Request ID'),
  query: z.string().optional().describe("User's prompt"),
  categories: z.array(z.string()).optional().describe('Array of categories'),
  version: z.string().optional().describe('Version identifier'),
  tags: z.array(z.string()).optional().describe('Array of tags'),
});

export const removeRequestSchema = z.object({
  id: z.string().describe('Request ID'),
});

