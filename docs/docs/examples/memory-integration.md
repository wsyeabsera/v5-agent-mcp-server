# Memory Integration Example

Using the memory system to improve task execution with learned patterns and insights.

## Overview

This example demonstrates:
- Querying memory for patterns
- Using memory in thought generation
- Leveraging tool performance data
- Learning from executions

## Example: Leveraging Memory Patterns

### Step 1: Query Memory Before Execution

```javascript
// Query memory for similar patterns
const memory = await callTool('query_memory', {
  query: 'create facility inspection',
  memoryTypes: ['patterns', 'tool_memory'],
  limit: 5
});

console.log('Found patterns:', memory.patterns.length);
console.log('Tool performance data:', memory.toolMemory);
```

### Step 2: Use Memory in Thought Generation

The memory system automatically informs thought generation:

```javascript
const thought = await callTool('generate_thoughts', {
  userQuery: 'Create an inspection for facility ABC123',
  agentConfigId: 'config-id',
  enableToolSearch: true
  // Memory is automatically queried by the system
});

// The thought will include recommended tools based on past performance
console.log('Recommended tools:', thought.recommendedTools);
```

### Step 3: Get Tool Recommendations

```javascript
// Get smart tool recommendations
const recommendations = await callTool('get_tool_recommendations', {
  requiredAction: 'create facility inspection',
  context: 'facility_management'
});

console.log('Recommended tools:', recommendations.tools);
console.log('Confidence scores:', recommendations.tools.map(t => t.confidence));
```

### Step 4: Execute and Learn

```javascript
// Execute task
const task = await callTool('execute_task', {
  planId: plan._id,
  agentConfigId: 'config-id'
});

// After completion, system automatically learns from execution
// You can also manually store insights
await callTool('store_insight', {
  insight: 'Always validate facility ID before creating inspection',
  insightType: 'best_practice',
  confidence: 0.9,
  appliesTo: {
    agents: ['planner', 'executor'],
    contexts: ['inspection_creation']
  }
});
```

## Complete Example

```javascript
async function memoryIntegratedWorkflow() {
  try {
    // 1. Query memory for patterns
    const memory = await callTool('query_memory', {
      query: 'create facility inspection',
      memoryTypes: ['patterns', 'tool_memory', 'insights']
    });

    console.log('Memory patterns found:', memory.patterns.length);

    // 2. Generate thought (memory-aware)
    const thought = await callTool('generate_thoughts', {
      userQuery: 'Create an inspection for facility ABC123',
      agentConfigId: 'config-id',
      enableToolSearch: true
    });

    // 3. Get tool recommendations
    const recommendations = await callTool('get_tool_recommendations', {
      requiredAction: 'create facility inspection'
    });

    // 4. Create plan
    const plan = await callTool('generate_plan', {
      thoughtId: thought._id,
      agentConfigId: 'config-id'
    });

    // 5. Execute
    const task = await callTool('execute_task', {
      planId: plan._id,
      agentConfigId: 'config-id'
    });

    // 6. Wait for completion
    let taskStatus;
    do {
      await new Promise(resolve => setTimeout(resolve, 1000));
      taskStatus = await callTool('get_task', { id: task.taskId });
    } while (['pending', 'in_progress'].includes(taskStatus.status));

    // 7. System automatically learns from execution
    // Memory patterns are updated automatically

    return taskStatus;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
```

## Finding Similar Past Tasks

```javascript
// Find similar completed tasks
const similarTasks = await callTool('get_similar_tasks', {
  query: 'create facility inspection',
  limit: 5,
  status: 'completed',
  minSimilarity: 0.8
});

console.log('Similar tasks:', similarTasks.tasks);
```

## Using Memory Patterns Directly

```javascript
// Get a specific pattern
const pattern = await callTool('get_memory_pattern', {
  patternType: 'tool_sequence',
  pattern: 'get_facility -> create_inspection'
});

if (pattern) {
  console.log('Pattern success rate:', pattern.successMetrics.successRate);
  console.log('Evidence:', pattern.evidence);
}
```

## Next Steps

- [Memory System Guide](../intelligence/memory-system.md) - Deep dive into memory
- [Pattern Recognition](../intelligence/pattern-recognition.md) - Pattern extraction

