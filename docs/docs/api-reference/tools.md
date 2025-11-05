# Complete Tool Reference

Comprehensive documentation of all available tools in Agents MCP Server, organized by category.

## Tool Categories

The server provides **100+ tools** organized into the following categories:

1. **Tool Management** (5 tools) - CRUD operations for tools
2. **Agent System** (4 tools) - Thought, Plan, Task execution
3. **Memory & Learning** (3 tools) - Memory system, patterns, insights
4. **History & Query** (5 tools) - Query past executions and learnings
5. **Smart Features** (5 tools) - Quality prediction, recommendations, optimization
6. **Benchmarking** (5 tools) - Test creation, execution, metrics
7. **MCP Client** (1 tool) - Remote tool execution
8. **MCP Resources** (2 tools) - Remote resource access
9. **MCP Prompts** (1 tool) - Remote prompt extraction
10. **Local Prompts** (1 tool) - Local prompt extraction
11. **AI Calls** (1 tool) - Direct AI model interaction
12. **Model Management** (10 tools) - Agent configs and available models
13. **Resource Management** (5 tools) - Local resource CRUD
14. **Prompt Management** (5 tools) - Local prompt CRUD
15. **Request Management** (5 tools) - Request tracking
16. **Search & Discovery** (2 tools) - Semantic tool/prompt search
17. **Initialization** (1 tool) - Database seeding

---

## 1. Tool Management

Manage tools stored in the database (CRUD operations).

### `add_tool`

Add a new tool to the database.

**Parameters**:
- `name` (string, required) - Tool name (must be unique)
- `description` (string, required) - Tool description
- `inputSchema` (object, required) - JSON schema for tool inputs
- `source` (enum: `'remote'` | `'local'`, optional) - Source of the tool (default: `'remote'`)
- `operationType` (enum: `'query'` | `'mutation'`, optional) - Operation type
- `entityType` (enum: `'facility'` | `'shipment'` | `'contaminant'` | `'contract'` | `'inspection'` | `'other'`, optional) - Entity type

**Example**:
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "tools/call",
  "params": {
    "name": "add_tool",
    "arguments": {
      "name": "create_facility",
      "description": "Create a new facility",
      "inputSchema": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "location": { "type": "string" }
        },
        "required": ["name"]
      },
      "source": "local",
      "operationType": "mutation",
      "entityType": "facility"
    }
  }
}
```

**Response**:
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"_id\":\"...\",\"name\":\"create_facility\",...}"
    }],
    "isError": false
  }
}
```

### `get_tool`

Get a tool by name.

**Parameters**:
- `name` (string, required) - Tool name

**Example**:
```json
{
  "name": "get_tool",
  "arguments": {
    "name": "create_facility"
  }
}
```

### `list_tools`

List all tools with optional filters.

**Parameters**:
- `source` (enum: `'remote'` | `'local'`, optional) - Filter by source

**Example**:
```json
{
  "name": "list_tools",
  "arguments": {
    "source": "local"
  }
}
```

### `update_tool`

Update an existing tool.

**Parameters**:
- `name` (string, required) - Tool name to update
- `description` (string, optional) - New description
- `inputSchema` (object, optional) - New input schema
- `source` (enum, optional) - New source
- `operationType` (enum, optional) - New operation type
- `entityType` (enum, optional) - New entity type

### `remove_tool`

Remove a tool from the database.

**Parameters**:
- `name` (string, required) - Tool name to remove

---

## 2. Agent System

AI-powered agents for intelligent task execution.

### `generate_thoughts`

Generate structured thoughts from a user query using AI.

**Parameters**:
- `userQuery` (string, required) - User query or request
- `agentConfigId` (string, required) - Agent config ID to use for AI call
- `availableTools` (array of strings, optional) - List of available tool names for context
- `conversationHistory` (array, optional) - Previous conversation history
- `enableToolSearch` (boolean, optional, default: `true`) - Enable automatic tool search

**Example**:
```json
{
  "name": "generate_thoughts",
  "arguments": {
    "userQuery": "Create a facility inspection for facility ABC",
    "agentConfigId": "config-id",
    "enableToolSearch": true
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"_id\":\"thought-id\",\"userQuery\":\"...\",\"thoughts\":[{...}],\"primaryApproach\":\"...\",\"recommendedTools\":[...]}"
  }]
}
```

**Use Cases**:
- Analyze complex user queries
- Explore multiple solution approaches
- Identify constraints and considerations
- Recommend relevant tools

**Learn more**: [Thought Agent](../features/agent-system.md#thought-agent)

### `generate_plan`

Generate a structured execution plan from a thought.

**Parameters**:
- `thoughtId` (string, optional) - ID of the thought to convert into a plan
- `thought` (object, optional) - Thought object (alternative to thoughtId)
- `agentConfigId` (string, required) - Agent config ID to use for AI call
- `enableToolSearch` (boolean, optional, default: `true`) - Enable automatic tool search

**Example**:
```json
{
  "name": "generate_plan",
  "arguments": {
    "thoughtId": "thought-id",
    "agentConfigId": "config-id",
    "enableToolSearch": true
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"_id\":\"plan-id\",\"thoughtId\":\"thought-id\",\"goal\":\"...\",\"steps\":[{...}],\"status\":\"pending\",\"missingData\":[]}"
  }]
}
```

**Use Cases**:
- Convert thoughts into executable plans
- Handle step dependencies
- Extract parameters from thoughts
- Create structured execution sequences

**Learn more**: [Planner Agent](../features/agent-system.md#planner-agent)

### `execute_task`

Execute a plan by creating a task and running it step-by-step.

**Parameters**:
- `planId` (string, required) - Plan ID to execute
- `agentConfigId` (string, required) - Agent config ID for AI generation

**Example**:
```json
{
  "name": "execute_task",
  "arguments": {
    "planId": "plan-id",
    "agentConfigId": "config-id"
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"taskId\":\"task-id\",\"planId\":\"plan-id\",\"status\":\"in_progress\",\"message\":\"Task execution started\"}"
  }]
}
```

**Note**: Task execution is asynchronous. Use `get_task` to monitor progress.

**Use Cases**:
- Execute complex multi-step workflows
- Handle dependencies between steps
- Manage user prompts during execution
- Track execution progress

**Learn more**: [Executor Agent](../features/agent-system.md#executor-agent)

### `resume_task`

Resume a paused task after providing user inputs.

**Parameters**:
- `taskId` (string, required) - Task ID to resume
- `userInputs` (array, required) - Array of user inputs:
  - `stepId` (string, required) - Step ID that needs this input
  - `field` (string, required) - Field path (supports dot notation)
  - `value` (any, required) - Value provided by user

**Example**:
```json
{
  "name": "resume_task",
  "arguments": {
    "taskId": "task-id",
    "userInputs": [
      {
        "stepId": "step-2",
        "field": "facilityId",
        "value": "facility-123"
      }
    ]
  }
}
```

**Use Cases**:
- Continue paused task execution
- Provide missing information
- Resolve user prompts

---

## 3. Task Management

Manage and monitor task execution.

### `get_task`

Get task details including status, step outputs, pending inputs, and execution history.

**Parameters**:
- `id` (string, required) - Task ID

**Example**:
```json
{
  "name": "get_task",
  "arguments": {
    "id": "task-id"
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"_id\":\"task-id\",\"planId\":\"plan-id\",\"status\":\"in_progress\",\"currentStepIndex\":2,\"stepOutputs\":{...},\"pendingUserInputs\":[...],\"executionHistory\":[...]}"
  }]
}
```

### `list_tasks`

List tasks with optional filters.

**Parameters**:
- `planId` (string, optional) - Filter by plan ID
- `status` (enum: `'pending'` | `'in_progress'` | `'paused'` | `'completed'` | `'failed'`, optional) - Filter by status
- `agentConfigId` (string, optional) - Filter by agent config ID
- `startDate` (string, optional) - Filter by start date (ISO 8601)
- `endDate` (string, optional) - Filter by end date (ISO 8601)
- `limit` (number, optional, default: 50) - Maximum results
- `skip` (number, optional, default: 0) - Number to skip

### `summarize_task`

Generate an intelligent, first-person conversational markdown summary of task execution.

**Parameters**:
- `taskId` (string, required) - Task ID to summarize
- `format` (enum: `'brief'` | `'detailed'` | `'technical'`, optional, default: `'detailed'`) - Summary format
- `includeInsights` (boolean, optional, default: `true`) - Include insights and patterns
- `includeRecommendations` (boolean, optional, default: `true`) - Include recommendations

**Example**:
```json
{
  "name": "summarize_task",
  "arguments": {
    "taskId": "task-id",
    "format": "detailed",
    "includeInsights": true,
    "includeRecommendations": true
  }
}
```

**Response**: Markdown-formatted summary with insights and recommendations.

---

## 4. Memory & Learning

Persistent memory system that learns from executions.

### `query_memory`

Query memory for relevant knowledge including patterns, tool memory, insights, and user preferences.

**Parameters**:
- `query` (string, required) - What to look for in memory
- `memoryTypes` (array, optional) - Filter by memory types: `['patterns', 'tool_memory', 'insights', 'preferences']`
- `context` (string, optional) - Context for filtering
- `limit` (number, optional, default: 10) - Max results per type

**Example**:
```json
{
  "name": "query_memory",
  "arguments": {
    "query": "create facility inspection",
    "memoryTypes": ["patterns", "tool_memory"],
    "limit": 5
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"patterns\":[{...}],\"toolMemory\":[{...}],\"insights\":[{...}],\"preferences\":[{...}]}"
  }]
}
```

**Use Cases**:
- Find successful patterns from past executions
- Get tool performance data
- Retrieve learned insights
- Access user preferences

### `get_memory_pattern`

Get a specific memory pattern by type and pattern string.

**Parameters**:
- `patternType` (enum: `'query_pattern'` | `'plan_pattern'` | `'tool_sequence'` | `'error_pattern'`, required) - Pattern type
- `pattern` (string, required) - Pattern string to match

**Example**:
```json
{
  "name": "get_memory_pattern",
  "arguments": {
    "patternType": "tool_sequence",
    "pattern": "get_facility -> create_inspection"
  }
}
```

### `store_insight`

Manually store an insight for agents.

**Parameters**:
- `insight` (string, required) - Human-readable insight
- `insightType` (enum: `'rule'` | `'optimization'` | `'warning'` | `'pattern'` | `'best_practice'`, required) - Insight type
- `confidence` (number, required, 0-1) - Confidence score
- `appliesTo` (object, optional) - Applicability:
  - `agents` (array of strings, optional) - Which agents this applies to
  - `contexts` (array of strings, optional) - When this applies
  - `conditions` (object, optional) - Conditions for applicability
- `evidence` (array, optional) - Evidence from executions
- `rule` (string, optional) - Machine-readable rule

**Example**:
```json
{
  "name": "store_insight",
  "arguments": {
    "insight": "Always validate facility ID before creating inspection",
    "insightType": "best_practice",
    "confidence": 0.9,
    "appliesTo": {
      "agents": ["planner", "executor"],
      "contexts": ["inspection_creation"]
    },
    "evidence": [{
      "taskId": "task-123",
      "description": "Failed task due to invalid facility ID"
    }]
  }
}
```

---

## 5. History & Query

Query past executions and learn from history.

### `get_similar_tasks`

Find past tasks with similar queries/goals using semantic similarity search.

**Parameters**:
- `query` (string, optional) - User query to match
- `goal` (string, optional) - Goal pattern to match
- `limit` (number, optional, default: 10) - Max results
- `status` (enum: `'completed'` | `'failed'`, optional) - Filter by status
- `minSimilarity` (number, optional, default: 0.7) - Min similarity score (0-1)

**Example**:
```json
{
  "name": "get_similar_tasks",
  "arguments": {
    "query": "create facility inspection",
    "limit": 5,
    "minSimilarity": 0.8
  }
}
```

**Response**: Returns tasks with similarity scores and execution metrics.

### `get_successful_plans`

Find plans that worked well for similar goals.

**Parameters**:
- `goal` (string, required) - Goal to match
- `limit` (number, optional, default: 5) - Max results
- `minSuccessRate` (number, optional, default: 0.8) - Min success rate (0-1)

### `get_tool_performance`

Get performance metrics for a specific tool.

**Parameters**:
- `toolName` (string, required) - Tool name
- `context` (string, optional) - Filter by context (e.g., "facility_management")

**Response**:
```json
{
  "toolName": "create_facility",
  "successRate": 0.95,
  "avgDuration": 234,
  "totalExecutions": 150,
  "commonErrors": [...],
  "recommendations": [...]
}
```

### `get_agent_insights`

Get learned insights from a specific agent type.

**Parameters**:
- `agentType` (enum: `'thought'` | `'planner'` | `'executor'`, required) - Agent type
- `insightType` (enum: `'patterns'` | `'optimizations'` | `'warnings'`, optional) - Filter by insight type
- `limit` (number, optional, default: 10) - Max results

### `learn_from_task`

Store learnings from a completed task.

**Parameters**:
- `taskId` (string, required) - Task ID
- `planId` (string, required) - Plan ID
- `status` (enum: `'completed'` | `'failed'`, required) - Task status
- `metrics` (object, required) - Success metrics:
  - `executionTime` (number, required) - Execution time in milliseconds
  - `stepsCompleted` (number, required) - Number of steps completed
  - `retries` (number, required) - Number of retries
  - `userInputsRequired` (number, required) - Number of user inputs required
- `insights` (array of strings, optional) - Key learnings from this execution

**Note**: This is typically called automatically after task completion, but can be called manually.

---

## 6. Smart Features

Intelligent decision-making capabilities.

### `predict_plan_quality`

Predict plan success probability before execution.

**Parameters**:
- `planId` (string, required) - Plan ID to predict quality for

**Example**:
```json
{
  "name": "predict_plan_quality",
  "arguments": {
    "planId": "plan-id"
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"prediction\":{\"successProbability\":0.85,\"confidence\":0.9,\"riskLevel\":\"low\",\"estimatedDuration\":5000,\"estimatedCost\":0.02},\"riskFactors\":[...],\"recommendations\":[...],\"shouldExecute\":true}"
  }]
}
```

**Use Cases**:
- Evaluate plan quality before execution
- Identify potential issues
- Get optimization recommendations
- Estimate costs and duration

### `get_tool_recommendations`

Get optimized tool recommendations for an action.

**Parameters**:
- `requiredAction` (string, required) - Action that needs to be performed
- `context` (string, optional) - Execution context
- `planId` (string, optional) - Optional plan ID for context

**Example**:
```json
{
  "name": "get_tool_recommendations",
  "arguments": {
    "requiredAction": "create a new facility",
    "context": "facility_management"
  }
}
```

**Response**: Ranked tool suggestions with confidence scores and performance data.

### `refine_plan`

Automatically improve a failed plan by analyzing the failure.

**Parameters**:
- `planId` (string, required) - Plan ID to refine
- `failureReason` (string, optional) - Optional failure reason for better refinement

**Example**:
```json
{
  "name": "refine_plan",
  "arguments": {
    "planId": "failed-plan-id",
    "failureReason": "Tool execution failed: Invalid facility ID"
  }
}
```

**Response**: Refined plan with improvements and modifications.

### `track_cost`

Track token usage and API costs for a task.

**Parameters**:
- `taskId` (string, required) - Task ID to track cost for

**Response**:
```json
{
  "taskId": "task-id",
  "tokenUsage": {
    "promptTokens": 1500,
    "completionTokens": 800,
    "totalTokens": 2300
  },
  "apiCalls": 5,
  "estimatedCost": 0.045,
  "breakdown": [...]
}
```

### `optimize_cost`

Optimize plan for cost efficiency.

**Parameters**:
- `planId` (string, required) - Plan ID to optimize cost for

**Response**: Optimized plan with cost savings estimate and recommendations.

---

## 7. Benchmarking

Performance tracking and quality assurance.

### `create_benchmark_test`

Create a new benchmark test definition.

**Parameters**:
- `name` (string, required) - Test name
- `description` (string, required) - Test description
- `query` (string, required) - User query to test
- `expectedOutcome` (object, required) - Expected outcome:
  - `type` (enum: `'success'` | `'failure'` | `'specific_output'`, required)
  - `expectedOutput` (any, optional) - Expected output for specific_output type
  - `expectedSteps` (array of strings, optional) - Expected step sequence
  - `maxDuration` (number, optional) - Maximum allowed duration in milliseconds
- `category` (string, required) - Test category (e.g., "crud", "complex", "error_handling")
- `tags` (array of strings, optional) - Test tags
- `priority` (enum: `'critical'` | `'high'` | `'medium'` | `'low'`, optional, default: `'medium'`) - Test priority

**Example**:
```json
{
  "name": "create_benchmark_test",
  "arguments": {
    "name": "Create Facility Test",
    "description": "Test creating a new facility",
    "query": "Create a facility named Test Facility",
    "expectedOutcome": {
      "type": "success",
      "maxDuration": 5000
    },
    "category": "crud",
    "tags": ["facility", "create"],
    "priority": "high"
  }
}
```

### `run_benchmark_test`

Execute a single benchmark test and collect metrics.

**Parameters**:
- `testId` (string, required) - Test ID to run
- `agentConfigId` (string, required) - Agent configuration ID
- `timeout` (number, optional, default: 30000) - Execution timeout in milliseconds

### `run_benchmark_suite`

Execute a suite of benchmark tests.

**Parameters**:
- `suiteId` (string, optional) - Suite ID to run
- `testIds` (array of strings, optional) - Test IDs to run (if suiteId not provided)
- `agentConfigId` (string, required) - Agent configuration ID
- `timeout` (number, optional, default: 30000) - Execution timeout per test
- `parallel` (boolean, optional, default: false) - Run tests in parallel
- `maxConcurrent` (number, optional, default: 1) - Max concurrent tests (if parallel)

### `detect_regressions`

Analyze recent benchmark runs for performance regressions.

**Parameters**:
- `testId` (string, optional) - Test ID to check (optional, checks all if not provided)
- `startDate` (string, optional) - Start date for time range (ISO 8601)
- `endDate` (string, optional) - End date for time range (ISO 8601)

### `get_performance_metrics`

Get performance metrics over time.

**Parameters**:
- `metricType` (enum: `'success_rate'` | `'avg_duration'` | `'token_usage'` | `'error_rate'`, required) - Metric type
- `period` (enum: `'hour'` | `'day'` | `'week'` | `'month'`, required) - Time period
- `startDate` (string, optional) - Start date (ISO 8601)
- `endDate` (string, optional) - End date (ISO 8601)

---

## 8. MCP Client Tools

Interact with remote MCP servers.

### `execute_mcp_tool`

Execute a tool on the remote MCP server.

**Parameters**:
- `toolName` (string, required) - Name of the tool to execute on the remote MCP server
- `arguments` (object, optional) - Arguments to pass to the remote tool

**Example**:
```json
{
  "name": "execute_mcp_tool",
  "arguments": {
    "toolName": "create_facility",
    "arguments": {
      "name": "Facility ABC",
      "location": "New York"
    }
  }
}
```

**Use Cases**:
- Execute tools from remote MCP servers
- Proxy tool calls through the server
- Integrate with external MCP services

---

## 9. MCP Resource Tools

Access resources from remote MCP servers.

### `list_mcp_resources`

List all resources from the remote MCP server.

**Parameters**: None

**Example**:
```json
{
  "name": "list_mcp_resources",
  "arguments": {}
}
```

### `read_mcp_resource`

Read/fetch a specific resource by URI from the remote MCP server.

**Parameters**:
- `uri` (string, required) - Resource URI to read from the remote MCP server

**Example**:
```json
{
  "name": "read_mcp_resource",
  "arguments": {
    "uri": "file:///path/to/file.txt"
  }
}
```

---

## 10. MCP Prompt Tools

Extract prompts from remote MCP servers.

### `extract_remote_prompt`

Extract and resolve a prompt from the remote MCP server with optional arguments.

**Parameters**:
- `name` (string, required) - Prompt name to retrieve from remote MCP server
- `arguments` (object, optional) - Arguments to pass to the prompt for resolution

**Example**:
```json
{
  "name": "extract_remote_prompt",
  "arguments": {
    "name": "facility_inspection_prompt",
    "arguments": {
      "facilityName": "Facility ABC"
    }
  }
}
```

---

## 11. Local Prompt Tools

Extract prompts from the local database.

### `extract_local_prompt`

Extract and resolve a prompt from the local database with optional arguments.

**Parameters**:
- `name` (string, required) - Prompt name to retrieve from local database
- `arguments` (object, optional) - Arguments to pass to the prompt for resolution

---

## 12. AI Call Tools

Direct AI model interaction.

### `execute_ai_call`

Execute an AI call using a stored agent configuration.

**Parameters**:
- `agentConfigId` (string, required) - Agent config ID
- `messages` (array, required) - Array of messages:
  - `role` (enum: `'system'` | `'user'` | `'assistant'`, required) - Message role
  - `content` (string, required) - Message content
- `temperature` (number, optional) - Temperature parameter for the model
- `maxTokens` (number, optional) - Maximum tokens in the response
- `topP` (number, optional) - Top-p parameter for the model
- `responseFormat` (object, optional) - Response format (JSON object)

**Example**:
```json
{
  "name": "execute_ai_call",
  "arguments": {
    "agentConfigId": "config-id",
    "messages": [
      {
        "role": "system",
        "content": "You are a helpful assistant."
      },
      {
        "role": "user",
        "content": "What is the capital of France?"
      }
    ],
    "temperature": 0.7,
    "maxTokens": 100
  }
}
```

**Use Cases**:
- Direct AI model calls
- Custom AI interactions
- Bypass agent system for simple queries

---

## 13. Model Management

Manage AI models and agent configurations.

### Available Model Tools

#### `add_available_model`

Add a new available model to the database.

**Parameters**:
- `provider` (string, required) - Provider name (e.g., "openai", "anthropic", "ollama")
- `modelName` (string, required) - Model name (e.g., "GPT-4", "Claude 3 Opus")
- `modelId` (string, required) - Model ID (e.g., "gpt-4", "claude-3-opus-20240229")

#### `get_available_model`

Get an available model by ID.

**Parameters**:
- `id` (string, required) - Available model ID

#### `list_available_models`

List all available models with optional filters.

**Parameters**:
- `provider` (string, optional) - Filter by provider

#### `update_available_model`

Update an available model.

**Parameters**:
- `id` (string, required) - Available model ID
- `provider` (string, optional) - New provider name
- `modelName` (string, optional) - New model name
- `modelId` (string, optional) - New model ID

#### `remove_available_model`

Remove an available model from database.

**Parameters**:
- `id` (string, required) - Available model ID

### Agent Config Tools

#### `add_agent_config`

Add a new agent config to the database.

**Parameters**:
- `availableModelId` (string, required) - Available model ID
- `apiKey` (string, required) - API key
- `maxTokenCount` (number, required) - Maximum token count
- `isEnabled` (boolean, optional, default: `true`) - Whether the config is enabled

#### `get_agent_config`

Get an agent config by ID.

**Parameters**:
- `id` (string, required) - Agent config ID

#### `list_agent_configs`

List all agent configs with optional filters.

**Parameters**:
- `isEnabled` (boolean, optional) - Filter by enabled status

#### `update_agent_config`

Update an agent config.

**Parameters**:
- `id` (string, required) - Agent config ID
- `availableModelId` (string, optional) - New available model ID
- `apiKey` (string, optional) - New API key
- `maxTokenCount` (number, optional) - New maximum token count
- `isEnabled` (boolean, optional) - New enabled status

#### `remove_agent_config`

Remove an agent config from database.

**Parameters**:
- `id` (string, required) - Agent config ID

---

## 14. Resource Management

Manage local resources (URIs, files, etc.).

### `add_resource`

Add a new resource to the database.

**Parameters**:
- `uri` (string, required) - Resource URI
- `name` (string, required) - Resource name
- `description` (string, optional) - Resource description
- `mimeType` (string, optional) - MIME type of resource
- `source` (enum: `'remote'` | `'local'`, optional, default: `'remote'`) - Source of the resource

### `get_resource`

Get a resource by URI.

**Parameters**:
- `uri` (string, required) - Resource URI

### `list_resources`

List all resources with optional filters.

**Parameters**:
- `source` (enum: `'remote'` | `'local'`, optional) - Filter by source

### `update_resource`

Update a resource.

**Parameters**:
- `uri` (string, required) - Resource URI
- `name` (string, optional) - New resource name
- `description` (string, optional) - New description
- `mimeType` (string, optional) - New MIME type
- `source` (enum, optional) - New source

### `remove_resource`

Remove a resource from database.

**Parameters**:
- `uri` (string, required) - Resource URI

---

## 15. Prompt Management

Manage prompts stored in the database.

### `add_prompt`

Add a new prompt to the database.

**Parameters**:
- `name` (string, required) - Prompt name
- `description` (string, required) - Prompt description (template)
- `arguments` (array, optional) - Prompt arguments schema:
  - `name` (string, required) - Argument name
  - `description` (string, optional) - Argument description
  - `required` (boolean, optional) - Whether argument is required
- `source` (enum: `'remote'` | `'local'`, optional, default: `'remote'`) - Source of the prompt

### `get_prompt`

Get a prompt by name.

**Parameters**:
- `name` (string, required) - Prompt name

### `list_prompts`

List all prompts with optional filters.

**Parameters**:
- `source` (enum: `'remote'` | `'local'`, optional) - Filter by source

### `update_prompt`

Update a prompt.

**Parameters**:
- `name` (string, required) - Prompt name
- `description` (string, optional) - New description
- `arguments` (array, optional) - New arguments schema
- `source` (enum, optional) - New source

### `remove_prompt`

Remove a prompt from database.

**Parameters**:
- `name` (string, required) - Prompt name

---

## 16. Request Management

Track and manage user requests.

### `add_request`

Add a new request to the database.

**Parameters**:
- `query` (string, required) - User's prompt
- `categories` (array of strings, required, min: 1) - Array of categories
- `version` (string, required) - Version identifier
- `tags` (array of strings, required, min: 1) - Array of tags

### `get_request`

Get a request by ID.

**Parameters**:
- `id` (string, required) - Request ID

### `list_requests`

List all requests with optional filters.

**Parameters**:
- `categories` (array of strings, optional) - Filter by categories
- `tags` (array of strings, optional) - Filter by tags
- `version` (string, optional) - Filter by version

### `update_request`

Update a request.

**Parameters**:
- `id` (string, required) - Request ID
- `query` (string, optional) - New user's prompt
- `categories` (array of strings, optional) - New categories
- `version` (string, optional) - New version
- `tags` (array of strings, optional) - New tags

### `remove_request`

Remove a request from database.

**Parameters**:
- `id` (string, required) - Request ID

---

## 17. Search & Discovery

Semantic search to find tools and prompts.

### `get_tool_for_user_prompt`

Get the best tool(s) for a user query using semantic search.

**Parameters**:
- `userPrompt` (string, required) - User query or request to find the best tool for
- `topK` (number, optional, default: 3) - Number of top tools to return

**Example**:
```json
{
  "name": "get_tool_for_user_prompt",
  "arguments": {
    "userPrompt": "create a new facility",
    "topK": 5
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"message\":\"Found 5 recommended tool(s)\",\"userPrompt\":\"...\",\"tools\":[{\"toolName\":\"create_facility\",\"description\":\"...\",\"similarityScore\":0.92,...}]}"
  }]
}
```

**Use Cases**:
- Discover relevant tools for a task
- Find tools by natural language description
- Get tool recommendations with similarity scores

### `get_prompt_for_user_prompt`

Get the best prompt(s) for a user query using semantic search.

**Parameters**:
- `userPrompt` (string, required) - User query or request to find the best prompt for
- `topK` (number, optional, default: 3) - Number of top prompts to return

---

## 18. Initialization

Database seeding and initialization.

### `init_tools`

Initialize database by fetching tools from remote MCP server and seeding local database.

**Parameters**:
- `force` (boolean, optional, default: `false`) - If true, update existing tools; if false, skip duplicates
- `source` (enum: `'remote'` | `'local'`, optional, default: `'remote'`) - Source to set for seeded tools

**Example**:
```json
{
  "name": "init_tools",
  "arguments": {
    "force": false,
    "source": "remote"
  }
}
```

**Response**:
```json
{
  "content": [{
    "type": "text",
    "text": "{\"message\":\"Initialization complete\",\"added\":45,\"skipped\":5,\"total\":50,\"embedded\":45}"
  }]
}
```

**What it does**:
1. Connects to remote MCP server (configured in `REMOTE_MCP_SERVER_URL`)
2. Fetches all available tools
3. Stores them in MongoDB
4. Generates embeddings for semantic search (if Pinecone configured)
5. Makes tools available for execution

**Use Cases**:
- Initial setup: Seed database with remote tools
- Updates: Refresh tools from remote server
- Migration: Move tools between environments

---

## Tool Response Format

All tools return responses in the following format:

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON stringified result"
      }
    ],
    "isError": false
  }
}
```

**Success Response**:
- `isError`: `false`
- `content[0].text`: JSON stringified result object

**Error Response**:
- `isError`: `true`
- `content[0].text`: Error message

**Parsing Results**:
```javascript
const result = await callTool('list_tools', {});
const tools = JSON.parse(result.content[0].text); // Parse JSON string
```

---

## Tool Categories Summary

| Category | Tools | Purpose |
|----------|-------|---------|
| Tool Management | 5 | CRUD operations for tools |
| Agent System | 4 | Thought, Plan, Task execution |
| Task Management | 3 | Task monitoring and summaries |
| Memory & Learning | 3 | Memory system, patterns, insights |
| History & Query | 5 | Query past executions |
| Smart Features | 5 | Quality, recommendations, optimization |
| Benchmarking | 5 | Performance testing and metrics |
| MCP Client | 1 | Remote tool execution |
| MCP Resources | 2 | Remote resource access |
| MCP Prompts | 1 | Remote prompt extraction |
| Local Prompts | 1 | Local prompt extraction |
| AI Calls | 1 | Direct AI model interaction |
| Model Management | 10 | Agent configs and available models |
| Resource Management | 5 | Local resource CRUD |
| Prompt Management | 5 | Local prompt CRUD |
| Request Management | 5 | Request tracking |
| Search & Discovery | 2 | Semantic search |
| Initialization | 1 | Database seeding |

**Total**: 100+ tools

---

## Common Patterns

### Pattern 1: Complete Workflow

```javascript
// 1. Generate thought
const thought = await callTool('generate_thoughts', {
  userQuery: 'Create facility inspection',
  agentConfigId: 'config-id'
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

// 4. Monitor progress
const taskStatus = await callTool('get_task', {
  id: task.taskId
});
```

### Pattern 2: Tool Discovery

```javascript
// 1. Search for tools
const tools = await callTool('get_tool_for_user_prompt', {
  userPrompt: 'create a new facility',
  topK: 5
});

// 2. Use recommended tool
const result = await callTool(tools.tools[0].toolName, {
  name: 'Facility ABC',
  location: 'New York'
});
```

### Pattern 3: Memory Integration

```javascript
// 1. Query memory before execution
const memory = await callTool('query_memory', {
  query: 'create facility inspection',
  memoryTypes: ['patterns', 'tool_memory']
});

// 2. Use patterns in thought generation
const thought = await callTool('generate_thoughts', {
  userQuery: 'Create facility inspection',
  agentConfigId: 'config-id',
  // Memory patterns inform the thought generation
});
```

---

## Related Documentation

- **[API Protocol](./protocol.md)** - JSON-RPC 2.0 protocol details
- **[Request/Response Format](./requests-responses.md)** - Complete request/response documentation
- **[Error Handling](./error-handling.md)** - Error codes and handling
- **[Tool Management Guide](../features/tool-management.md)** - Detailed tool management guide
- **[Agent System](../features/agent-system.md)** - Agent architecture and usage

---

**Need help?** Check the [Examples](../examples/basic-workflow.md) or [Guides](../guides/task-executor.md) for practical usage examples.
