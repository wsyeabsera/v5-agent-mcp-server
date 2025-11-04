import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { callTool } from '../utils/mcpClient.js';
import { logger } from '../utils/logger.js';

// Define schema for execute_mcp_tool
const executeMcpToolSchema = z.object({
  toolName: z.string().describe('Name of the tool to execute on the remote MCP server'),
  arguments: z.record(z.any()).optional().describe('Arguments to pass to the remote tool'),
});

export const mcpClientTools = {
  execute_mcp_tool: {
    description: 'Execute a tool on the remote MCP server (running on port 3000)',
    inputSchema: zodToJsonSchema(executeMcpToolSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof executeMcpToolSchema>) => {
      try {
        const validatedArgs = executeMcpToolSchema.parse(args);
        const { toolName, arguments: toolArguments = {} } = validatedArgs;

        logger.info(`[execute_mcp_tool] Executing remote tool: ${toolName}`, {
          arguments: toolArguments,
        });

        const result = await callTool(toolName, toolArguments);

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
        logger.error('[execute_mcp_tool] Error:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error executing remote tool: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    },
  },
};

