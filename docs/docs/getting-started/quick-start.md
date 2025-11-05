# Quick Start

Get up and running with Agents MCP Server in minutes.

## Prerequisites

- Server installed and running (see [Installation](./installation.md))
- MongoDB connected
- Basic understanding of JSON-RPC 2.0 protocol

## Your First Request

The server uses JSON-RPC 2.0 protocol. Here's a simple example using `curl`:

### 1. Initialize the Connection

```bash
curl -X POST http://localhost:3000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "initialize",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "agents-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {},
      "sampling": {}
    }
  }
}
```

### 2. List Available Tools

```bash
curl -X POST http://localhost:3000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools/list",
    "params": {}
  }'
```

This returns a list of all available tools with their schemas.

### 3. Execute a Tool

Let's initialize tools from a remote MCP server:

```bash
curl -X POST http://localhost:3000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "3",
    "method": "tools/call",
    "params": {
      "name": "init_tools",
      "arguments": {
        "source": "remote"
      }
    }
  }'
```

## Using JavaScript/TypeScript

Here's a simple client example:

```javascript
async function callMcpServer(method, params = {}) {
  const response = await fetch('http://localhost:3000/sse', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.random().toString(36),
      method,
      params,
    }),
  });

  return response.json();
}

// Initialize
const initResult = await callMcpServer('initialize');
console.log('Initialized:', initResult);

// List tools
const toolsResult = await callMcpServer('tools/list');
console.log('Available tools:', toolsResult.result.tools.length);

// Execute a tool
const toolResult = await callMcpServer('tools/call', {
  name: 'list_tools',
  arguments: {},
});
console.log('Tools:', toolResult);
```

## Common Tasks

### Initialize Remote Tools

```javascript
await callMcpServer('tools/call', {
  name: 'init_tools',
  arguments: {
    source: 'remote',
    force: false
  }
});
```

### Create an Agent Configuration

```javascript
await callMcpServer('tools/call', {
  name: 'add_agent_config',
  arguments: {
    availableModelId: 'model-id',
    apiKey: 'your-api-key',
    maxTokenCount: 4000,
    isEnabled: true
  }
});
```

### Generate a Thought

```javascript
const thought = await callMcpServer('tools/call', {
  name: 'generate_thoughts',
  arguments: {
    userQuery: 'Create a plan to manage facility inspections',
    agentConfigId: 'your-agent-config-id'
  }
});
```

## Next Steps

- Learn about [Configuration](./configuration.md) for advanced setup
- Explore [Features](../features/overview.md) to understand capabilities
- Check [API Reference](../api-reference/protocol.md) for detailed API documentation
- Read [Guides](../guides/task-executor.md) for common workflows

