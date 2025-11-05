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
 * List available resources from remote MCP server
 */
export async function listResources(): Promise<Array<{
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}>> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'resources/list',
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
      throw new Error(`MCP resources/list error: ${response.data.error.message}`);
    }

    return response.data.result?.resources || [];
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error('[MCP Client] Error listing resources:', axiosError.message);
      throw new Error(`Failed to list resources: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Read a resource from remote MCP server by URI
 */
export async function readResource(uri: string): Promise<JsonRpcResponse['result']> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'resources/read',
    params: {
      uri: uri,
    },
  };

  try {
    logger.info(`[MCP Client] Reading resource: ${uri}`);
    
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
      logger.error(`[MCP Client] Resource read error: ${response.data.error.message}`);
      throw new Error(`MCP resource read error: ${response.data.error.message}`);
    }

    logger.info(`[MCP Client] Successfully read resource: ${uri}`);
    return response.data.result;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error(`[MCP Client] Error reading resource ${uri}:`, axiosError.message);
      
      // Try to extract error message from response
      if (axiosError.response?.data?.error) {
        throw new Error(`Failed to read resource: ${axiosError.response.data.error.message}`);
      }
      
      throw new Error(`Failed to read resource ${uri}: ${axiosError.message}`);
    }
    throw error;
  }
}

/**
 * Get a prompt from the remote MCP server and resolve it with arguments
 */
export async function getPrompt(
  promptName: string,
  arguments_: Record<string, any> = {}
): Promise<string> {
  const request: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: generateRequestId(),
    method: 'prompts/get',
    params: {
      name: promptName,
      arguments: arguments_,
    },
  };

  try {
    logger.info(`[MCP Client] Getting prompt: ${promptName}`, { arguments: arguments_ });
    
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
      logger.error(`[MCP Client] Prompt get error: ${response.data.error.message}`);
      throw new Error(`MCP prompt get error: ${response.data.error.message}`);
    }

    // MCP prompts/get returns result with content array containing the resolved prompt
    const result = response.data.result;
    if (result?.messages && Array.isArray(result.messages) && result.messages.length > 0) {
      // Extract text from the first message
      const promptText = result.messages[0]?.content?.text || result.messages[0]?.content || '';
      logger.info(`[MCP Client] Successfully retrieved prompt: ${promptName}`);
      return typeof promptText === 'string' ? promptText : JSON.stringify(promptText);
    }

    // Fallback: if result is a string or has different structure
    if (typeof result === 'string') {
      return result;
    }

    if (result?.content) {
      return typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    }

    // If no recognizable format, return the whole result as JSON
    logger.warn(`[MCP Client] Unexpected prompt response format for ${promptName}`);
    return JSON.stringify(result);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<JsonRpcResponse>;
      logger.error(`[MCP Client] Error getting prompt ${promptName}:`, axiosError.message);
      
      // Try to extract error message from response
      if (axiosError.response?.data?.error) {
        throw new Error(`Failed to get prompt: ${axiosError.response.data.error.message}`);
      }
      
      throw new Error(`Failed to get prompt ${promptName}: ${axiosError.message}`);
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

