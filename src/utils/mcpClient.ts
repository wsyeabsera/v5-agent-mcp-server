import axios, { AxiosError } from 'axios';
import { config } from '../config.js';
import { logger } from './logger.js';

interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

/**
 * Initialize connection with remote MCP server
 */
export async function initialize(): Promise<JsonRpcResponse['result']> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'agents-mcp-server',
        version: '1.0.0',
      },
    },
  };

  try {
    const response = await axios.post<JsonRpcResponse>(
      config.remoteMcpServerUrl,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(`MCP initialization error: ${response.data.error.message}`);
    }

    logger.info('[MCP Client] Successfully initialized connection to remote server');
    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error('[MCP Client] Initialization error:', axiosError.message);
      throw new Error(`Failed to initialize MCP client: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * List available tools from remote MCP server
 */
export async function listTools(): Promise<Array<{
  name: string;
  description: string;
  inputSchema: any;
}>> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'tools/list',
  };

  try {
    const response = await axios.post<JsonRpcResponse>(
      config.remoteMcpServerUrl,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(`MCP tools/list error: ${response.data.error.message}`);
    }

    return response.data.result?.tools || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error('[MCP Client] Error listing tools:', axiosError.message);
      throw new Error(`Failed to list tools: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * List available prompts from remote MCP server
 */
export async function listPrompts(): Promise<Array<{
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
}>> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'prompts/list',
  };

  try {
    const response = await axios.post<JsonRpcResponse>(
      config.remoteMcpServerUrl,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.error) {
      throw new Error(`MCP prompts/list error: ${response.data.error.message}`);
    }

    return response.data.result?.prompts || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error('[MCP Client] Error listing prompts:', axiosError.message);
      throw new Error(`Failed to list prompts: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Execute a tool on the remote MCP server
 */
export async function callTool(
  toolName: string,
  arguments_: Record<string, any> = {}
): Promise<JsonRpcResponse['result']> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'tools/call',
    params: {
      name: toolName,
      arguments: arguments_,
    },
  };

  try {
    logger.info(`[MCP Client] Calling remote tool: ${toolName}`, { arguments: arguments_ });
    
    const response = await axios.post<JsonRpcResponse>(
      config.remoteMcpServerUrl,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.error) {
      logger.error(`[MCP Client] Tool execution error: ${response.data.error.message}`);
      throw new Error(`MCP tool execution error: ${response.data.error.message}`);
    }

    // Check if the result itself indicates an error
    if (response.data.result?.isError) {
      const errorText = response.data.result.content?.[0]?.text || 'Unknown error';
      logger.error(`[MCP Client] Tool returned error: ${errorText}`);
      throw new Error(`Tool execution failed: ${errorText}`);
    }

    logger.info(`[MCP Client] Successfully executed tool: ${toolName}`);
    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error(`[MCP Client] Error calling tool ${toolName}:`, axiosError.message);
      
      // Try to extract error message from response
      if (axiosError.response?.data?.error) {
        throw new Error(`Failed to call tool: ${axiosError.response.data.error.message}`);
      }
      
      throw new Error(`Failed to call tool ${toolName}: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Generate a unique request ID for JSON-RPC requests
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

