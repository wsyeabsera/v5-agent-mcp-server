# Complex Workflow Example

A multi-step workflow example with dependencies and parameter passing between steps.

## Overview

This example demonstrates:
- Multi-step plan execution
- Step dependencies
- Parameter extraction from previous steps
- Error handling

## Example: Create Facility Inspection

### Step 1: Generate Thought

```javascript
const thought = await callTool('generate_thoughts', {
  userQuery: 'Create an inspection for facility ABC123',
  agentConfigId: 'config-id',
  enableToolSearch: true
});
```

### Step 2: Create Plan

The plan will have multiple steps with dependencies:

```javascript
const plan = await callTool('generate_plan', {
  thoughtId: thought._id,
  agentConfigId: 'config-id'
});

// Plan structure:
// Step 1: get_facility (get facility by ID)
// Step 2: create_inspection (depends on step 1, uses facility._id)
```

### Step 3: Execute and Monitor

```javascript
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: 'config-id'
});

// Monitor execution
let taskStatus;
do {
  await new Promise(resolve => setTimeout(resolve, 1000));
  taskStatus = await callTool('get_task', { id: task.taskId });
  
  // Check for pending user inputs
  if (taskStatus.pendingUserInputs.length > 0) {
    console.log('User input required:', taskStatus.pendingUserInputs);
    // Provide user input via resume_task
  }
} while (['pending', 'in_progress'].includes(taskStatus.status));
```

## Handling Dependencies

Steps can reference outputs from previous steps:

```javascript
// Plan step parameters might look like:
{
  "step-1": {
    "action": "get_facility",
    "parameters": {
      "facilityId": "ABC123"
    }
  },
  "step-2": {
    "action": "create_inspection",
    "parameters": {
      "facilityId": "{{step-1.output._id}}",  // Reference step 1 output
      "inspectionType": "routine"
    },
    "dependencies": ["step-1"]
  }
}
```

## Error Handling

```javascript
if (taskStatus.status === 'failed') {
  console.error('Task failed:', taskStatus.error);
  
  // Get detailed error information
  console.log('Failed step:', taskStatus.currentStepIndex);
  console.log('Execution history:', taskStatus.executionHistory);
  
  // Optionally refine the plan
  const refinedPlan = await callTool('refine_plan', {
    planId: plan._id,
    failureReason: taskStatus.error
  });
}
```

## Complete Example

```javascript
async function complexWorkflow() {
  try {
    // Generate thought
    const thought = await callTool('generate_thoughts', {
      userQuery: 'Create an inspection for facility ABC123',
      agentConfigId: 'config-id'
    });

    // Create plan
    const plan = await callTool('generate_plan', {
      thoughtId: thought._id,
      agentConfigId: 'config-id'
    });

    // Predict quality before execution
    const prediction = await callTool('predict_plan_quality', {
      planId: plan._id
    });
    
    if (prediction.shouldExecute) {
      console.log('Plan quality:', prediction.prediction.successProbability);
    }

    // Execute task
    const task = await callTool('execute_task', {
      planId: plan._id,
      agentConfigId: 'config-id'
    });

    // Monitor with error handling
    let taskStatus;
    const maxWaitTime = 60000; // 60 seconds
    const startTime = Date.now();

    while (['pending', 'in_progress', 'paused'].includes(taskStatus?.status)) {
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Task execution timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      taskStatus = await callTool('get_task', { id: task.taskId });

      // Handle user input requests
      if (taskStatus.pendingUserInputs.length > 0) {
        const userInputs = await collectUserInputs(taskStatus.pendingUserInputs);
        await callTool('resume_task', {
          taskId: task.taskId,
          userInputs
        });
      }
    }

    if (taskStatus.status === 'completed') {
      console.log('✅ Workflow completed!');
      return taskStatus.stepOutputs;
    } else {
      throw new Error(`Task failed: ${taskStatus.error}`);
    }
  } catch (error) {
    console.error('Workflow error:', error);
    throw error;
  }
}
```

## Next Steps

- [Memory Integration Example](./memory-integration.md) - Using memory patterns
- [Task Executor Guide](../guides/task-executor.md) - Advanced execution patterns

