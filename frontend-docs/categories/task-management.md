# Task Management

Tasks represent the execution of plans. Each task tracks the step-by-step execution progress, outputs, user inputs, and execution history.

## Task Data Structure

A task contains the following information:

- **`_id`** (string) - Task ID
- **`planId`** (string) - Reference to the Plan being executed
- **`status`** (string) - Current status: `"pending"`, `"in_progress"`, `"paused"`, `"completed"`, `"failed"`, or `"cancelled"`
- **`stepOutputs`** (object) - Map of stepId -> output data from each completed step
- **`userInputs`** (object) - Map of stepId -> user-provided input values
- **`pendingUserInputs`** (array) - Array of pending user input requests:
  - `stepId` (string) - Step that needs input
  - `field` (string) - Field path that needs a value
  - `description` (string, optional) - Description of what input is needed
- **`retryCount`** (object) - Map of stepId -> number of retry attempts
- **`currentStepIndex`** (number) - Index of the current step being executed
- **`executionHistory`** (array) - Chronological history of step executions:
  - `stepId` (string)
  - `timestamp` (Date/string)
  - `status` (string) - `"started"`, `"completed"`, `"failed"`, or `"skipped"`
  - `error` (string, optional) - Error message if failed
  - `duration` (number, optional) - Execution time in milliseconds
  - `output` (any, optional) - Step output data
- **`error`** (string, optional) - Overall task error message if task failed
- **`agentConfigId`** (string) - Agent configuration used for AI generation
- **`timeout`** (number) - Execution timeout in milliseconds (default: 30000)
- **`maxRetries`** (number) - Maximum retries per step (default: 3)
- **`createdAt`** (Date/string) - Task creation timestamp
- **`updatedAt`** (Date/string) - Last update timestamp

## Available Tools

### `list_tasks`

List tasks with optional filters.

**Arguments:**
- `planId` (string, optional) - Filter by plan ID
- `status` (string, optional) - Filter by status: `"pending"`, `"in_progress"`, `"paused"`, `"completed"`, or `"failed"`
- `agentConfigId` (string, optional) - Filter by agent config ID
- `startDate` (string, optional) - Filter by start date (ISO 8601 format, e.g., `"2024-01-01T00:00:00Z"`)
- `endDate` (string, optional) - Filter by end date (ISO 8601 format)
- `limit` (number, optional) - Maximum number of results to return (default: 50)
- `skip` (number, optional) - Number of results to skip for pagination (default: 0)

**Response:**
```json
{
  "tasks": [
    {
      "_id": "task_id",
      "planId": "plan_id",
      "status": "in_progress",
      "stepOutputs": {},
      "userInputs": {},
      "pendingUserInputs": [],
      "retryCount": {},
      "currentStepIndex": 2,
      "executionHistory": [...],
      "agentConfigId": "config_id",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "skip": 0
}
```

**Example Usage:**
```javascript
// List all tasks
const allTasks = await callTool('list_tasks', {});

// List tasks for a specific plan
const planTasks = await callTool('list_tasks', {
  planId: 'plan_123'
});

// List only completed tasks
const completedTasks = await callTool('list_tasks', {
  status: 'completed'
});

// List tasks from the last week
const recentTasks = await callTool('list_tasks', {
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  limit: 100
});

// Paginate through tasks
const page1 = await callTool('list_tasks', { limit: 20, skip: 0 });
const page2 = await callTool('list_tasks', { limit: 20, skip: 20 });
```

### `get_task`

Get detailed information about a specific task.

**Arguments:**
- `id` (string, required) - Task ID

**Response:**
```json
{
  "_id": "task_id",
  "planId": "plan_id",
  "status": "in_progress",
  "stepOutputs": {
    "step_1": { "result": "..." },
    "step_2": { "data": "..." }
  },
  "userInputs": {
    "step_3": {
      "param1": "value1"
    }
  },
  "pendingUserInputs": [
    {
      "stepId": "step_4",
      "field": "userName",
      "description": "Enter the username"
    }
  ],
  "retryCount": {
    "step_2": 1
  },
  "currentStepIndex": 3,
  "executionHistory": [
    {
      "stepId": "step_1",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "status": "completed",
      "duration": 1500,
      "output": { "result": "..." }
    }
  ],
  "agentConfigId": "config_id",
  "timeout": 30000,
  "maxRetries": 3,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Example Usage:**
```javascript
const task = await callTool('get_task', {
  id: 'task_123'
});

// Check if task needs user input
if (task.pendingUserInputs && task.pendingUserInputs.length > 0) {
  console.log('Task needs user input:', task.pendingUserInputs);
}

// Check execution progress
console.log(`Status: ${task.status}`);
console.log(`Current step: ${task.currentStepIndex}`);
console.log(`Steps completed: ${Object.keys(task.stepOutputs).length}`);
```

### `remove_task`

Delete a task by ID.

**Note:** This tool may need to be implemented if it doesn't exist yet.

**Arguments:**
- `id` (string, required) - Task ID to delete

**Response:**
```json
{
  "message": "Task removed successfully",
  "task": {
    "_id": "task_id",
    ...
  }
}
```

**Example Usage:**
```javascript
const result = await callTool('remove_task', {
  id: 'task_123'
});
```

## Frontend Implementation Examples

### Task List Component

```javascript
// TaskService.js
class TaskService {
  async listTasks(filters = {}) {
    return await callTool('list_tasks', filters);
  }

  async getTask(id) {
    return await callTool('get_task', { id });
  }

  async deleteTask(id) {
    return await callTool('remove_task', { id });
  }
}

// TaskList.jsx
function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [filters, setFilters] = useState({
    status: null,
    limit: 50
  });

  useEffect(() => {
    loadTasks();
  }, [filters]);

  const loadTasks = async () => {
    const result = await taskService.listTasks(filters);
    setTasks(result.tasks);
  };

  return (
    <div>
      <TaskFilters filters={filters} onChange={setFilters} />
      <TaskTable tasks={tasks} onDelete={handleDelete} />
    </div>
  );
}
```

### Task Detail View

```javascript
function TaskDetail({ taskId }) {
  const [task, setTask] = useState(null);

  useEffect(() => {
    loadTask();
    // Poll for updates if task is in progress
    if (task?.status === 'in_progress' || task?.status === 'pending') {
      const interval = setInterval(loadTask, 2000);
      return () => clearInterval(interval);
    }
  }, [taskId]);

  const loadTask = async () => {
    const result = await taskService.getTask(taskId);
    setTask(result);
  };

  if (!task) return <Loading />;

  return (
    <div>
      <TaskHeader task={task} />
      <TaskStatus status={task.status} />
      <PendingInputs inputs={task.pendingUserInputs} />
      <ExecutionHistory history={task.executionHistory} />
      <StepOutputs outputs={task.stepOutputs} />
    </div>
  );
}
```

## Common Use Cases

1. **Task Dashboard** - Display all tasks with status filters and pagination
2. **Task Monitor** - Real-time monitoring of in-progress tasks with polling
3. **Task History** - View completed/failed tasks with execution details
4. **Task Cleanup** - Delete old or failed tasks
5. **Plan Progress** - Show all tasks for a specific plan to track execution

## Status Flow

Tasks progress through the following statuses:

1. **`pending`** - Task created but not started
2. **`in_progress`** - Task is currently executing steps
3. **`paused`** - Task is waiting for user input (check `pendingUserInputs`)
4. **`completed`** - All steps executed successfully
5. **`failed`** - Task execution failed (check `error` field)
6. **`cancelled`** - Task was cancelled

## Key Fields to Display

When building a task UI, consider displaying:

- **Status badge** - Color-coded status indicator
- **Progress indicator** - Based on `currentStepIndex` vs total steps from plan
- **Pending inputs alert** - Show when `pendingUserInputs.length > 0`
- **Execution timeline** - Visual timeline from `executionHistory`
- **Error messages** - Display `error` field when status is `failed`
- **Step outputs** - Show `stepOutputs` for completed steps
- **Metadata** - Created/updated timestamps, agent config, plan reference

