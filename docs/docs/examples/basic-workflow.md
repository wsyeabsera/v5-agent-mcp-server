# Basic Workflow Example

A simple end-to-end example of executing a complete workflow using Agents MCP Server.

## Overview

This example demonstrates the complete flow: Thought → Plan → Task Execution.

## Prerequisites

- Server running on `http://localhost:4000`
- Agent configuration created
- Tools initialized in the database

## Step-by-Step Example

### Step 1: Generate a Thought

```javascript
const thought = await callTool('generate_thoughts', {
  userQuery: 'List all available tools',
  agentConfigId: 'your-config-id',
  enableToolSearch: true
});

console.log('Thought ID:', thought._id);
console.log('Primary Approach:', thought.primaryApproach);
```

### Step 2: Create a Plan

```javascript
const plan = await callTool('generate_plan', {
  thoughtId: thought._id,
  agentConfigId: 'your-config-id'
});

console.log('Plan ID:', plan._id);
console.log('Goal:', plan.goal);
console.log('Steps:', plan.steps.length);
```

### Step 3: Execute the Task

```javascript
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: 'your-config-id'
});

console.log('Task ID:', task.taskId);
console.log('Status:', task.status);
```

### Step 4: Monitor Progress

```javascript
// Poll for task completion
let taskStatus;
do {
  await new Promise(resolve => setTimeout(resolve, 1000));
  taskStatus = await callTool('get_task', {
    id: task.taskId
  });
  console.log('Current status:', taskStatus.status);
} while (taskStatus.status === 'in_progress' || taskStatus.status === 'pending');

console.log('Final status:', taskStatus.status);
console.log('Results:', taskStatus.stepOutputs);
```

## Complete Code Example

```javascript
async function basicWorkflow() {
  try {
    // 1. Generate thought
    const thought = await callTool('generate_thoughts', {
      userQuery: 'List all available tools',
      agentConfigId: 'config-id',
      enableToolSearch: true
    });

    // 2. Create plan
    const plan = await callTool('generate_plan', {
      thoughtId: thought._id,
      agentConfigId: 'config-id'
    });

    // 3. Execute task
    const task = await callTool('execute_task', {
      planId: plan._id,
      agentConfigId: 'config-id'
    });

    // 4. Wait for completion
    let taskStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      taskStatus = await callTool('get_task', {
        id: task.taskId
      });
    } while (['pending', 'in_progress'].includes(taskStatus.status));

    // 5. Get results
    if (taskStatus.status === 'completed') {
      console.log('✅ Task completed successfully!');
      console.log('Results:', taskStatus.stepOutputs);
    } else {
      console.error('❌ Task failed:', taskStatus.error);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Expected Output

```
Thought ID: 65f1234567890abcdef12345
Primary Approach: Use list_tools to retrieve all available tools
Plan ID: 65f1234567890abcdef12346
Goal: List all available tools in the system
Steps: 1
Task ID: 65f1234567890abcdef12347
Current status: in_progress
Current status: completed
✅ Task completed successfully!
Results: { 'step-1': { tools: [...] } }
```

## Next Steps

- [Complex Workflow Example](./complex-workflow.md) - Multi-step with dependencies
- [Memory Integration Example](./memory-integration.md) - Using memory in workflows
- [Task Executor Guide](../guides/task-executor.md) - Detailed execution guide

