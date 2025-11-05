# Intelligence Features

Tools for memory, history, benchmarking, and smart features.

## Memory System Tools

### `query_memory`

Query memory for relevant knowledge including patterns, tool memory, insights, and user preferences.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "query_memory",
    "arguments": {
      "query": "create facility",
      "memoryTypes": ["patterns", "tool_memory"],
      "context": "facility_management",
      "limit": 10
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"patterns\": [...], \"toolMemory\": [...], \"query\": \"create facility\", \"context\": \"facility_management\"}"
      }
    ],
    "isError": false
  }
}
```

**Frontend Use Case:**
Display memory insights when planning a task.

**React Component Example:**
```javascript
async function queryMemory(query, memoryTypes = ['patterns', 'tool_memory']) {
  const response = await fetch('http://localhost:4000/sse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: generateId(),
      method: 'tools/call',
      params: {
        name: 'query_memory',
        arguments: { query, memoryTypes, limit: 10 }
      }
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.result.content[0].text);
}
```

### `get_memory_pattern`

Get a specific memory pattern by type and pattern string.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/call",
  "params": {
    "name": "get_memory_pattern",
    "arguments": {
      "patternType": "plan_pattern",
      "pattern": "create_*_for_facility"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"pattern\": {\"patternId\": \"...\", \"patternType\": \"plan_pattern\", \"successMetrics\": {...}, \"confidence\": 0.9}}"
      }
    ],
    "isError": false
  }
}
```

### `store_insight`

Manually store an insight for agents.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "store_insight",
    "arguments": {
      "insight": "Tool X works well for Y",
      "insightType": "optimization",
      "confidence": 0.9,
      "appliesTo": {
        "agents": ["planner"],
        "contexts": ["facility_management"]
      },
      "evidence": [
        {
          "taskId": "task-123",
          "description": "Successfully used in 5 tasks"
        }
      ]
    }
  }
}
```

## History Tools

### `get_similar_tasks`

Find past tasks with similar queries/goals using semantic similarity search.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/call",
  "params": {
    "name": "get_similar_tasks",
    "arguments": {
      "query": "create facility inspection",
      "limit": 10,
      "minSimilarity": 0.7,
      "status": "completed"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"tasks\": [{\"taskId\": \"...\", \"query\": \"...\", \"similarity\": 0.85, \"successMetrics\": {...}}], \"count\": 5}"
      }
    ],
    "isError": false
  }
}
```

**Frontend Use Case:**
Show similar past tasks when user enters a query.

**React Component Example:**
```jsx
function SimilarTasks({ query }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query) return;
    
    setLoading(true);
    callTool('get_similar_tasks', {
      query,
      limit: 5,
      minSimilarity: 0.7
    }).then(result => {
      setTasks(result.tasks);
      setLoading(false);
    });
  }, [query]);

  return (
    <div>
      <h3>Similar Past Tasks</h3>
      {loading ? <div>Loading...</div> : (
        <ul>
          {tasks.map(task => (
            <li key={task.taskId}>
              {task.query} (Similarity: {(task.similarity * 100).toFixed(0)}%)
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### `get_successful_plans`

Find plans that worked well for similar goals.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "5",
  "method": "tools/call",
  "params": {
    "name": "get_successful_plans",
    "arguments": {
      "goal": "create facility",
      "limit": 5,
      "minSuccessRate": 0.8
    }
  }
}
```

### `get_tool_performance`

Get performance metrics for a specific tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "method": "tools/call",
  "params": {
    "name": "get_tool_performance",
    "arguments": {
      "toolName": "create_facility",
      "context": "facility_management"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "6",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"toolName\": \"create_facility\", \"totalExecutions\": 100, \"successCount\": 95, \"successRate\": 0.95, \"avgDuration\": 1200, \"commonErrors\": [...], \"recommendations\": [...]}"
      }
    ],
    "isError": false
  }
}
```

### `get_agent_insights`

Get learned insights from a specific agent type.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "7",
  "method": "tools/call",
  "params": {
    "name": "get_agent_insights",
    "arguments": {
      "agentType": "planner",
      "insightType": "optimizations",
      "limit": 10
    }
  }
}
```

## Benchmark Tools

### `create_benchmark_test`

Create a new benchmark test definition.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "8",
  "method": "tools/call",
  "params": {
    "name": "create_benchmark_test",
    "arguments": {
      "name": "CRUD Operations",
      "description": "Test basic CRUD operations",
      "query": "Create, read, update, and delete a facility",
      "expectedOutcome": {
        "type": "success",
        "maxDuration": 5000
      },
      "category": "crud",
      "tags": ["basic", "crud"],
      "priority": "high"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "8",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"testId\": \"test_123\", \"message\": \"Benchmark test created successfully\"}"
      }
    ],
    "isError": false
  }
}
```

### `run_benchmark_test`

Execute a single benchmark test.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "9",
  "method": "tools/call",
  "params": {
    "name": "run_benchmark_test",
    "arguments": {
      "testId": "test_123",
      "agentConfigId": "config-id",
      "timeout": 30000
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "9",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"status\": \"success\", \"metrics\": {\"executionTime\": 3200, \"stepsCompleted\": 4, \"retries\": 0}, \"tokenUsage\": {...}, \"actualOutput\": {...}}"
      }
    ],
    "isError": false
  }
}
```

### `run_benchmark_suite`

Execute a suite of benchmark tests.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "10",
  "method": "tools/call",
  "params": {
    "name": "run_benchmark_suite",
    "arguments": {
      "suiteId": "suite-123",
      "agentConfigId": "config-id",
      "parallel": false,
      "timeout": 30000
    }
  }
}
```

### `detect_regressions`

Analyze recent benchmark runs for performance regressions.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "11",
  "method": "tools/call",
  "params": {
    "name": "detect_regressions",
    "arguments": {
      "testId": "test_123"
    }
  }
}
```

### `get_performance_metrics`

Get performance metrics over time.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "12",
  "method": "tools/call",
  "params": {
    "name": "get_performance_metrics",
    "arguments": {
      "metricType": "success_rate",
      "period": "day"
    }
  }
}
```

## Smart Features

### `predict_plan_quality`

Predict plan success probability before execution.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "13",
  "method": "tools/call",
  "params": {
    "name": "predict_plan_quality",
    "arguments": {
      "planId": "plan-123"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "13",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"prediction\": {\"successProbability\": 0.85, \"confidence\": 0.9, \"riskLevel\": \"low\", \"estimatedDuration\": 5000, \"estimatedCost\": 0.02}, \"riskFactors\": [...], \"recommendations\": [...], \"shouldExecute\": true}"
      }
    ],
    "isError": false
  }
}
```

**Frontend Use Case:**
Show quality prediction before executing a plan.

**React Component Example:**
```jsx
function PlanQualityIndicator({ planId }) {
  const [prediction, setPrediction] = useState(null);

  useEffect(() => {
    callTool('predict_plan_quality', { planId })
      .then(result => setPrediction(result.prediction));
  }, [planId]);

  if (!prediction) return <div>Loading...</div>;

  return (
    <div>
      <div>Success Probability: {(prediction.successProbability * 100).toFixed(0)}%</div>
      <div>Risk Level: {prediction.riskLevel}</div>
      {prediction.riskFactors.length > 0 && (
        <div>
          <strong>Risk Factors:</strong>
          <ul>
            {prediction.riskFactors.map((factor, i) => (
              <li key={i}>{factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

### `get_tool_recommendations`

Get optimized tool recommendations for an action.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "14",
  "method": "tools/call",
  "params": {
    "name": "get_tool_recommendations",
    "arguments": {
      "requiredAction": "create facility",
      "context": "facility_management"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "14",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"recommendations\": [{\"toolName\": \"create_facility\", \"confidence\": 0.95, \"reason\": \"High success rate in similar contexts\", \"performanceData\": {\"successRate\": 0.95, \"avgDuration\": 1200}}], \"warnings\": []}"
      }
    ],
    "isError": false
  }
}
```

### `refine_plan`

Automatically improve a failed plan.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "15",
  "method": "tools/call",
  "params": {
    "name": "refine_plan",
    "arguments": {
      "planId": "plan-123",
      "failureReason": "Tool execution failed"
    }
  }
}
```

### `track_cost`

Track token usage and API costs for a task.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "16",
  "method": "tools/call",
  "params": {
    "name": "track_cost",
    "arguments": {
      "taskId": "task-123"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "16",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"tokenUsage\": {\"promptTokens\": 1200, \"completionTokens\": 800, \"totalTokens\": 2000}, \"cost\": {\"amount\": 0.02, \"currency\": \"USD\", \"model\": \"gpt-4\"}, \"apiCalls\": 5}"
      }
    ],
    "isError": false
  }
}
```

### `optimize_cost`

Optimize plan for cost efficiency.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "17",
  "method": "tools/call",
  "params": {
    "name": "optimize_cost",
    "arguments": {
      "planId": "plan-123"
    }
  }
}
```

## Common Patterns

### Loading States

```javascript
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);

async function callIntelligenceTool(toolName, args) {
  setLoading(true);
  setError(null);
  try {
    const result = await callTool(toolName, args);
    return result;
  } catch (err) {
    setError(err.message);
    throw err;
  } finally {
    setLoading(false);
  }
}
```

### Error Handling

```javascript
try {
  const result = await callTool('predict_plan_quality', { planId });
  // Handle success
} catch (error) {
  if (error.message.includes('not found')) {
    // Handle not found
  } else if (error.message.includes('validation')) {
    // Handle validation error
  } else {
    // Handle general error
  }
}
```

### Real-time Updates

For benchmark tests that run asynchronously:

```javascript
async function runBenchmarkWithPolling(testId, agentConfigId) {
  // Start test
  const { runId } = await callTool('run_benchmark_test', {
    testId,
    agentConfigId
  });

  // Poll for results
  const pollInterval = setInterval(async () => {
    const status = await callTool('get_task', { id: runId });
    if (status.status === 'completed' || status.status === 'failed') {
      clearInterval(pollInterval);
      return status;
    }
  }, 2000);
}
```

## See Also

- [Agent Workflows](./agent-workflows.md) - Complete workflow examples
- [Task Management](./task-management.md) - Task execution documentation
- [Tool Execution](./tool-execution.md) - Basic tool execution

