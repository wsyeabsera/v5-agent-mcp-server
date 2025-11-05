import { z } from 'zod';

// MCP Resource schemas
export const listMcpResourcesSchema = z.object({}).describe('No parameters needed - lists all resources from remote MCP server');

export const readMcpResourceSchema = z.object({
  uri: z.string().describe('Resource URI to read from the remote MCP server'),
});

