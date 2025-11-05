import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { listResources, readResource } from '../utils/mcpClient.js';
import { logger } from '../utils/logger.js';
import {
  listMcpResourcesSchema,
  readMcpResourceSchema,
} from './schemas/mcpResourceSchemas.js';

// ========== MCP Resource Tools ==========
export const mcpResourceTools = {
  list_mcp_resources: {
    description: 'List all resources from the remote MCP server',
    inputSchema: zodToJsonSchema(listMcpResourcesSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listMcpResourcesSchema>) => {
      try {
        const validatedArgs = listMcpResourcesSchema.parse(args);

        logger.info('[list_mcp_resources] Listing resources from remote MCP server');

        const resources = await listResources();

        // Return the result in the MCP tool format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resources, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.error('[list_mcp_resources] Error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing resources from remote MCP server: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  },

  read_mcp_resource: {
    description: 'Read/fetch a specific resource by URI from the remote MCP server',
    inputSchema: zodToJsonSchema(readMcpResourceSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof readMcpResourceSchema>) => {
      try {
        const validatedArgs = readMcpResourceSchema.parse(args);
        const { uri } = validatedArgs;

        logger.info(`[read_mcp_resource] Reading resource: ${uri}`);

        const result = await readResource(uri);

        // Return the result in the MCP tool format
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error: any) {
        logger.error('[read_mcp_resource] Error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error reading resource from remote MCP server: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  },
};

