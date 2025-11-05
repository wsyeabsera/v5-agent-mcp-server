import { z } from 'zod';

export const extractRemotePromptSchema = z.object({
  name: z.string().describe('Prompt name to retrieve from remote MCP server'),
  arguments: z.record(z.any()).optional().describe('Arguments to pass to the prompt for resolution'),
});

