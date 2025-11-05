# Smart Features

Intelligent decision-making features.

## Features

### Plan Quality Prediction
Predict plan success before execution.

```javascript
const prediction = await callTool('predict_plan_quality', {
  planId: 'plan-id'
});
```

### Tool Recommendations
Get optimized tool recommendations.

```javascript
const recommendations = await callTool('get_tool_recommendations', {
  requiredAction: 'create facility',
  context: 'facility_management'
});
```

### Plan Refinement
Automatically improve failed plans.

```javascript
const refinedPlan = await callTool('refine_plan', {
  planId: 'plan-id',
  failureReason: 'Tool not found'
});
```

### Cost Tracking
Track token usage and API costs.

```javascript
const cost = await callTool('track_cost', {
  taskId: 'task-id'
});
```

### Cost Optimization
Optimize plans for cost efficiency.

```javascript
const optimized = await callTool('optimize_cost', {
  planId: 'plan-id'
});
```

See [Intelligence Systems](../intelligence/smart-features.md) for details.

