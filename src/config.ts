import dotenv from 'dotenv';

dotenv.config();

export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agents-mcp-server',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  remoteMcpServerUrl: process.env.REMOTE_MCP_SERVER_URL || 'http://localhost:3000/sse',
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeToolsIndexName: process.env.PINECONE_TOOLS_INDEX_NAME || process.env.PINECONE_INDEX_NAME || '',
  pineconePromptsIndexName: process.env.PINECONE_PROMPTS_INDEX_NAME || '',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
};

