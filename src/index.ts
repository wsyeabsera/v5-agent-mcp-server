import express, { Request, Response } from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { connectDB } from './db.js';
import { config } from './config.js';
import {
  allTools,
} from './tools/index.js';
import { logger } from './utils/logger.js';
import { getToolSchemaInfo } from './utils/toolSchemas.js';

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
await connectDB(config.mongoUri);

// Simple HTTP MCP endpoint (handles JSON-RPC directly)
app.post('/sse', async (req: Request, res: Response) => {
  logger.info('[MCP] Received JSON-RPC request:', req.body);

  try {
    const { jsonrpc, id, method, params } = req.body;

    // Validate JSON-RPC format
    if (jsonrpc !== '2.0') {
      return res.json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request: jsonrpc must be "2.0"',
        },
        id: null,
      });
    }

    // Handle initialize
    if (method === 'initialize') {
      logger.info('[MCP] Handling initialize');
      return res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2024-11-05',
          serverInfo: {
            name: 'agents-mcp-server',
            version: '1.0.0',
          },
          capabilities: {
            tools: {},
            prompts: {},
            resources: {
              subscribe: false,
              listChanged: false
            },
            sampling: {}
          },
        },
        id,
      });
    }

    // Handle tools/list
    if (method === 'tools/list') {
      logger.info('[MCP] Handling tools/list');
      return res.json({
        jsonrpc: '2.0',
        result: {
          tools: Object.entries(allTools).map(([name, tool]) => ({
            name,
            description: tool.description,
            inputSchema: tool.inputSchema,
          })),
        },
        id,
      });
    }

    // Handle tools/call
    if (method === 'tools/call') {
      const toolName = params?.name;
      logger.info(`[MCP] Handling tools/call for: ${toolName}`);

      const tool = allTools[toolName as keyof typeof allTools];

      if (!tool) {
        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: `Unknown tool: ${toolName}`,
              },
            ],
            isError: true,
          },
          id,
        });
      }

      try {
        // Handler does validation internally
        const result = await tool.handler(params?.arguments || {});
        
        return res.json({
          jsonrpc: '2.0',
          result,
          id,
        });
      } catch (error: any) {
        logger.error(`[MCP] Error executing tool ${toolName}:`, error);
        return res.json({
          jsonrpc: '2.0',
          result: {
            content: [
              {
                type: 'text',
                text: `Error executing tool ${toolName}: ${error.message}`,
              },
            ],
            isError: true,
          },
          id,
        });
      }
    }

    // Handle prompts/list
    if (method === 'prompts/list') {
      logger.info('[MCP] Handling prompts/list');
      return res.json({
        jsonrpc: '2.0',
        result: {
          prompts: []
        },
        id,
      });
    }

    // Handle prompts/get
    if (method === 'prompts/get') {
      const promptName = params?.name;
      logger.info(`[MCP] Handling prompts/get for: ${promptName}`);
      
      return res.json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: `Unknown prompt: ${promptName}. Prompts are available on the remote MCP server.`
        },
        id,
      });
    }

    // Handle resources/list
    if (method === 'resources/list') {
      logger.info('[MCP] Handling resources/list');
      return res.json({
        jsonrpc: '2.0',
        result: {
          resources: []
        },
        id,
      });
    }

    // Handle resources/read
    if (method === 'resources/read') {
      const uri = params?.uri;
      logger.info(`[MCP] Handling resources/read for: ${uri}`);
      
      return res.json({
        jsonrpc: '2.0',
        error: {
          code: -32602,
          message: `Resource not found: ${uri}. Resources are available on the remote MCP server.`
        },
        id,
      });
    }

    // Handle tools/validate - New endpoint for critique agent to validate parameters
    if (method === 'tools/validate') {
      const toolName = params?.name;
      const providedParams = params?.arguments || {};
      const context = params?.context || {};
      
      logger.info(`[MCP] Handling tools/validate for: ${toolName}`);

      if (!toolName) {
        return res.json({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: 'Tool name is required',
          },
          id,
        });
      }

      const tool = allTools[toolName as keyof typeof allTools];
      if (!tool) {
        return res.json({
          jsonrpc: '2.0',
          error: {
            code: -32602,
            message: `Unknown tool: ${toolName}`,
          },
          id,
        });
      }

      try {
        const schemaInfo = getToolSchemaInfo(toolName);
        if (!schemaInfo) {
          return res.json({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: `Could not get schema for tool: ${toolName}`,
            },
            id,
          });
        }

        // Extract required parameters from JSON schema
        const requiredParams = schemaInfo.requiredParams || [];
        const missingParams: string[] = [];
        
        // Identify missing parameters
        for (const param of requiredParams) {
          if (!(param in providedParams) || 
              providedParams[param] === undefined || 
              providedParams[param] === null ||
              providedParams[param] === '') {
            missingParams.push(param);
          }
        }

        // Categorize missing parameters (simplified - would need actual Zod schema for full categorization)
        const categorization = {
          resolvable: missingParams.filter(p => 
            (p === 'facilityId' && (context.facilityCode || context.shortCode || context.facilityName)) ||
            (p === 'shipment_id' && (context.shipmentId || context.license_plate || context.contractId)) ||
            (p === 'contractId' && (context.contract_reference_id || context.contractReference))
          ),
          mustAskUser: missingParams.filter(p => 
            !['detection_time', 'entry_timestamp', 'exit_timestamp', 'facilityId', 'shipment_id', 'contractId'].includes(p)
          ),
          canInfer: missingParams.filter(p => 
            ['detection_time', 'entry_timestamp', 'exit_timestamp'].includes(p)
          ),
        };

        // Validate provided parameters by attempting to call the tool handler with validation
        let validationErrors: Array<{ param: string; error: string }> = [];
        try {
          // Try to parse/validate - this will catch type errors
          // Note: We can't actually call the handler here, but we can check the schema
          // For full validation, the tool handler would need to be called
        } catch (error: any) {
          // Validation errors would be caught here
        }

        // Calculate confidence: 0 if missing params, 100 if all valid
        const confidence = missingParams.length === 0 && validationErrors.length === 0 ? 100 : 0;

        return res.json({
          jsonrpc: '2.0',
          result: {
            toolName,
            requiredParams,
            providedParams: Object.keys(providedParams).filter(
              k => providedParams[k] !== undefined && providedParams[k] !== null && providedParams[k] !== ''
            ),
            missingParams,
            categorization,
            validation: {
              isValid: missingParams.length === 0 && validationErrors.length === 0,
              invalidParams: validationErrors,
            },
            confidence,
          },
          id,
        });
      } catch (error: any) {
        logger.error(`[MCP] Error validating tool ${toolName}:`, error);
        return res.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: `Error validating tool: ${error.message}`,
          },
          id,
        });
      }
    }

    // Unknown method
    return res.json({
      jsonrpc: '2.0',
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
      id,
    });

  } catch (error: any) {
    logger.error('[MCP] Request handling error:', error);
    return res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: 'Internal server error',
        data: error.message,
      },
      id: req.body?.id || null,
    });
  }
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint with server info
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'Agents MCP Server',
    version: '1.0.0',
    description: 'Hybrid MCP Server/Client - Exposes tools for executing remote MCP tools',
    endpoints: {
      mcp: '/sse (POST)',
      health: '/health',
    },
    tools: Object.keys(allTools).length,
    remoteServer: config.remoteMcpServerUrl,
  });
});

// Start server
app.listen(config.port, () => {
  logger.info(`MCP Server running on http://localhost:${config.port}`);
  logger.info(`MCP endpoint: http://localhost:${config.port}/sse`);
  logger.info(`Health check: http://localhost:${config.port}/health`);
  logger.info(`Total tools available: ${Object.keys(allTools).length}`);
});

