# Integration Guide

How to integrate Agents MCP Server with other systems and applications.

## Overview

This guide covers:
- API client integration
- Webhook integration
- Frontend integration
- Service-to-service integration

## API Client Integration

### JavaScript/TypeScript

```typescript
class AgentsMcpClient {
  constructor(private baseUrl: string) {}

  async call(method: string, params: any) {
    const response = await fetch(`${this.baseUrl}/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Math.random().toString(36),
        method,
        params
      })
    });
    return response.json();
  }

  async callTool(name: string, args: any) {
    const result = await this.call('tools/call', {
      name,
      arguments: args
    });
    return JSON.parse(result.result.content[0].text);
  }
}
```

### Python

```python
import requests
import json

class AgentsMcpClient:
    def __init__(self, base_url):
        self.base_url = base_url

    def call(self, method, params=None):
        response = requests.post(
            f"{self.base_url}/sse",
            json={
                "jsonrpc": "2.0",
                "id": str(uuid.uuid4()),
                "method": method,
                "params": params or {}
            }
        )
        return response.json()

    def call_tool(self, name, args=None):
        result = self.call("tools/call", {
            "name": name,
            "arguments": args or {}
        })
        return json.loads(result["result"]["content"][0]["text"])
```

## Frontend Integration

### React Example

```typescript
import { useState } from 'react';

function useAgentsMcp() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const callTool = async (name: string, args: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:4000/sse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Math.random().toString(36),
          method: 'tools/call',
          params: { name, arguments: args }
        })
      });
      const data = await response.json();
      return JSON.parse(data.result.content[0].text);
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { callTool, loading, error };
}
```

## Webhook Integration

### Setting Up Webhooks

```javascript
// Webhook endpoint to receive task updates
app.post('/webhook/task-update', async (req, res) => {
  const { taskId, status, stepOutputs } = req.body;
  
  // Handle task update
  console.log(`Task ${taskId} status: ${status}`);
  
  res.status(200).json({ received: true });
});
```

## Service Integration

### Microservice Pattern

```javascript
// Service A calls Agents MCP Server
async function processWorkflow(workflowData) {
  const thought = await mcpClient.callTool('generate_thoughts', {
    userQuery: workflowData.query,
    agentConfigId: workflowData.configId
  });

  const plan = await mcpClient.callTool('generate_plan', {
    thoughtId: thought._id,
    agentConfigId: workflowData.configId
  });

  return await mcpClient.callTool('execute_task', {
    planId: plan._id,
    agentConfigId: workflowData.configId
  });
}
```

## Error Handling

```javascript
try {
  const result = await callTool('execute_task', {
    planId: planId,
    agentConfigId: configId
  });
} catch (error) {
  if (error.code === -32603) {
    // Internal error
    console.error('Tool execution failed:', error.message);
  } else if (error.code === -32602) {
    // Invalid parameters
    console.error('Invalid parameters:', error.message);
  }
}
```

## Next Steps

- [API Reference](../api-reference/protocol.md) - Complete API documentation
- [Best Practices](./best-practices.md) - Integration best practices

