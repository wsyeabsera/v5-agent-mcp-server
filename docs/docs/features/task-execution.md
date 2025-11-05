# Task Execution

Execute plans step-by-step with dependency management.

## Overview

Tasks execute plans created by the Planner Agent. They handle:
- Step dependencies
- User input collection
- Error handling and retries
- Progress tracking

## Task Status

- `pending` - Created but not started
- `in_progress` - Currently executing
- `paused` - Waiting for user input
- `completed` - Successfully completed
- `failed` - Execution failed
- `cancelled` - Task cancelled

## Tools

### Execute Task

```javascript
const task = await callTool('execute_task', {
  planId: 'plan-id',
  agentConfigId: 'config-id'
});
```

### Resume Task

```javascript
const task = await callTool('resume_task', {
  taskId: 'task-id',
  userInputs: [
    { stepId: 'step-1', field: 'param1', value: 'value1' }
  ]
});
```

### Get Task

```javascript
const task = await callTool('get_task', {
  id: 'task-id'
});
```

## User Inputs

Tasks can pause to collect user input:

```javascript
if (task.pendingUserInputs.length > 0) {
  // Collect inputs from user
  const inputs = await collectUserInputs(task.pendingUserInputs);
  
  // Resume task
  await callTool('resume_task', {
    taskId: task._id,
    userInputs: inputs
  });
}
```

See [Task Executor Guide](../guides/task-executor.md) for detailed examples.

