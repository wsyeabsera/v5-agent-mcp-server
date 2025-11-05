# First Workflow Tutorial

Complete walkthrough of your first successful workflow with Agents MCP Server.

## Prerequisites

- Server installed and running (see [Installation](../getting-started/installation.md))
- MongoDB connected
- Agent configuration created
- Basic understanding of JSON-RPC 2.0

## Step 1: Verify Server Status

```bash
curl http://localhost:4000/health
```

Expected: `{"status":"healthy","mongodb":"connected"}`

## Step 2: Initialize Tools

If you haven't already, initialize tools from a remote server:

```javascript
const result = await callTool('init_tools', {
  source: 'remote',
  force: false
});

console.log('Tools initialized:', result.added);
```

## Step 3: Create Agent Configuration

```javascript
// First, add an available model
const model = await callTool('add_available_model', {
  provider: 'openai',
  modelName: 'GPT-4',
  modelId: 'gpt-4'
});

// Then create agent config
const config = await callTool('add_agent_config', {
  availableModelId: model._id,
  apiKey: process.env.OPENAI_API_KEY,
  maxTokenCount: 4000,
  isEnabled: true
});

console.log('Agent config created:', config._id);
```

## Step 4: Generate Your First Thought

```javascript
const thought = await callTool('generate_thoughts', {
  userQuery: 'List all available tools',
  agentConfigId: config._id,
  enableToolSearch: true
});

console.log('Thought generated:', thought._id);
console.log('Primary approach:', thought.primaryApproach);
```

## Step 5: Create a Plan

```javascript
const plan = await callTool('generate_plan', {
  thoughtId: thought._id,
  agentConfigId: config._id
});

console.log('Plan created:', plan._id);
console.log('Plan steps:', plan.steps.length);
```

## Step 6: Execute the Plan

```javascript
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: config._id
});

console.log('Task started:', task.taskId);
```

## Step 7: Monitor Progress

```javascript
let taskStatus;
do {
  await new Promise(resolve => setTimeout(resolve, 1000));
  taskStatus = await callTool('get_task', {
    id: task.taskId
  });
  console.log('Status:', taskStatus.status);
} while (['pending', 'in_progress'].includes(taskStatus.status));

if (taskStatus.status === 'completed') {
  console.log('✅ Success!');
  console.log('Results:', taskStatus.stepOutputs);
}
```

## Complete Example Script

```javascript
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:4000/sse';

async function callTool(name, args) {
  const response = await fetch(API_BASE, {
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
}

async function firstWorkflow() {
  try {
    // 1. Create model
    const model = await callTool('add_available_model', {
      provider: 'openai',
      modelName: 'GPT-4',
      modelId: 'gpt-4'
    });

    // 2. Create config
    const config = await callTool('add_agent_config', {
      availableModelId: model._id,
      apiKey: process.env.OPENAI_API_KEY,
      maxTokenCount: 4000,
      isEnabled: true
    });

    // 3. Generate thought
    const thought = await callTool('generate_thoughts', {
      userQuery: 'List all available tools',
      agentConfigId: config._id,
      enableToolSearch: true
    });

    // 4. Create plan
    const plan = await callTool('generate_plan', {
      thoughtId: thought._id,
      agentConfigId: config._id
    });

    // 5. Execute task
    const task = await callTool('execute_task', {
      planId: plan._id,
      agentConfigId: config._id
    });

    // 6. Monitor
    let status;
    do {
      await new Promise(r => setTimeout(r, 1000));
      status = await callTool('get_task', { id: task.taskId });
    } while (['pending', 'in_progress'].includes(status.status));

    console.log('✅ Workflow completed!', status);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

firstWorkflow();
```

## Troubleshooting

### Task Stuck in "pending" Status

- Check server logs for errors
- Verify agent config is enabled
- Ensure API keys are valid

### Task Failed

- Check error message in task status
- Review execution history
- Try refining the plan

## Next Steps

- [Basic Workflow Example](../examples/basic-workflow.md) - Simple examples
- [Task Executor Guide](./task-executor.md) - Advanced execution
- [Agent System Guide](../features/agent-system.md) - Understand agents

