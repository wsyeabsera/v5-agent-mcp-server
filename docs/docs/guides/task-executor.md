# Task Executor Guide

Complete guide to executing tasks with the agent system.

## Workflow

1. Generate thoughts from user query
2. Create plan from thoughts
3. Execute task from plan
4. Handle user inputs if needed
5. Monitor execution progress

## Example

```javascript
// Step 1: Generate thoughts
const thought = await callTool('generate_thoughts', {
  userQuery: 'Create a facility inspection',
  agentConfigId: 'config-id'
});

// Step 2: Generate plan
const plan = await callTool('generate_plan', {
  thoughtId: thought._id,
  agentConfigId: 'config-id'
});

// Step 3: Execute task
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: 'config-id'
});

// Step 4: Monitor and handle inputs
if (task.status === 'paused' && task.pendingUserInputs.length > 0) {
  // Collect user inputs
  const inputs = await collectInputs(task.pendingUserInputs);
  
  // Resume task
  await callTool('resume_task', {
    taskId: task._id,
    userInputs: inputs
  });
}
```

## Monitoring

Poll task status to monitor progress:

```javascript
const pollTask = async (taskId) => {
  const task = await callTool('get_task', { id: taskId });
  
  if (task.status === 'in_progress' || task.status === 'paused') {
    setTimeout(() => pollTask(taskId), 2000);
  }
  
  return task;
};
```

## Error Handling

Handle errors and retries:

```javascript
try {
  const task = await callTool('execute_task', {
    planId: plan._id,
    agentConfigId: 'config-id'
  });
} catch (error) {
  if (error.message.includes('retry')) {
    // Handle retry logic
  }
}
```

