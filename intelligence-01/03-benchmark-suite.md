# Benchmark Suite

## Overview
A comprehensive benchmarking system that tracks performance, measures success rates, detects regressions, and enables A/B testing. This ensures the system improves over time and maintains quality standards.

## Why This Matters
Currently, there's no systematic way to:
- Measure if changes improve or degrade performance
- Track success rates over time
- Compare different agent configurations
- Detect when new code breaks existing functionality
- Make data-driven decisions about improvements

With a benchmark suite:
- Continuous quality monitoring
- Regression detection
- Performance optimization
- Data-driven improvements
- Confidence in deployments

## Architecture

```
Test Suite
    ↓
Benchmark Runner
    ↓
Metrics Collection
    ↓
Performance Analysis
    ↓
Regression Detection
    ↓
Reporting Dashboard
```

## Core Components

### 1. Test Suite
Defines benchmark tests with expected outcomes

### 2. Benchmark Runner
Executes tests and collects metrics

### 3. Metrics Collector
Tracks performance, success rates, costs

### 4. Regression Detector
Identifies performance degradations

### 5. Reporting System
Generates reports and dashboards

## Data Models

### BenchmarkTest
```typescript
{
  testId: string;
  name: string;
  description: string;
  
  // Test definition
  test: {
    query: string; // User query
    expectedOutcome: {
      type: 'success' | 'failure' | 'specific_output';
      expectedOutput?: any; // For specific_output type
      expectedSteps?: string[]; // Expected step sequence
      maxDuration?: number; // Max allowed execution time
    };
    context?: Record<string, any>; // Additional context
  };
  
  // Categories
  category: string; // e.g., "crud", "complex", "error_handling"
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}
```

### BenchmarkRun
```typescript
{
  runId: string;
  testId: string;
  testName: string;
  
  // Execution details
  execution: {
    taskId: string;
    planId: string;
    thoughtId: string;
    agentConfigId: string;
    startedAt: Date;
    completedAt: Date;
    duration: number; // milliseconds
  };
  
  // Results
  result: {
    status: 'passed' | 'failed' | 'timeout' | 'error';
    actualOutput?: any;
    actualSteps?: string[];
    error?: string;
    matchesExpected: boolean;
  };
  
  // Metrics
  metrics: {
    executionTime: number;
    stepsCompleted: number;
    stepsExpected: number;
    retries: number;
    userInputsRequired: number;
    tokenUsage?: number;
    apiCalls?: number;
  };
  
  // Comparison
  baselineComparison?: {
    baselineRunId: string;
    performanceDelta: number; // % change
    statusChange: 'improved' | 'degraded' | 'same';
  };
  
  createdAt: Date;
}
```

### BenchmarkSuite
```typescript
{
  suiteId: string;
  name: string;
  description: string;
  
  // Test selection
  testIds: string[];
  filters?: {
    categories?: string[];
    tags?: string[];
    priority?: string[];
  };
  
  // Configuration
  config: {
    agentConfigId: string;
    timeout: number;
    parallel: boolean;
    maxConcurrent: number;
  };
  
  // Results
  results: {
    totalTests: number;
    passed: number;
    failed: number;
    timeout: number;
    error: number;
    avgDuration: number;
    successRate: number;
  };
  
  // Metadata
  createdAt: Date;
  completedAt?: Date;
  createdBy?: string;
}
```

### PerformanceMetrics
```typescript
{
  metricId: string;
  metricType: 'success_rate' | 'avg_duration' | 'token_usage' | 'error_rate';
  
  // Time series data
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    context?: Record<string, any>;
  }>;
  
  // Aggregates
  current: number;
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'degrading' | 'stable';
  
  // Period
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
}
```

### Regression
```typescript
{
  regressionId: string;
  testId: string;
  testName: string;
  
  // Detection
  detectedAt: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  
  // Comparison
  baseline: {
    runId: string;
    status: 'passed' | 'failed';
    duration: number;
    metrics: object;
  };
  
  current: {
    runId: string;
    status: 'passed' | 'failed';
    duration: number;
    metrics: object;
  };
  
  // Analysis
  delta: {
    statusChanged: boolean;
    durationDelta: number; // % change
    metricDeltas: Record<string, number>;
  };
  
  // Resolution
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
}
```

## Benchmark Tests

### Test Categories

#### 1. CRUD Operations
```typescript
{
  name: "Create Facility",
  query: "Create a new facility called Test Facility",
  expectedOutcome: {
    type: "success",
    expectedSteps: ["create_facility"]
  },
  category: "crud"
}
```

#### 2. Complex Workflows
```typescript
{
  name: "Create Shipment with Facility Lookup",
  query: "Create a shipment for facility HAN with license plate ABC123",
  expectedOutcome: {
    type: "success",
    expectedSteps: ["list_facilities", "create_shipment"],
    maxDuration: 5000
  },
  category: "complex"
}
```

#### 3. Error Handling
```typescript
{
  name: "Handle Invalid Facility ID",
  query: "Get facility with ID INVALID",
  expectedOutcome: {
    type: "failure",
    expectedOutput: { error: "Facility not found" }
  },
  category: "error_handling"
}
```

#### 4. User Input Handling
```typescript
{
  name: "Pause for User Input",
  query: "Create a shipment for facility HAN",
  expectedOutcome: {
    type: "specific_output",
    expectedOutput: { status: "paused", pendingUserInputs: true }
  },
  category: "user_interaction"
}
```

#### 5. Performance
```typescript
{
  name: "Fast Facility List",
  query: "List all facilities",
  expectedOutcome: {
    type: "success",
    maxDuration: 1000 // Must complete in < 1 second
  },
  category: "performance"
}
```

## Benchmark Runner

### Run Single Test
```typescript
async function runBenchmarkTest(
  test: BenchmarkTest,
  agentConfigId: string
): Promise<BenchmarkRun> {
  const startTime = Date.now();
  
  try {
    // Execute test
    const thought = await generateThoughts(test.test.query, agentConfigId);
    const plan = await generatePlan(thought.thoughtId, agentConfigId);
    const task = await executeTask(plan.planId, agentConfigId);
    
    // Wait for completion (with timeout)
    const result = await waitForCompletion(task.taskId, test.test.expectedOutcome.maxDuration);
    
    // Compare with expected
    const matchesExpected = compareWithExpected(result, test.test.expectedOutcome);
    
    // Collect metrics
    const metrics = await collectMetrics(task.taskId);
    
    return {
      testId: test.testId,
      testName: test.name,
      execution: {
        taskId: task.taskId,
        planId: plan.planId,
        thoughtId: thought.thoughtId,
        agentConfigId,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        duration: Date.now() - startTime
      },
      result: {
        status: matchesExpected ? 'passed' : 'failed',
        actualOutput: result.output,
        actualSteps: result.steps,
        matchesExpected
      },
      metrics
    };
  } catch (error) {
    return {
      // ... error handling
      result: {
        status: 'error',
        error: error.message,
        matchesExpected: false
      }
    };
  }
}
```

### Run Test Suite
```typescript
async function runBenchmarkSuite(
  suite: BenchmarkSuite
): Promise<BenchmarkSuite> {
  const results = {
    totalTests: suite.testIds.length,
    passed: 0,
    failed: 0,
    timeout: 0,
    error: 0,
    durations: [] as number[]
  };
  
  // Run tests (parallel or sequential)
  if (suite.config.parallel) {
    const promises = suite.testIds.map(testId => 
      runBenchmarkTest(testId, suite.config.agentConfigId)
    );
    const runs = await Promise.all(promises);
    
    // Process results
    for (const run of runs) {
      updateResults(results, run);
      await BenchmarkRun.create(run);
    }
  } else {
    // Sequential execution
    for (const testId of suite.testIds) {
      const run = await runBenchmarkTest(testId, suite.config.agentConfigId);
      updateResults(results, run);
      await BenchmarkRun.create(run);
    }
  }
  
  // Calculate aggregates
  suite.results = {
    ...results,
    avgDuration: results.durations.reduce((a, b) => a + b, 0) / results.durations.length,
    successRate: results.passed / results.totalTests
  };
  
  suite.completedAt = new Date();
  await suite.save();
  
  return suite;
}
```

## Regression Detection

### Detect Regressions
```typescript
async function detectRegressions(
  baselineSuiteId: string,
  currentSuiteId: string
): Promise<Regression[]> {
  const baseline = await BenchmarkSuite.findById(baselineSuiteId);
  const current = await BenchmarkSuite.findById(currentSuiteId);
  
  const regressions: Regression[] = [];
  
  // Compare each test
  for (const testId of baseline.testIds) {
    const baselineRun = await BenchmarkRun.findOne({
      testId,
      suiteId: baselineSuiteId
    }).sort({ createdAt: -1 });
    
    const currentRun = await BenchmarkRun.findOne({
      testId,
      suiteId: currentSuiteId
    }).sort({ createdAt: -1 });
    
    if (!baselineRun || !currentRun) continue;
    
    // Check for regression
    const regression = compareRuns(baselineRun, currentRun);
    if (regression) {
      regressions.push(regression);
      await Regression.create(regression);
    }
  }
  
  return regressions;
}

function compareRuns(baseline: BenchmarkRun, current: BenchmarkRun): Regression | null {
  // Check status change
  const statusChanged = 
    (baseline.result.status === 'passed' && current.result.status !== 'passed') ||
    (baseline.result.status === 'failed' && current.result.status === 'passed');
  
  // Check performance degradation
  const durationDelta = ((current.metrics.executionTime - baseline.metrics.executionTime) / baseline.metrics.executionTime) * 100;
  const performanceDegraded = durationDelta > 20; // > 20% slower
  
  if (statusChanged || performanceDegraded) {
    const severity = statusChanged ? 'critical' : durationDelta > 50 ? 'high' : 'medium';
    
    return {
      testId: baseline.testId,
      testName: baseline.testName,
      detectedAt: new Date(),
      severity,
      baseline: {
        runId: baseline.runId,
        status: baseline.result.status,
        duration: baseline.metrics.executionTime,
        metrics: baseline.metrics
      },
      current: {
        runId: current.runId,
        status: current.result.status,
        duration: current.metrics.executionTime,
        metrics: current.metrics
      },
      delta: {
        statusChanged,
        durationDelta,
        metricDeltas: calculateMetricDeltas(baseline.metrics, current.metrics)
      },
      resolved: false
    };
  }
  
  return null;
}
```

## Metrics Collection

### Track Performance Metrics
```typescript
async function trackPerformanceMetrics() {
  // Calculate success rate
  const recentRuns = await BenchmarkRun.find({
    createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });
  
  const successRate = recentRuns.filter(r => r.result.status === 'passed').length / recentRuns.length;
  
  // Calculate average duration
  const avgDuration = recentRuns.reduce((sum, r) => sum + r.metrics.executionTime, 0) / recentRuns.length;
  
  // Store metrics
  await PerformanceMetrics.create({
    metricType: 'success_rate',
    dataPoints: [{
      timestamp: new Date(),
      value: successRate
    }],
    current: successRate,
    average: await calculateAverage('success_rate'),
    trend: await calculateTrend('success_rate')
  });
}
```

## A/B Testing

### Compare Agent Configurations
```typescript
async function compareAgentConfigs(
  configA: string,
  configB: string,
  testSuiteId: string
): Promise<ComparisonResult> {
  // Run suite with config A
  const suiteA = await BenchmarkSuite.findById(testSuiteId);
  suiteA.config.agentConfigId = configA;
  const resultsA = await runBenchmarkSuite(suiteA);
  
  // Run suite with config B
  const suiteB = await BenchmarkSuite.findById(testSuiteId);
  suiteB.config.agentConfigId = configB;
  const resultsB = await runBenchmarkSuite(suiteB);
  
  // Compare
  return {
    configA: {
      id: configA,
      successRate: resultsA.results.successRate,
      avgDuration: resultsA.results.avgDuration
    },
    configB: {
      id: configB,
      successRate: resultsB.results.successRate,
      avgDuration: resultsB.results.avgDuration
    },
    winner: determineWinner(resultsA, resultsB),
    improvements: calculateImprovements(resultsA, resultsB)
  };
}
```

## Tools/APIs

### 1. run_benchmark_test
**Purpose**: Run a single benchmark test

**Input**:
```typescript
{
  testId: string;
  agentConfigId?: string; // Optional, uses default if not provided
}
```

**Output**:
```typescript
{
  runId: string;
  testId: string;
  result: {
    status: 'passed' | 'failed' | 'timeout' | 'error';
    matchesExpected: boolean;
    metrics: object;
  };
  duration: number;
}
```

### 2. run_benchmark_suite
**Purpose**: Run a full benchmark suite

**Input**:
```typescript
{
  suiteId?: string; // Optional, creates new suite
  testIds?: string[]; // Optional, for creating new suite
  agentConfigId?: string;
  parallel?: boolean;
}
```

**Output**:
```typescript
{
  suiteId: string;
  results: {
    totalTests: number;
    passed: number;
    failed: number;
    successRate: number;
    avgDuration: number;
  };
  runs: BenchmarkRun[];
}
```

### 3. detect_regressions
**Purpose**: Detect performance regressions

**Input**:
```typescript
{
  baselineSuiteId: string;
  currentSuiteId: string;
}
```

**Output**:
```typescript
{
  regressions: Regression[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

### 4. get_performance_metrics
**Purpose**: Get performance metrics over time

**Input**:
```typescript
{
  metricType?: 'success_rate' | 'avg_duration' | 'token_usage';
  period?: 'hour' | 'day' | 'week' | 'month';
  startDate?: Date;
  endDate?: Date;
}
```

**Output**:
```typescript
{
  metrics: PerformanceMetrics[];
  trends: {
    successRate: 'improving' | 'degrading' | 'stable';
    avgDuration: 'improving' | 'degrading' | 'stable';
  };
}
```

### 5. compare_configurations
**Purpose**: A/B test different agent configurations

**Input**:
```typescript
{
  configA: string;
  configB: string;
  testSuiteId: string;
}
```

**Output**:
```typescript
{
  comparison: ComparisonResult;
  recommendations: string[];
}
```

## Implementation Details

### Test Suite Definition

**Standard Test Suite** (runs on every commit):
- All CRUD operations
- Common workflows
- Error handling tests

**Performance Test Suite** (runs daily):
- Latency tests
- Throughput tests
- Stress tests

**Regression Test Suite** (runs on PRs):
- Critical path tests
- Recent bug fixes
- High-risk areas

### CI/CD Integration

```yaml
# .github/workflows/benchmark.yml
- name: Run Benchmarks
  run: |
    npm run benchmark:suite -- --suite=standard
    npm run benchmark:detect-regressions
```

### Database Schema

**BenchmarkTest Collection**:
- Index on: `category`, `tags`, `priority`

**BenchmarkRun Collection**:
- Index on: `testId`, `execution.taskId`, `createdAt`
- TTL index for cleanup (optional)

**PerformanceMetrics Collection**:
- Index on: `metricType`, `timestamp`
- Time series data structure

**Regression Collection**:
- Index on: `severity`, `resolved`, `detectedAt`

### Reporting Dashboard

**Metrics Dashboard**:
- Success rate over time
- Average duration trends
- Error rate trends
- Token usage trends

**Regression Dashboard**:
- Active regressions
- Regression history
- Resolution tracking

**Test Results Dashboard**:
- Latest test results
- Test history
- Pass/fail trends

## Success Metrics

- **Test Coverage**: % of features covered by tests
- **Regression Detection Time**: Time to detect regressions
- **False Positive Rate**: % of false regression alerts
- **CI/CD Integration**: Automatic benchmark runs
- **Performance Improvement**: Measured improvements over time

## Future Enhancements

1. **Fuzzy Testing**: Generate random test cases
2. **Load Testing**: Test under high load
3. **Chaos Testing**: Test failure scenarios
4. **Multi-Environment Testing**: Test across environments
5. **Automated Fix Suggestions**: AI-powered fix recommendations

