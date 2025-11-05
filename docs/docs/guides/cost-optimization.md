# Cost Optimization Guide

How to track and optimize costs.

## Tracking Costs

```javascript
const cost = await callTool('track_cost', {
  taskId: 'task-id'
});

// Returns:
// {
//   tokenUsage: { promptTokens, completionTokens, totalTokens },
//   cost: { amount, currency, model },
//   apiCalls: number
// }
```

## Optimizing Plans

```javascript
const optimized = await callTool('optimize_cost', {
  planId: 'plan-id'
});

// Returns optimized plan with cost savings estimate
```

## Best Practices

- Monitor costs regularly
- Use cost predictions before execution
- Optimize plans for cost efficiency
- Track costs per agent config
- Set cost budgets

## Cost Tracking Integration

Costs are automatically tracked after task completion. You can query them:

```javascript
const cost = await callTool('track_cost', {
  taskId: 'completed-task-id'
});
```

