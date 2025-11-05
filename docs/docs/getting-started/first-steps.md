# First Steps

After installation, here are the essential first steps to get started with Agents MCP Server.

## 1. Verify Server Status

Check that the server is running:

```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "healthy",
  "mongodb": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 2. Initialize Tools from Remote Server

If you have a remote MCP server, initialize tools:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "tools/call",
    "params": {
      "name": "init_tools",
      "arguments": {
        "source": "remote"
      }
    }
  }'
```

## 3. Add an AI Model

Before using AI agents, add an available model:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "2",
    "method": "tools/call",
    "params": {
      "name": "add_available_model",
      "arguments": {
        "provider": "openai",
        "modelName": "GPT-4",
        "modelId": "gpt-4"
      }
    }
  }'
```

## 4. Create an Agent Configuration

Create an agent configuration with your API key:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "3",
    "method": "tools/call",
    "params": {
      "name": "add_agent_config",
      "arguments": {
        "availableModelId": "model-id-from-step-3",
        "apiKey": "your-api-key",
        "maxTokenCount": 4000,
        "isEnabled": true
      }
    }
  }'
```

## 5. Generate Your First Thought

Test the thought generation system:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "4",
    "method": "tools/call",
    "params": {
      "name": "generate_thoughts",
      "arguments": {
        "userQuery": "List all available tools",
        "agentConfigId": "agent-config-id-from-step-4"
      }
    }
  }'
```

## 6. Create and Execute a Plan

Create a plan from a thought:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "5",
    "method": "tools/call",
    "params": {
      "name": "generate_plan",
      "arguments": {
        "thoughtId": "thought-id-from-step-5",
        "agentConfigId": "agent-config-id"
      }
    }
  }'
```

Then execute the plan:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "6",
    "method": "tools/call",
    "params": {
      "name": "execute_task",
      "arguments": {
        "planId": "plan-id-from-above",
        "agentConfigId": "agent-config-id"
      }
    }
  }'
```

## What's Next?

Now that you've completed the basics:

- **Explore Features**: Learn about [Tool Management](../features/tool-management.md) and [Agent System](../features/agent-system.md)
- **Understand Architecture**: Read about [System Overview](../architecture/overview.md)
- **API Reference**: Check [API Documentation](../api-reference/protocol.md) for all available methods
- **Guides**: Follow [Task Executor Guide](../guides/task-executor.md) for detailed workflows

## Common Workflows

### Search for Tools

```bash
# Semantic search for tools
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "7",
    "method": "tools/call",
    "params": {
      "name": "get_tool_for_user_prompt",
      "arguments": {
        "userPrompt": "create a new facility"
      }
    }
  }'
```

### List Agent Configurations

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "8",
    "method": "tools/call",
    "params": {
      "name": "list_agent_configs",
      "arguments": {}
    }
  }'
```

## Tips

- **Save IDs**: Keep track of IDs returned from operations (agent configs, thoughts, plans)
- **Check Status**: Use health endpoint to verify server is running
- **Explore Tools**: Use `tools/list` to see all available tools
- **Read Logs**: Check server logs for detailed information

---

**Ready to dive deeper?** → [Features Overview](../features/overview.md)

