import { z } from 'zod';

// Create benchmark test input schema
export const createBenchmarkTestSchema = z.object({
  name: z.string().describe('Test name'),
  description: z.string().describe('Test description'),
  query: z.string().describe('User query to test'),
  expectedOutcome: z.object({
    type: z.enum(['success', 'failure', 'specific_output']).describe('Expected outcome type'),
    expectedOutput: z.any().optional().describe('Expected output for specific_output type'),
    expectedSteps: z.array(z.string()).optional().describe('Expected step sequence'),
    maxDuration: z.number().optional().describe('Maximum allowed duration in milliseconds'),
  }).describe('Expected outcome'),
  category: z.string().describe('Test category (e.g., crud, complex, error_handling)'),
  tags: z.array(z.string()).optional().describe('Test tags'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().default('medium').describe('Test priority'),
});

// Run benchmark test input schema
export const runBenchmarkTestSchema = z.object({
  testId: z.string().describe('Test ID to run'),
  agentConfigId: z.string().describe('Agent configuration ID'),
  timeout: z.number().optional().default(30000).describe('Execution timeout in milliseconds'),
});

// Run benchmark suite input schema
export const runBenchmarkSuiteSchema = z.object({
  suiteId: z.string().optional().describe('Suite ID to run'),
  testIds: z.array(z.string()).optional().describe('Test IDs to run (if suiteId not provided)'),
  agentConfigId: z.string().describe('Agent configuration ID'),
  timeout: z.number().optional().default(30000).describe('Execution timeout per test'),
  parallel: z.boolean().optional().default(false).describe('Run tests in parallel'),
  maxConcurrent: z.number().optional().default(1).describe('Max concurrent tests (if parallel)'),
});

// Detect regressions input schema
export const detectRegressionsSchema = z.object({
  testId: z.string().optional().describe('Test ID to check (optional, checks all if not provided)'),
  startDate: z.string().optional().describe('Start date for time range (ISO 8601)'),
  endDate: z.string().optional().describe('End date for time range (ISO 8601)'),
});

// Get performance metrics input schema
export const getPerformanceMetricsSchema = z.object({
  metricType: z.enum(['success_rate', 'avg_duration', 'token_usage', 'error_rate']).describe('Metric type'),
  period: z.enum(['hour', 'day', 'week', 'month']).describe('Time period'),
  startDate: z.string().optional().describe('Start date (ISO 8601)'),
  endDate: z.string().optional().describe('End date (ISO 8601)'),
});

// List benchmark tests input schema
export const listBenchmarkTestsSchema = z.object({
  category: z.string().optional().describe('Filter by category'),
  tags: z.array(z.string()).optional().describe('Filter by tags (all tags must match)'),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Filter by priority'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Get benchmark test input schema
export const getBenchmarkTestSchema = z.object({
  testId: z.string().describe('Test ID'),
});

// List benchmark runs input schema
export const listBenchmarkRunsSchema = z.object({
  testId: z.string().optional().describe('Filter by test ID'),
  status: z.enum(['passed', 'failed', 'timeout', 'error']).optional().describe('Filter by status'),
  agentConfigId: z.string().optional().describe('Filter by agent config ID'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Get benchmark run input schema
export const getBenchmarkRunSchema = z.object({
  runId: z.string().describe('Run ID'),
});

// List benchmark suites input schema
export const listBenchmarkSuitesSchema = z.object({
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Get benchmark suite input schema
export const getBenchmarkSuiteSchema = z.object({
  suiteId: z.string().describe('Suite ID'),
});

// List regressions input schema
export const listRegressionsSchema = z.object({
  testId: z.string().optional().describe('Filter by test ID'),
  severity: z.enum(['critical', 'high', 'medium', 'low']).optional().describe('Filter by severity'),
  resolved: z.boolean().optional().describe('Filter by resolved status'),
  startDate: z.string().optional().describe('Filter by start date (ISO 8601 format)'),
  endDate: z.string().optional().describe('Filter by end date (ISO 8601 format)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

// Get regression input schema
export const getRegressionSchema = z.object({
  regressionId: z.string().describe('Regression ID'),
});

