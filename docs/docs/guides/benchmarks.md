# Benchmarks Guide

How to create and run benchmarks.

## Creating a Benchmark Test

```javascript
const test = await callTool('create_benchmark_test', {
  name: 'CRUD Test',
  description: 'Test basic CRUD operations',
  query: 'Create, read, update, and delete a facility',
  expectedOutcome: {
    type: 'success',
    maxDuration: 5000
  },
  category: 'crud',
  tags: ['basic', 'crud'],
  priority: 'high'
});
```

## Running a Test

```javascript
const result = await callTool('run_benchmark_test', {
  testId: test._id,
  agentConfigId: 'config-id',
  timeout: 30000
});
```

## Running a Suite

```javascript
const results = await callTool('run_benchmark_suite', {
  suiteId: 'suite-id',
  agentConfigId: 'config-id',
  parallel: false
});
```

## Detecting Regressions

```javascript
const regressions = await callTool('detect_regressions', {
  testId: 'test-id'
});
```

## Performance Metrics

```javascript
const metrics = await callTool('get_performance_metrics', {
  metricType: 'success_rate',
  period: 'day',
  startDate: '2024-01-01T00:00:00Z'
});
```

