# Configuration

Complete guide to configuring Agents MCP Server for different environments and use cases.

## Overview

All configuration is managed through environment variables in a `.env` file located in the project root. The server loads configuration at startup and validates required settings.

## Configuration Reference

### Required Variables

These variables must be set for the server to function:

```env
# MongoDB Connection (REQUIRED)
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server

# Server Port (REQUIRED)
PORT=4000

# Environment (REQUIRED)
NODE_ENV=development
```

### Optional Variables

These variables enhance functionality but are optional:

```env
# Remote MCP Server
REMOTE_MCP_SERVER_URL=http://localhost:3000/sse

# Pinecone Configuration
PINECONE_API_KEY=your-api-key
PINECONE_TOOLS_INDEX_NAME=agents-tools-index
PINECONE_PROMPTS_INDEX_NAME=agents-prompts-index
PINECONE_TASKS_INDEX_NAME=tasks-similarity
PINECONE_PARAMETER_MEMORY_INDEX_NAME=parameter-memory-index

# AI Model API Keys
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
OLLAMA_URL=http://localhost:11434
AI_SERVER_URL=http://localhost:3002/stream
```

## Detailed Configuration

### MongoDB Configuration

#### Connection String Format

```
mongodb://[username:password@]host[:port][/database][?options]
```

#### Local MongoDB (No Authentication)

```env
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server
```

#### Local MongoDB (With Authentication)

```env
MONGODB_URI=mongodb://username:password@localhost:27017/agents-mcp-server?authSource=admin
```

#### MongoDB Atlas (Cloud)

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/agents-mcp-server?retryWrites=true&w=majority
```

#### Connection Options

Add query parameters for advanced configuration:

```env
# Connection pool settings
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?maxPoolSize=20&minPoolSize=5

# Timeout settings
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?connectTimeoutMS=30000&socketTimeoutMS=30000

# Replica set
MONGODB_URI=mongodb://host1:27017,host2:27017,host3:27017/agents-mcp-server?replicaSet=rs0

# SSL/TLS
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?ssl=true&tlsAllowInvalidCertificates=true
```

**Common Options**:
- `maxPoolSize`: Maximum number of connections (default: 10)
- `minPoolSize`: Minimum number of connections (default: 0)
- `connectTimeoutMS`: Connection timeout in milliseconds (default: 30000)
- `socketTimeoutMS`: Socket timeout in milliseconds (default: 30000)
- `retryWrites`: Enable retryable writes (default: true)
- `w`: Write concern (majority, 1, etc.)
- `authSource`: Authentication database

### Server Configuration

#### Port

```env
PORT=4000
```

**Default**: `4000`  
**Range**: 1024-65535  
**Note**: Ports below 1024 require root/admin privileges

#### Environment

```env
NODE_ENV=development
```

**Options**:
- `development`: Development mode with detailed logging
- `production`: Production mode with optimized settings
- `test`: Test environment with mock data

**Behavior**:
- `development`: Verbose logging, error details, hot reload
- `production`: Minimal logging, error sanitization, optimizations
- `test`: Test-specific configurations

### Remote MCP Server

Configure connection to remote MCP servers for fetching tools and prompts:

```env
REMOTE_MCP_SERVER_URL=http://localhost:3000/sse
```

**Format**: Full URL to the MCP server SSE endpoint  
**Protocol**: Must support JSON-RPC 2.0 over HTTP POST  
**Example**: `http://your-mcp-server.com/sse` or `https://api.example.com/mcp`

### Pinecone Configuration

Pinecone is used for vector similarity search in the memory system.

#### API Key

```env
PINECONE_API_KEY=your-pinecone-api-key
```

Get your API key from [Pinecone Console](https://app.pinecone.io/).

#### Index Names

Configure separate indexes for different use cases:

```env
# Tools semantic search
PINECONE_TOOLS_INDEX_NAME=agents-tools-index

# Prompts semantic search
PINECONE_PROMPTS_INDEX_NAME=agents-prompts-index

# Task similarity search
PINECONE_TASKS_INDEX_NAME=tasks-similarity

# Parameter memory storage
PINECONE_PARAMETER_MEMORY_INDEX_NAME=parameter-memory-index
```

**Index Specifications**:
- **Dimensions**: 1536 (for OpenAI embeddings)
- **Metric**: cosine
- **Pod Type**: s1.x1 (free tier) or p1.x1 (production)

**Auto-Creation**: The server will attempt to create indexes automatically if they don't exist.

### AI Model Configuration

Configure API keys for AI model providers:

#### OpenAI

```env
OPENAI_API_KEY=sk-your-openai-api-key
```

**Getting API Key**:
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Navigate to API Keys
3. Create new secret key
4. Copy and add to `.env`

**Supported Models**: GPT-3.5, GPT-4, GPT-4 Turbo

#### Anthropic (Claude)

```env
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key
```

**Getting API Key**:
1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Navigate to API Keys
3. Create new key
4. Copy and add to `.env`

**Supported Models**: Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

#### Ollama (Local)

```env
OLLAMA_URL=http://localhost:11434
```

**Default**: `http://localhost:11434`  
**Usage**: Local AI models, free, no API key required

**Setup**:
1. Install Ollama: [ollama.ai](https://ollama.ai/)
2. Pull a model: `ollama pull llama2`
3. Start Ollama: `ollama serve`
4. Configure URL (if different from default)

**Supported Models**: Any model supported by Ollama (Llama2, Mistral, etc.)

#### Custom AI Server

```env
AI_SERVER_URL=http://localhost:3002/stream
```

**Format**: Full URL to your custom AI server streaming endpoint  
**Protocol**: Must support streaming responses  
**Use Case**: Custom AI inference servers, proxy services

## Environment-Specific Configuration

### Development

```env
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server-dev
LOG_LEVEL=debug
```

**Characteristics**:
- Verbose logging
- Hot reload enabled
- Error details shown
- Development database

### Production

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agents-mcp-server?retryWrites=true&w=majority
LOG_LEVEL=info
```

**Characteristics**:
- Optimized performance
- Minimal logging
- Error sanitization
- Production database
- SSL/TLS enabled

### Staging

```env
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://user:pass@staging-cluster.mongodb.net/agents-mcp-server-staging
LOG_LEVEL=warn
```

**Characteristics**:
- Production-like environment
- Separate database
- Limited logging
- Testing production features

## Security Best Practices

### 1. Never Commit `.env` Files

Ensure `.env` is in `.gitignore`:

```gitignore
# Environment variables
.env
.env.local
.env.*.local
```

### 2. Use Strong Passwords

- MongoDB: Use strong, unique passwords
- API Keys: Rotate regularly
- Generate secure passwords: `openssl rand -base64 32`

### 3. Enable MongoDB Authentication

Even in development:

```env
MONGODB_URI=mongodb://username:strong-password@localhost:27017/agents-mcp-server?authSource=admin
```

### 4. Use Environment-Specific Configs

- Development: `.env.development`
- Production: `.env.production`
- Staging: `.env.staging`

Load with: `dotenv.config({ path: '.env.production' })`

### 5. Rotate API Keys Regularly

- Set up key rotation schedule
- Monitor API usage
- Revoke unused keys

### 6. Use Secrets Management

For production, consider:
- **AWS Secrets Manager**
- **HashiCorp Vault**
- **Azure Key Vault**
- **Kubernetes Secrets**

## Performance Tuning

### MongoDB Connection Pool

```env
# Increase connection pool for high traffic
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?maxPoolSize=50&minPoolSize=10
```

**Recommendations**:
- **Development**: `maxPoolSize=10`
- **Production**: `maxPoolSize=50-100`
- **High Traffic**: `maxPoolSize=100+`

### Timeouts

```env
# Increase timeouts for slow networks
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?connectTimeoutMS=60000&socketTimeoutMS=60000
```

### Index Optimization

Ensure MongoDB indexes are created for frequently queried fields:
- Tool names
- User queries
- Timestamps
- Status fields

## Monitoring Configuration

### Logging Levels

```env
LOG_LEVEL=info
```

**Options**:
- `debug`: Detailed debug information
- `info`: General information (default)
- `warn`: Warnings only
- `error`: Errors only
- `silent`: No logging

### Metrics (Future)

```env
METRICS_ENABLED=true
METRICS_PORT=9090
```

## Configuration Validation

The server validates configuration on startup:

### Startup Checks

1. **MongoDB Connection**: Tests connection to MongoDB
2. **Required Variables**: Validates all required env vars are present
3. **Pinecone Access**: Tests Pinecone API key (if configured)
4. **Port Availability**: Checks if port is available

### Validation Errors

If validation fails, the server will:
- Log detailed error messages
- Indicate which configuration is missing
- Provide suggestions for fixing

**Example**:
```
[ERROR] MongoDB connection failed: connect ECONNREFUSED
[ERROR] Missing required configuration: MONGODB_URI
[INFO] Please check your .env file and ensure MongoDB is running
```

## Configuration in Code

Configuration is loaded in `src/config.ts`:

```typescript
export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agents-mcp-server',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  remoteMcpServerUrl: process.env.REMOTE_MCP_SERVER_URL || 'http://localhost:3000/sse',
  pineconeApiKey: process.env.PINECONE_API_KEY || '',
  pineconeToolsIndexName: process.env.PINECONE_TOOLS_INDEX_NAME || '',
  pineconePromptsIndexName: process.env.PINECONE_PROMPTS_INDEX_NAME || '',
  pineconeTasksIndexName: process.env.PINECONE_TASKS_INDEX_NAME || 'tasks-similarity',
  pineconeParameterMemoryIndexName: process.env.PINECONE_PARAMETER_MEMORY_INDEX_NAME || 'parameter-memory-index',
  ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
  aiServerUrl: process.env.AI_SERVER_URL || 'http://localhost:3002/stream',
};
```

## Troubleshooting

### Configuration Not Loading

**Symptoms**: Server uses default values instead of `.env` values

**Solutions**:
1. Verify `.env` file is in project root
2. Check file permissions: `ls -la .env`
3. Ensure variable names match exactly (case-sensitive)
4. Restart server after changing `.env`

### MongoDB Connection Issues

**Solutions**:
1. Verify connection string format
2. Test connection: `mongosh "mongodb://..." `
3. Check network connectivity
4. Verify credentials and permissions

### Pinecone Issues

**Solutions**:
1. Verify API key is correct
2. Check index names exist in Pinecone dashboard
3. Ensure Pinecone service is accessible
4. Check API key permissions

### Port Conflicts

**Solutions**:
1. Find process using port: `lsof -i :4000`
2. Kill process or change port in `.env`
3. Use different port for development

## Configuration Examples

### Minimal Configuration (Development)

```env
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server
PORT=4000
NODE_ENV=development
```

### Full Configuration (Production)

```env
# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/agents-mcp-server?retryWrites=true&w=majority&maxPoolSize=50

# Server
PORT=4000
NODE_ENV=production

# Remote MCP
REMOTE_MCP_SERVER_URL=https://api.example.com/mcp/sse

# Pinecone
PINECONE_API_KEY=your-production-key
PINECONE_TOOLS_INDEX_NAME=prod-tools-index
PINECONE_PROMPTS_INDEX_NAME=prod-prompts-index
PINECONE_TASKS_INDEX_NAME=prod-tasks-index
PINECONE_PARAMETER_MEMORY_INDEX_NAME=prod-parameter-memory

# AI Models
OPENAI_API_KEY=sk-prod-key
ANTHROPIC_API_KEY=sk-ant-prod-key

# Logging
LOG_LEVEL=warn
```

### Docker Configuration

```env
MONGODB_URI=mongodb://mongo:27017/agents-mcp-server
PORT=4000
NODE_ENV=production
REMOTE_MCP_SERVER_URL=http://remote-mcp:3000/sse
```

## Next Steps

- **[First Steps](./first-steps.md)** - Complete walkthrough after configuration
- **[Architecture](../architecture/overview.md)** - Understand system design
- **[Production Deployment](../development/deployment.md)** - Production setup guide

---

**Configuration complete?** → [First Steps Guide](./first-steps.md)
