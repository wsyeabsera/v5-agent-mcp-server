# Frequently Asked Questions

Common questions and answers about Agents MCP Server.

## General Questions

### What is Agents MCP Server?

Agents MCP Server is an intelligent Model Context Protocol server that combines AI-powered agents with persistent memory, learning capabilities, and smart features. It serves as both an MCP server and client.

### What is MCP?

MCP (Model Context Protocol) is a standardized protocol for AI assistants to interact with external tools and data sources. See [MCP Integration](../architecture/mcp-integration.md) for details.

### Do I need MongoDB?

Yes, MongoDB is required for data persistence. You can use a local MongoDB instance or MongoDB Atlas (cloud).

### Do I need Pinecone?

Pinecone is optional but recommended for semantic search capabilities. The server will work without it, but with reduced functionality.

## Installation Questions

### What Node.js version do I need?

Node.js 18+ is required. LTS version 20.x is recommended.

### How do I start the server?

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Port is already in use?

Change the `PORT` environment variable in `.env` or stop the process using the port.

## Configuration Questions

### Where do I put API keys?

Add them to your `.env` file:
```env
OPENAI_API_KEY=sk-your-key
ANTHROPIC_API_KEY=sk-ant-your-key
```

### How do I connect to MongoDB Atlas?

Use the connection string format:
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
```

## Usage Questions

### How do I execute a workflow?

See [First Workflow Tutorial](../guides/first-workflow.md) for a complete walkthrough.

### How do I monitor task execution?

Use the `get_task` tool to check task status:
```javascript
const taskStatus = await callTool('get_task', {
  id: taskId
});
```

### Task is stuck in "pending" status?

- Check server logs for errors
- Verify agent configuration is enabled
- Ensure API keys are valid

## Memory & Learning Questions

### How does the memory system work?

The memory system learns from every execution, storing patterns, tool performance, and insights. See [Memory System](../intelligence/memory-system.md).

### How do I query memory?

Use the `query_memory` tool:
```javascript
const memory = await callTool('query_memory', {
  query: 'create facility inspection',
  memoryTypes: ['patterns', 'tool_memory']
});
```

## Troubleshooting

### MongoDB connection failed?

- Verify MongoDB is running
- Check connection string format
- Ensure network connectivity
- Verify credentials

### Tool execution failed?

- Check tool name spelling
- Verify parameters match schema
- Review error message in response
- Check server logs

### Pinecone errors?

- Verify API key is correct
- Check index names exist
- Ensure Pinecone service is accessible
- Note: Pinecone is optional

## Next Steps

- [Installation Guide](../getting-started/installation.md) - Setup instructions
- [Quick Start](../getting-started/quick-start.md) - Get started quickly
- [Troubleshooting](../getting-started/installation.md#troubleshooting) - Common issues

