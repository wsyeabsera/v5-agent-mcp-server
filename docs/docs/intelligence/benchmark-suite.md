# Benchmark Suite

Comprehensive benchmarking system for performance tracking.

## Features

- Test definitions
- Test execution
- Performance metrics
- Regression detection

## Tools

### Create Benchmark Test

```javascript
await callTool('create_benchmark_test', {
  name: 'CRUD Operations',
  description: 'Test basic CRUD operations',
  query: 'Create, read, update, and delete a facility',
  expectedOutcome: {
    type: 'success',
    maxDuration: 5000
  },
  category: 'crud',
  priority: 'high'
});
```

### Run Benchmark Test

```javascript
const result = await callTool('run_benchmark_test', {
  testId: 'test-id',
  agentConfigId: 'config-id'
});
```

### Run Benchmark Suite

```javascript
const results = await callTool('run_benchmark_suite', {
  suiteId: 'suite-id',
  agentConfigId: 'config-id',
  parallel: false
});
```

### Detect Regressions

```javascript
const regressions = await callTool('detect_regressions', {
  testId: 'test-id'
});
```

### Get Performance Metrics

```javascript
const metrics = await callTool('get_performance_metrics', {
  metricType: 'success_rate',
  period: 'day'
});
```

## Test Suites

Standard test suites include:
- CRUD operations
- Complex workflows
- Error handling

