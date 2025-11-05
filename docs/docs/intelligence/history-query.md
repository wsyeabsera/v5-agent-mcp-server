# History Query System

Query past executions to learn from history.

## Features

- Find similar past tasks
- Get successful plan patterns
- Check tool performance
- Access agent insights

## Tools

### Get Similar Tasks

```javascript
const similarTasks = await callTool('get_similar_tasks', {
  query: 'create facility',
  limit: 10,
  minSimilarity: 0.7
});
```

### Get Successful Plans

```javascript
const plans = await callTool('get_successful_plans', {
  goal: 'create facility',
  limit: 5
});
```

### Get Tool Performance

```javascript
const performance = await callTool('get_tool_performance', {
  toolName: 'create_facility',
  context: 'facility_management'
});
```

### Get Agent Insights

```javascript
const insights = await callTool('get_agent_insights', {
  agentType: 'planner',
  insightType: 'optimizations'
});
```

## Use Cases

- Reference successful patterns
- Learn from failures
- Optimize tool selection
- Improve plan quality

