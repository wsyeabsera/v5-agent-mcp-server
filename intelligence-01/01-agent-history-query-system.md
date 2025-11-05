# Agent History Query System

## Overview
Enable agents (Thought, Planner, Task Executor) to query and learn from past executions. This allows agents to see what worked before, avoid past mistakes, and build on successful patterns.

## Why This Matters
Currently, each task execution starts from scratch. Agents have no memory of:
- Similar queries that were successfully handled
- Plans that worked well for specific goal types
- Tools that perform well in certain contexts
- Common failure patterns and solutions

With this system, agents can:
- Reference successful past executions
- Learn from failures
- Identify patterns and best practices
- Make more informed decisions

## Architecture

```
User Query
    ↓
Thought Agent → [Queries: get_similar_tasks, get_successful_plans]
    ↓
Planner Agent → [Queries: get_tool_performance, get_plan_patterns]
    ↓
Task Executor → [Stores: execution results, metrics]
    ↓
Memory System (learns from outcomes)
```

## Data Models

### TaskSimilarity
```typescript
{
  taskId: string;
  originalQuery: string;
  goal: string;
  planId: string;
  status: 'completed' | 'failed' | 'paused';
  successMetrics: {
    executionTime: number;
    stepsCompleted: number;
    retries: number;
    userInputsRequired: number;
  };
  createdAt: Date;
}
```

### PlanPattern
```typescript
{
  patternId: string;
  goalPattern: string; // e.g., "create_*_for_facility_*"
  stepSequence: string[]; // e.g., ["list_facilities", "create_shipment"]
  successRate: number; // 0-1
  avgExecutionTime: number;
  commonIssues: string[];
  createdAt: Date;
  lastUsed: Date;
  usageCount: number;
}
```

### ToolPerformance
```typescript
{
  toolName: string;
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  commonErrors: Array<{
    error: string;
    frequency: number;
    context: string;
  }>;
  optimalContext: string[]; // When this tool works best
  lastUpdated: Date;
}
```

## Tools/APIs

### 1. get_similar_tasks
**Purpose**: Find past tasks with similar queries/goals

**Input**:
```typescript
{
  query?: string; // User query to match
  goal?: string; // Goal pattern to match
  limit?: number; // Max results (default: 10)
  status?: 'completed' | 'failed'; // Filter by status
  minSimilarity?: number; // Min similarity score (0-1, default: 0.7)
}
```

**Output**:
```typescript
{
  tasks: Array<{
    taskId: string;
    query: string;
    goal: string;
    status: string;
    similarity: number; // 0-1
    executionTime: number;
    successMetrics: object;
    createdAt: Date;
  }>;
  count: number;
}
```

**Implementation**:
- Use vector embeddings to find semantically similar queries
- Use keyword matching for goal patterns
- Combine scores and rank by relevance

### 2. get_successful_plans
**Purpose**: Find plans that worked well for similar goals

**Input**:
```typescript
{
  goal: string; // Goal to match
  limit?: number; // Max results (default: 5)
  minSuccessRate?: number; // Min success rate (0-1, default: 0.8)
}
```

**Output**:
```typescript
{
  plans: Array<{
    planId: string;
    goal: string;
    steps: Array<{
      id: string;
      action: string;
      order: number;
    }>;
    successRate: number;
    avgExecutionTime: number;
    usageCount: number;
    lastUsed: Date;
  }>;
  count: number;
}
```

**Implementation**:
- Match goal patterns (semantic similarity)
- Filter by success rate
- Rank by usage count and recency

### 3. get_tool_performance
**Purpose**: Get performance metrics for a specific tool

**Input**:
```typescript
{
  toolName: string;
  context?: string; // Filter by context (e.g., "facility_management")
}
```

**Output**:
```typescript
{
  toolName: string;
  totalExecutions: number;
  successRate: number; // 0-1
  avgDuration: number; // milliseconds
  successCount: number;
  failureCount: number;
  commonErrors: Array<{
    error: string;
    frequency: number;
    percentage: number;
    context: string;
  }>;
  optimalContext: string[]; // When tool works best
  recommendations: string[]; // Suggestions for usage
}
```

**Implementation**:
- Aggregate from execution history
- Calculate success rates
- Identify common errors
- Analyze context patterns

### 4. get_agent_insights
**Purpose**: Get learned insights from a specific agent

**Input**:
```typescript
{
  agentType: 'thought' | 'planner' | 'executor';
  insightType?: 'patterns' | 'optimizations' | 'warnings';
  limit?: number;
}
```

**Output**:
```typescript
{
  insights: Array<{
    type: string;
    insight: string;
    confidence: number; // 0-1
    evidence: Array<{
      taskId: string;
      description: string;
    }>;
    createdAt: Date;
    lastValidated: Date;
  }>;
}
```

**Implementation**:
- Query memory system for agent-specific insights
- Filter by type and confidence
- Include evidence from past executions

### 5. learn_from_task
**Purpose**: Store learnings from a completed task (internal tool)

**Input**:
```typescript
{
  taskId: string;
  planId: string;
  status: 'completed' | 'failed';
  metrics: {
    executionTime: number;
    stepsCompleted: number;
    retries: number;
    userInputsRequired: number;
  };
  insights: string[]; // Key learnings from this execution
}
```

**Output**:
```typescript
{
  success: boolean;
  patternsLearned: number;
  insightsStored: number;
}
```

**Implementation**:
- Extract patterns from plan steps
- Update tool performance metrics
- Store insights in memory system
- Update plan pattern success rates

## Implementation Details

### Database Schema

**TaskSimilarity Collection**:
- Index on: `originalQuery` (text), `goal` (text), `status`, `createdAt`
- Store embeddings for similarity search

**PlanPattern Collection**:
- Index on: `goalPattern` (text), `successRate`, `usageCount`
- Automatically extract patterns from successful plans

**ToolPerformance Collection**:
- Index on: `toolName`, `lastUpdated`
- Aggregated view of execution history

**AgentInsight Collection**:
- Index on: `agentType`, `type`, `confidence`
- Stores learned insights with evidence

### Integration Points

1. **After Task Completion**:
   - Automatically call `learn_from_task` to store learnings
   - Update tool performance metrics
   - Extract and store patterns

2. **Thought Agent**:
   - Query `get_similar_tasks` before generating thoughts
   - Use past successful patterns to inform reasoning

3. **Planner Agent**:
   - Query `get_successful_plans` for similar goals
   - Query `get_tool_performance` to choose optimal tools
   - Reference `get_agent_insights` for warnings/optimizations

4. **Task Executor**:
   - Track tool performance in real-time
   - Store execution metrics for learning

### Similarity Search

**For Query Matching**:
- Use sentence embeddings (similar to tool search)
- Calculate cosine similarity
- Combine with keyword matching for hybrid search

**For Goal Pattern Matching**:
- Extract patterns: `create_*_for_*`, `list_*_in_*`
- Use regex/template matching
- Score by pattern match + semantic similarity

### Performance Considerations

- Cache frequently accessed patterns
- Pre-compute aggregations for tool performance
- Use background jobs for pattern extraction
- Limit query results to prevent overload

## Example Usage

### Thought Agent Querying History
```typescript
// Before generating thoughts
const similarTasks = await get_similar_tasks({
  query: "Create a shipment for facility HAN",
  limit: 5,
  status: "completed"
});

// Use insights: "Similar queries used facility lookup first"
```

### Planner Agent Querying History
```typescript
// Before generating plan
const successfulPlans = await get_successful_plans({
  goal: "Create shipment for facility",
  minSuccessRate: 0.8
});

const toolPerformance = await get_tool_performance({
  toolName: "create_shipment",
  context: "facility_management"
});

// Use: "Tool performs best with facilityId as ObjectId, not shortCode"
```

### Learning After Task Completion
```typescript
// After task completes
await learn_from_task({
  taskId: "690b...",
  planId: "690c...",
  status: "completed",
  metrics: {
    executionTime: 1200,
    stepsCompleted: 2,
    retries: 0,
    userInputsRequired: 0
  },
  insights: [
    "Facility lookup before shipment creation works well",
    "Using ObjectId format for facilityId prevents errors"
  ]
});
```

## Success Metrics

- **Agent Decision Quality**: Improvement in plan success rate
- **Query Response Time**: Faster decisions with cached patterns
- **Error Reduction**: Fewer failures due to learned patterns
- **Tool Optimization**: Better tool selection based on performance

## Future Enhancements

1. **Collaborative Learning**: Agents share insights with each other
2. **Predictive Analytics**: Predict task success before execution
3. **A/B Testing**: Compare different approaches automatically
4. **User Preference Learning**: Learn from user corrections/feedback

