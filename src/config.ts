import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agents-mcp-server',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  remoteMcpServerUrl: process.env.REMOTE_MCP_SERVER_URL || 'http://localhost:3000/sse',
};

