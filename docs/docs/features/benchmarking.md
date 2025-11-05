# Benchmarking

Performance tracking and quality assurance.

## Features

- Test definitions and execution
- Performance metrics tracking
- Regression detection
- A/B testing support

## Tools

### Create Benchmark Test

```javascript
await callTool('create_benchmark_test', {
  name: 'Test Name',
  description: 'Test description',
  query: 'User query',
  expectedOutcome: {
    type: 'success'
  },
  category: 'crud'
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
  agentConfigId: 'config-id'
});
```

### Detect Regressions

```javascript
const regressions = await callTool('detect_regressions', {
  testId: 'test-id'
});
```

See [Benchmark Suite](../intelligence/benchmark-suite.md) for details.

