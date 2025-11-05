# Quick Start

Get up and running with Agents MCP Server in under 10 minutes. This guide will walk you through your first successful operations.

## Prerequisites

- Server installed and running (see [Installation](./installation.md))
- MongoDB connected and healthy
- Basic understanding of JSON-RPC 2.0 protocol

**Verify server is running**:
```bash
curl http://localhost:4000/health
# Should return: {"status":"healthy","mongodb":"connected",...}
```

## Quick Start Steps

### Step 1: Initialize the Connection

First, establish a connection with the MCP server:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "initialize",
    "params": {}
  }'
```

**Expected Response**:
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

**What this means**: The server is ready to accept tool calls and has negotiated protocol capabilities.

### Step 2: List Available Tools

Discover what tools are available:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools/list",
    "params": {}
  }'
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "tools": [
      {
        "name": "add_tool",
        "description": "Add a new tool to the database",
        "inputSchema": { ... }
      },
      // ... more tools
    ]
  }
}
```

**Tip**: The response will show all available tools. You can count them to verify the server is fully operational.

### Step 3: Execute Your First Tool

Let's execute a simple tool to list tools:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "3",
    "method": "tools/call",
    "params": {
      "name": "list_tools",
      "arguments": {}
    }
  }'
```

**Expected Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "[{\"_id\":\"...\",\"name\":\"add_tool\",...}]"
      }
    ],
    "isError": false
  }
}
```

**Success!** You've executed your first tool. The response contains a JSON stringified array of tools.

## JavaScript/TypeScript Client

Here's a complete client implementation you can use:

### Basic Client Function

```javascript
async function callMcpServer(method, params = {}) {
  const response = await fetch('http://localhost:4000/sse', {
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

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

// Helper for tool calls
async function callTool(toolName, arguments = {}) {
  const result = await callMcpServer('tools/call', {
    name: toolName,
    arguments,
  });

  // Parse JSON string response
  if (result.content && result.content[0] && result.content[0].text) {
    return JSON.parse(result.content[0].text);
  }
  
  return result;
}
```

### Using the Client

```javascript
// Initialize
const initResult = await callMcpServer('initialize');
console.log('Server initialized:', initResult.serverInfo);

// List all tools
const toolsResult = await callMcpServer('tools/list');
console.log(`Available tools: ${toolsResult.tools.length}`);

// Execute a tool
const tools = await callTool('list_tools', {});
console.log('Tools:', tools);
```

## Common First Tasks

### 1. Initialize Tools from Remote Server

If you have a remote MCP server configured, fetch its tools:

```javascript
const result = await callTool('init_tools', {
  source: 'remote',
  force: false
});

console.log('Initialized tools:', result);
```

**What this does**:
- Connects to remote MCP server (configured in `REMOTE_MCP_SERVER_URL`)
- Fetches all available tools
- Stores them in the database
- Makes them available for execution

### 2. Create an Available Model

Before using AI agents, register an available model:

```javascript
const model = await callTool('add_available_model', {
  provider: 'openai',
  modelName: 'GPT-4',
  modelId: 'gpt-4'
});

console.log('Model created:', model._id);
```

**Model IDs**:
- OpenAI: `gpt-4`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Anthropic: `claude-3-opus-20240229`, `claude-3-sonnet-20240229`, `claude-3-haiku-20240307`
- Ollama: `llama2`, `mistral`, `codellama`

### 3. Create an Agent Configuration

Configure an AI agent with API credentials:

```javascript
const agentConfig = await callTool('add_agent_config', {
  availableModelId: model._id, // From step 2
  apiKey: process.env.OPENAI_API_KEY, // Your API key
  maxTokenCount: 4000,
  isEnabled: true
});

console.log('Agent config created:', agentConfig._id);
```

**Important**: Store your API keys securely. Never commit them to version control.

### 4. Generate Your First Thought

Test the thought generation system:

```javascript
const thought = await callTool('generate_thoughts', {
  userQuery: 'List all available tools and show their descriptions',
  agentConfigId: agentConfig._id,
  enableToolSearch: true
});

console.log('Generated thought:', thought);
console.log('Primary approach:', thought.primaryApproach);
console.log('Recommended tools:', thought.recommendedTools);
```

**What this does**:
- Analyzes your query
- Searches for relevant tools
- Generates structured reasoning
- Recommends tools to use

### 5. Create a Plan from Thought

Convert the thought into an executable plan:

```javascript
const plan = await callTool('generate_plan', {
  thoughtId: thought._id,
  agentConfigId: agentConfig._id,
  enableToolSearch: true
});

console.log('Generated plan:', plan);
console.log('Plan steps:', plan.steps.length);
console.log('Plan goal:', plan.goal);
```

**What this does**:
- Takes the structured thought
- Creates step-by-step execution plan
- Handles dependencies between steps
- Extracts parameters from the thought

### 6. Execute the Plan

Run the plan as a task:

```javascript
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: agentConfig._id
});

console.log('Task started:', task.taskId);
console.log('Task status:', task.status);
```

**Note**: Task execution is asynchronous. You'll need to poll for status or use the task monitoring tools.

## Complete Example

Here's a complete workflow from start to finish:

```javascript
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/sse';

async function mcpCall(method, params) {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Math.random().toString(36),
      method,
      params,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

async function callTool(name, args) {
  const result = await mcpCall('tools/call', { name, arguments: args });
  return JSON.parse(result.content[0].text);
}

// Complete workflow
async function main() {
  try {
    // 1. Initialize
    await mcpCall('initialize');
    console.log('✅ Server initialized');

    // 2. List tools
    const toolsList = await mcpCall('tools/list');
    console.log(`✅ Found ${toolsList.tools.length} tools`);

    // 3. Create model
    const model = await callTool('add_available_model', {
      provider: 'openai',
      modelName: 'GPT-4',
      modelId: 'gpt-4',
    });
    console.log('✅ Model created:', model._id);

    // 4. Create agent config
    const config = await callTool('add_agent_config', {
      availableModelId: model._id,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokenCount: 4000,
      isEnabled: true,
    });
    console.log('✅ Agent config created:', config._id);

    // 5. Generate thought
    const thought = await callTool('generate_thoughts', {
      userQuery: 'Show me all available tools',
      agentConfigId: config._id,
      enableToolSearch: true,
    });
    console.log('✅ Thought generated:', thought._id);

    // 6. Create plan
    const plan = await callTool('generate_plan', {
      thoughtId: thought._id,
      agentConfigId: config._id,
    });
    console.log('✅ Plan created:', plan._id);

    // 7. Execute task
    const task = await callTool('execute_task', {
      planId: plan._id,
      agentConfigId: config._id,
    });
    console.log('✅ Task started:', task.taskId);

    console.log('\n🎉 Complete workflow executed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();
```

## Next Steps

Now that you've completed the quick start:

1. **[First Steps Guide](./first-steps.md)** - Complete walkthrough with detailed explanations
2. **[Tool Reference](../api-reference/tools.md)** - Complete catalog of all available tools
3. **[Agent System Guide](../features/agent-system.md)** - Deep dive into the agent architecture
4. **[Examples](../examples/basic-workflow.md)** - Real-world examples and use cases

## Troubleshooting

### Server Not Responding

```bash
# Check if server is running
curl http://localhost:4000/health

# Check server logs
# Look for error messages in terminal where server is running
```

### Tool Execution Errors

**Error**: `Tool not found`
- **Solution**: Use `tools/list` to see available tools
- Check tool name spelling

**Error**: `Invalid parameters`
- **Solution**: Check tool's `inputSchema` using `get_tool`
- Verify all required parameters are provided

### API Key Issues

**Error**: `Invalid API key`
- **Solution**: Verify API key in agent configuration
- Check API key hasn't expired
- Ensure API key has proper permissions

## Tips for Success

- **Start Simple**: Begin with basic tools like `list_tools` before using agents
- **Check Responses**: Always verify responses contain expected data
- **Save IDs**: Keep track of IDs returned (model IDs, config IDs, etc.)
- **Read Logs**: Server logs provide detailed information about operations
- **Use Tool Search**: Enable `enableToolSearch: true` for automatic tool discovery

---

**Ready for more?** → [First Steps Guide](./first-steps.md) or [Complete Tool Reference](../api-reference/tools.md)
