import { z } from 'zod';

export const extractLocalPromptSchema = z.object({
  name: z.string().describe('Prompt name to retrieve from local database'),
  arguments: z.record(z.any()).optional().describe('Arguments to pass to the prompt for resolution'),
});

