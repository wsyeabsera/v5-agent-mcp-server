# Configuration

Detailed configuration guide for Agents MCP Server.

## Environment Variables

All configuration is done through environment variables in a `.env` file.

### Required Variables

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server
```

### Server Configuration

```env
# Server port (default: 4000)
PORT=4000

# Environment (development | production)
NODE_ENV=development
```

### Remote MCP Server

```env
# Remote MCP server URL (for fetching tools/prompts)
REMOTE_MCP_SERVER_URL=http://localhost:3000/sse
```

### Pinecone Configuration

Pinecone is used for vector similarity search:

```env
# Pinecone API Key
PINECONE_API_KEY=your-api-key

# Index names for different use cases
PINECONE_TOOLS_INDEX_NAME=tools-index
PINECONE_PROMPTS_INDEX_NAME=prompts-index
PINECONE_TASKS_INDEX_NAME=tasks-similarity
PINECONE_PARAMETER_MEMORY_INDEX_NAME=parameter-memory-index
```

### AI Server Configuration

```env
# Ollama URL (for local AI models)
OLLAMA_URL=http://localhost:11434

# AI Server URL (for streaming AI responses)
AI_SERVER_URL=http://localhost:3002/stream
```

## MongoDB Configuration

### Local MongoDB

Standard local connection:

```env
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server
```

### MongoDB with Authentication

```env
MONGODB_URI=mongodb://username:password@localhost:27017/agents-mcp-server?authSource=admin
```

### MongoDB Atlas (Cloud)

```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agents-mcp-server?retryWrites=true&w=majority
```

### Connection Options

You can add MongoDB connection options:

```env
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?maxPoolSize=10&retryWrites=true
```

## Production Configuration

### Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use strong passwords** - For MongoDB and API keys
3. **Enable MongoDB authentication** - Even in development
4. **Use environment-specific configs** - Different configs for dev/staging/prod

### Performance Tuning

```env
# Increase MongoDB connection pool
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server?maxPoolSize=20

# Set appropriate timeouts
PORT=4000
NODE_ENV=production
```

### Monitoring

Consider adding monitoring configuration:

```env
# Optional: Add logging level
LOG_LEVEL=info

# Optional: Add metrics endpoint
METRICS_ENABLED=true
```

## Configuration in Code

Configuration is loaded from `src/config.ts`:

```typescript
export const config = {
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/agents-mcp-server',
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  remoteMcpServerUrl: process.env.REMOTE_MCP_SERVER_URL || 'http://localhost:3000/sse',
  // ... other config
};
```

## Validation

The server validates configuration on startup. Check logs for:

- ✅ MongoDB connection successful
- ✅ All required environment variables present
- ✅ Pinecone indexes accessible (if configured)

## Troubleshooting

### Configuration Not Loading

- Ensure `.env` file is in project root
- Check file permissions
- Verify variable names match exactly

### MongoDB Connection Issues

- Verify connection string format
- Check network connectivity
- Ensure MongoDB is running
- Verify credentials

### Pinecone Issues

- Verify API key is correct
- Check index names exist
- Ensure Pinecone service is accessible

## Next Steps

- Learn about [Architecture](../architecture/overview.md)
- Check [Features](../features/overview.md) for capabilities
- Review [API Reference](../api-reference/protocol.md)

