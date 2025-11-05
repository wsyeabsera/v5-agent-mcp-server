import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  createBenchmarkTestSchema,
  runBenchmarkTestSchema,
  runBenchmarkSuiteSchema,
  detectRegressionsSchema,
  getPerformanceMetricsSchema,
  listBenchmarkTestsSchema,
  getBenchmarkTestSchema,
  listBenchmarkRunsSchema,
  getBenchmarkRunSchema,
  listBenchmarkSuitesSchema,
  getBenchmarkSuiteSchema,
  listRegressionsSchema,
  getRegressionSchema,
} from './schemas/benchmarkSchemas.js';
import {
  BenchmarkTest,
  BenchmarkRun,
  BenchmarkSuite,
  Regression,
  PerformanceMetrics,
} from '../models/index.js';
import { executeTest, executeSuite, detectRegressions as detectRegressionsUtil } from '../utils/benchmarkRunner.js';
import { getAllStandardTestSuites } from '../utils/testSuites.js';
import mongoose from 'mongoose';

// ========== Benchmark Tools ==========
export const benchmarkTools = {
  create_benchmark_test: {
    description:
      'Create a new benchmark test definition with query, expected outcome, category, and tags.',
    inputSchema: zodToJsonSchema(createBenchmarkTestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof createBenchmarkTestSchema>) => {
      try {
        const validatedArgs = createBenchmarkTestSchema.parse(args);
        const { name, description, query, expectedOutcome, category, tags = [], priority = 'medium' } = validatedArgs;

        logger.info(`[create_benchmark_test] Creating test: ${name}`);

        const testId = `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const test = await BenchmarkTest.create({
          testId,
          name,
          description,
          test: {
            query,
            expectedOutcome,
            context: {},
          },
          category,
          tags,
          priority,
        });

        return createSuccessResponse({
          testId: test.testId,
          message: 'Benchmark test created successfully',
        });
      } catch (error: any) {
        logger.error('[create_benchmark_test] Error:', error);
        return handleToolError(error, 'creating benchmark test');
      }
    },
  },

  run_benchmark_test: {
    description:
      'Execute a single benchmark test and collect metrics. Returns execution results, metrics, and comparison with expected outcome.',
    inputSchema: zodToJsonSchema(runBenchmarkTestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof runBenchmarkTestSchema>) => {
      try {
        const validatedArgs = runBenchmarkTestSchema.parse(args);
        const { testId, agentConfigId, timeout = 30000 } = validatedArgs;

        logger.info(`[run_benchmark_test] Running test: ${testId}`);

        const result = await executeTest(testId, agentConfigId, timeout);

        return createSuccessResponse({
          ...result,
          message: `Benchmark test ${result.status}`,
        });
      } catch (error: any) {
        logger.error('[run_benchmark_test] Error:', error);
        return handleToolError(error, 'running benchmark test');
      }
    },
  },

  run_benchmark_suite: {
    description:
      'Execute a suite of benchmark tests. Can run tests in parallel or sequentially. Returns aggregated results and summary metrics.',
    inputSchema: zodToJsonSchema(runBenchmarkSuiteSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof runBenchmarkSuiteSchema>) => {
      try {
        const validatedArgs = runBenchmarkSuiteSchema.parse(args);
        const { suiteId, testIds, agentConfigId, timeout = 30000, parallel = false, maxConcurrent = 1 } = validatedArgs;

        logger.info(`[run_benchmark_suite] Running suite: ${suiteId || 'custom'}`);

        let testsToRun: string[] = [];

        if (suiteId) {
          const suite = await BenchmarkSuite.findOne({ suiteId });
          if (!suite) {
            return createErrorResponse(`Suite not found: ${suiteId}`);
          }
          testsToRun = suite.testIds;
        } else if (testIds && testIds.length > 0) {
          testsToRun = testIds;
        } else {
          return createErrorResponse('Either suiteId or testIds must be provided');
        }

        const result = await executeSuite(testsToRun, agentConfigId, {
          timeout,
          parallel,
          maxConcurrent,
        });

        // Store suite results
        const suiteIdToStore = suiteId || `suite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        await BenchmarkSuite.findOneAndUpdate(
          { suiteId: suiteIdToStore },
          {
            suiteId: suiteIdToStore,
            name: suiteId ? undefined : 'Custom Suite',
            testIds: testsToRun,
            config: {
              agentConfigId,
              timeout,
              parallel,
              maxConcurrent,
            },
            results: result.summary,
            completedAt: new Date(),
          },
          { upsert: true }
        );

        return createSuccessResponse({
          ...result,
          suiteId: suiteIdToStore,
          message: 'Benchmark suite executed successfully',
        });
      } catch (error: any) {
        logger.error('[run_benchmark_suite] Error:', error);
        return handleToolError(error, 'running benchmark suite');
      }
    },
  },

  detect_regressions: {
    description:
      'Analyze recent benchmark runs for performance regressions. Detects status changes, performance degradations, and calculates deltas.',
    inputSchema: zodToJsonSchema(detectRegressionsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof detectRegressionsSchema>) => {
      try {
        const validatedArgs = detectRegressionsSchema.parse(args);
        const { testId, startDate, endDate } = validatedArgs;

        logger.info(`[detect_regressions] Detecting regressions for test: ${testId || 'all'}`);

        const timeRange = startDate && endDate
          ? { start: new Date(startDate), end: new Date(endDate) }
          : undefined;

        const regressions = await detectRegressionsUtil(testId, timeRange);

        // Store detected regressions
        for (const regression of regressions) {
          await Regression.findOneAndUpdate(
            { regressionId: regression.regressionId },
            regression,
            { upsert: true }
          );
        }

        return createSuccessResponse({
          count: regressions.length,
          regressions,
          message: `Detected ${regressions.length} regression(s)`,
        });
      } catch (error: any) {
        logger.error('[detect_regressions] Error:', error);
        return handleToolError(error, 'detecting regressions');
      }
    },
  },

  get_performance_metrics: {
    description:
      'Get performance metrics over time including success rates, average duration, token usage, and error rates. Returns time series data with trends.',
    inputSchema: zodToJsonSchema(getPerformanceMetricsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getPerformanceMetricsSchema>) => {
      try {
        const validatedArgs = getPerformanceMetricsSchema.parse(args);
        const { metricType, period, startDate, endDate } = validatedArgs;

        logger.info(`[get_performance_metrics] Getting metrics: ${metricType} for period: ${period}`);

        const start = startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
        const end = endDate ? new Date(endDate) : new Date();

        // Aggregate metrics from benchmark runs
        const runs = await BenchmarkRun.find({
          createdAt: { $gte: start, $lte: end },
        }).lean();

        if (runs.length === 0) {
          return createSuccessResponse({
            metricType,
            period,
            dataPoints: [],
            current: 0,
            average: 0,
            min: 0,
            max: 0,
            trend: 'stable',
            message: 'No data available for the specified period',
          });
        }

        // Calculate metrics based on type
        const dataPoints: Array<{ timestamp: Date; value: number }> = [];
        let values: number[] = [];

        for (const run of runs) {
          let value = 0;

          switch (metricType) {
            case 'success_rate':
              value = run.result.status === 'passed' ? 1 : 0;
              break;
            case 'avg_duration':
              value = run.metrics.executionTime;
              break;
            case 'token_usage':
              value = run.metrics.tokenUsage || 0;
              break;
            case 'error_rate':
              value = run.result.status === 'error' ? 1 : 0;
              break;
          }

          dataPoints.push({
            timestamp: run.createdAt,
            value,
          });
          values.push(value);
        }

        // Calculate aggregates
        const current = values[values.length - 1] || 0;
        const average = values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
        const min = values.length > 0 ? Math.min(...values) : 0;
        const max = values.length > 0 ? Math.max(...values) : 0;

        // Calculate trend (simplified)
        const firstHalf = values.slice(0, Math.floor(values.length / 2));
        const secondHalf = values.slice(Math.floor(values.length / 2));
        const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length : 0;
        const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length : 0;
        
        let trend: 'improving' | 'degrading' | 'stable' = 'stable';
        if (metricType === 'success_rate' || metricType === 'error_rate') {
          trend = secondAvg > firstAvg * 1.1 ? 'improving' : secondAvg < firstAvg * 0.9 ? 'degrading' : 'stable';
        } else {
          // For duration and token usage, lower is better
          trend = secondAvg < firstAvg * 0.9 ? 'improving' : secondAvg > firstAvg * 1.1 ? 'degrading' : 'stable';
        }

        const metricId = `metric_${metricType}_${period}_${start.getTime()}_${end.getTime()}`;

        // Store metrics
        await PerformanceMetrics.findOneAndUpdate(
          { metricId },
          {
            metricId,
            metricType,
            dataPoints,
            current,
            average,
            min,
            max,
            trend,
            period,
            startDate: start,
            endDate: end,
          },
          { upsert: true }
        );

        return createSuccessResponse({
          metricType,
          period,
          dataPoints,
          current,
          average,
          min,
          max,
          trend,
          startDate: start,
          endDate: end,
          message: 'Performance metrics retrieved successfully',
        });
      } catch (error: any) {
        logger.error('[get_performance_metrics] Error:', error);
        return handleToolError(error, 'getting performance metrics');
      }
    },
  },

  list_benchmark_tests: {
    description: 'List benchmark tests with optional filters by category, tags, and priority.',
    inputSchema: zodToJsonSchema(listBenchmarkTestsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listBenchmarkTestsSchema>) => {
      try {
        const validatedArgs = listBenchmarkTestsSchema.parse(args);
        const { category, tags, priority, limit = 50, skip = 0 } = validatedArgs;

        logger.info('[list_benchmark_tests] Listing tests with filters:', {
          category,
          tags,
          priority,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (category) filter.category = category;
        if (priority) filter.priority = priority;
        if (tags && tags.length > 0) {
          filter.tags = { $all: tags }; // All tags must match
        }

        const tests = await BenchmarkTest.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await BenchmarkTest.countDocuments(filter);

        return createSuccessResponse({
          tests,
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        });
      } catch (error: any) {
        logger.error('[list_benchmark_tests] Error:', error);
        return handleToolError(error, 'listing benchmark tests');
      }
    },
  },

  get_benchmark_test: {
    description: 'Get a benchmark test by testId.',
    inputSchema: zodToJsonSchema(getBenchmarkTestSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getBenchmarkTestSchema>) => {
      try {
        const validatedArgs = getBenchmarkTestSchema.parse(args);
        const { testId } = validatedArgs;

        logger.info(`[get_benchmark_test] Getting test: ${testId}`);

        const test = await BenchmarkTest.findOne({ testId });
        if (!test) {
          return createErrorResponse(`Benchmark test not found: ${testId}`);
        }

        return createSuccessResponse(test);
      } catch (error: any) {
        logger.error('[get_benchmark_test] Error:', error);
        return handleToolError(error, 'getting benchmark test');
      }
    },
  },

  list_benchmark_runs: {
    description: 'List benchmark runs with optional filters by testId, status, agentConfigId, and date range.',
    inputSchema: zodToJsonSchema(listBenchmarkRunsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listBenchmarkRunsSchema>) => {
      try {
        const validatedArgs = listBenchmarkRunsSchema.parse(args);
        const { testId, status, agentConfigId, startDate, endDate, limit = 50, skip = 0 } = validatedArgs;

        logger.info('[list_benchmark_runs] Listing runs with filters:', {
          testId,
          status,
          agentConfigId,
          startDate,
          endDate,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (testId) filter.testId = testId;
        if (status) filter['result.status'] = status;
        if (agentConfigId) filter['execution.agentConfigId'] = agentConfigId;
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) filter.createdAt.$gte = new Date(startDate);
          if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const runs = await BenchmarkRun.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await BenchmarkRun.countDocuments(filter);

        return createSuccessResponse({
          runs,
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        });
      } catch (error: any) {
        logger.error('[list_benchmark_runs] Error:', error);
        return handleToolError(error, 'listing benchmark runs');
      }
    },
  },

  get_benchmark_run: {
    description: 'Get a benchmark run by runId.',
    inputSchema: zodToJsonSchema(getBenchmarkRunSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getBenchmarkRunSchema>) => {
      try {
        const validatedArgs = getBenchmarkRunSchema.parse(args);
        const { runId } = validatedArgs;

        logger.info(`[get_benchmark_run] Getting run: ${runId}`);

        const run = await BenchmarkRun.findOne({ runId });
        if (!run) {
          return createErrorResponse(`Benchmark run not found: ${runId}`);
        }

        return createSuccessResponse(run);
      } catch (error: any) {
        logger.error('[get_benchmark_run] Error:', error);
        return handleToolError(error, 'getting benchmark run');
      }
    },
  },

  list_benchmark_suites: {
    description: 'List benchmark suites with optional filters by date range.',
    inputSchema: zodToJsonSchema(listBenchmarkSuitesSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listBenchmarkSuitesSchema>) => {
      try {
        const validatedArgs = listBenchmarkSuitesSchema.parse(args);
        const { startDate, endDate, limit = 50, skip = 0 } = validatedArgs;

        logger.info('[list_benchmark_suites] Listing suites with filters:', {
          startDate,
          endDate,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (startDate || endDate) {
          filter.createdAt = {};
          if (startDate) filter.createdAt.$gte = new Date(startDate);
          if (endDate) filter.createdAt.$lte = new Date(endDate);
        }

        const suites = await BenchmarkSuite.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await BenchmarkSuite.countDocuments(filter);

        return createSuccessResponse({
          suites,
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        });
      } catch (error: any) {
        logger.error('[list_benchmark_suites] Error:', error);
        return handleToolError(error, 'listing benchmark suites');
      }
    },
  },

  get_benchmark_suite: {
    description: 'Get a benchmark suite by suiteId.',
    inputSchema: zodToJsonSchema(getBenchmarkSuiteSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getBenchmarkSuiteSchema>) => {
      try {
        const validatedArgs = getBenchmarkSuiteSchema.parse(args);
        const { suiteId } = validatedArgs;

        logger.info(`[get_benchmark_suite] Getting suite: ${suiteId}`);

        const suite = await BenchmarkSuite.findOne({ suiteId });
        if (!suite) {
          return createErrorResponse(`Benchmark suite not found: ${suiteId}`);
        }

        return createSuccessResponse(suite);
      } catch (error: any) {
        logger.error('[get_benchmark_suite] Error:', error);
        return handleToolError(error, 'getting benchmark suite');
      }
    },
  },

  list_regressions: {
    description: 'List regressions with optional filters by testId, severity, resolved status, and date range.',
    inputSchema: zodToJsonSchema(listRegressionsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listRegressionsSchema>) => {
      try {
        const validatedArgs = listRegressionsSchema.parse(args);
        const { testId, severity, resolved, startDate, endDate, limit = 50, skip = 0 } = validatedArgs;

        logger.info('[list_regressions] Listing regressions with filters:', {
          testId,
          severity,
          resolved,
          startDate,
          endDate,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (testId) filter.testId = testId;
        if (severity) filter.severity = severity;
        if (resolved !== undefined) filter.resolved = resolved;
        if (startDate || endDate) {
          filter.detectedAt = {};
          if (startDate) filter.detectedAt.$gte = new Date(startDate);
          if (endDate) filter.detectedAt.$lte = new Date(endDate);
        }

        const regressions = await Regression.find(filter)
          .sort({ detectedAt: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await Regression.countDocuments(filter);

        return createSuccessResponse({
          regressions,
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        });
      } catch (error: any) {
        logger.error('[list_regressions] Error:', error);
        return handleToolError(error, 'listing regressions');
      }
    },
  },

  get_regression: {
    description: 'Get a regression by regressionId.',
    inputSchema: zodToJsonSchema(getRegressionSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getRegressionSchema>) => {
      try {
        const validatedArgs = getRegressionSchema.parse(args);
        const { regressionId } = validatedArgs;

        logger.info(`[get_regression] Getting regression: ${regressionId}`);

        const regression = await Regression.findOne({ regressionId });
        if (!regression) {
          return createErrorResponse(`Regression not found: ${regressionId}`);
        }

        return createSuccessResponse(regression);
      } catch (error: any) {
        logger.error('[get_regression] Error:', error);
        return handleToolError(error, 'getting regression');
      }
    },
  },
};

