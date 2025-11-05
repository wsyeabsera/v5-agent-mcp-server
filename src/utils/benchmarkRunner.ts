import { BenchmarkTest, BenchmarkRun, BenchmarkSuite, Task, Plan, Thought } from '../models/index.js';
import { logger } from './logger.js';
import { taskTools } from '../tools/taskTools.js';
import { thoughtTools } from '../tools/thoughtTools.js';
import { planTools } from '../tools/planTools.js';
import { calculateSuccessMetrics } from './patternExtractor.js';
import { getTaskCost } from './costTracker.js';

/**
 * Benchmark Runner - Execute benchmark tests and collect metrics
 */

export interface BenchmarkExecutionResult {
  runId: string;
  testId: string;
  status: 'passed' | 'failed' | 'timeout' | 'error';
  matchesExpected: boolean;
  metrics: {
    executionTime: number;
    stepsCompleted: number;
    stepsExpected: number;
    retries: number;
    userInputsRequired: number;
    tokenUsage?: number;
    apiCalls?: number;
  };
  error?: string;
}

/**
 * Execute a single benchmark test
 */
export async function executeTest(
  testId: string,
  agentConfigId: string,
  timeout: number = 30000
): Promise<BenchmarkExecutionResult> {
  try {
    logger.info(`[BenchmarkRunner] Executing test: ${testId}`);

    const test = await BenchmarkTest.findOne({ testId });
    if (!test) {
      throw new Error(`Test not found: ${testId}`);
    }

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const startedAt = new Date();

    // Generate thought
    const thoughtResult = await thoughtTools.generate_thoughts.handler({
      userQuery: test.test.query,
      agentConfigId,
      enableToolSearch: true,
    });

    if (!thoughtResult.success) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: 0,
          stepsExpected: 0,
          retries: 0,
          userInputsRequired: 0,
        },
        error: `Failed to generate thought: ${thoughtResult.message}`,
      };
    }

    const thoughtId = thoughtResult.data?.thoughtId;
    if (!thoughtId) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: 0,
          stepsExpected: 0,
          retries: 0,
          userInputsRequired: 0,
        },
        error: 'No thought ID returned',
      };
    }

    // Generate plan
    const planResult = await planTools.generate_plan.handler({
      thoughtId,
      agentConfigId,
      enableToolSearch: true,
    });

    if (!planResult.success) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: 0,
          stepsExpected: 0,
          retries: 0,
          userInputsRequired: 0,
        },
        error: `Failed to generate plan: ${planResult.message}`,
      };
    }

    const planId = planResult.data?.planId;
    if (!planId) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: 0,
          stepsExpected: 0,
          retries: 0,
          userInputsRequired: 0,
        },
        error: 'No plan ID returned',
      };
    }

    const plan = await Plan.findById(planId);
    if (!plan) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: 0,
          stepsExpected: 0,
          retries: 0,
          userInputsRequired: 0,
        },
        error: 'Plan not found',
      };
    }

    // Execute task
    const taskResult = await taskTools.execute_task.handler({
      planId,
      agentConfigId,
    });

    // Handle response format - could be string or object
    let taskResultData: any;
    if (typeof taskResult === 'string') {
      try {
        taskResultData = JSON.parse(taskResult);
      } catch {
        taskResultData = { success: false, message: taskResult };
      }
    } else {
      taskResultData = taskResult;
    }

    // Check if result indicates success
    const isSuccess = taskResultData.success !== false && taskResultData.data?.taskId;
    
    if (!isSuccess) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: plan.steps.length,
          stepsExpected: plan.steps.length,
          retries: 0,
          userInputsRequired: 0,
        },
        error: `Failed to execute task: ${taskResultData.message || 'Unknown error'}`,
      };
    }

    const taskId = taskResultData.data?.taskId || taskResultData.taskId;
    if (!taskId) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: 0,
          stepsCompleted: plan.steps.length,
          stepsExpected: plan.steps.length,
          retries: 0,
          userInputsRequired: 0,
        },
        error: 'No task ID returned',
      };
    }

    // Wait for task completion
    let task = await Task.findById(taskId);
    const waitStart = Date.now();
    while (task && task.status === 'in_progress' && (Date.now() - waitStart) < timeout) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      task = await Task.findById(taskId);
    }

    const completedAt = new Date();
    const duration = completedAt.getTime() - startedAt.getTime();

    // Check for timeout
    if (task && task.status === 'in_progress') {
      return {
        runId,
        testId,
        status: 'timeout',
        matchesExpected: false,
        metrics: {
          executionTime: duration,
          stepsCompleted: plan.steps.filter((s: any) => s.status === 'completed').length,
          stepsExpected: plan.steps.length,
          retries: Array.from(task.retryCount.values()).reduce((sum, count) => sum + count, 0),
          userInputsRequired: task.pendingUserInputs.length,
        },
        error: 'Task execution timeout',
      };
    }

    if (!task) {
      return {
        runId,
        testId,
        status: 'error',
        matchesExpected: false,
        metrics: {
          executionTime: duration,
          stepsCompleted: 0,
          stepsExpected: plan.steps.length,
          retries: 0,
          userInputsRequired: 0,
        },
        error: 'Task not found',
      };
    }

    // Calculate metrics
    const metrics = calculateSuccessMetrics(task);
    const actualSteps = plan.steps
      .filter((s: any) => s.status === 'completed')
      .map((s: any) => s.action);

    // Get cost data
    const costData = await getTaskCost(taskId);
    const tokenUsage = costData?.tokenUsage?.total;
    const apiCalls = costData?.apiCalls;

    // Check if result matches expected
    const matchesExpected = checkExpectedOutcome(test.test.expectedOutcome, task, actualSteps);

    // Determine status
    let status: 'passed' | 'failed' | 'timeout' | 'error';
    if (task.status === 'completed' && matchesExpected) {
      status = 'passed';
    } else if (task.status === 'failed' || !matchesExpected) {
      status = 'failed';
    } else {
      status = 'error';
    }

    // Store benchmark run
    await BenchmarkRun.create({
      runId,
      testId,
      testName: test.name,
      execution: {
        taskId: taskId.toString(),
        planId: planId.toString(),
        thoughtId: thoughtId || undefined,
        agentConfigId,
        startedAt,
        completedAt,
        duration,
      },
      result: {
        status,
        actualOutput: task.stepOutputs ? Object.fromEntries(task.stepOutputs) : undefined,
        actualSteps,
        error: task.error,
        matchesExpected,
      },
      metrics: {
        executionTime: duration,
        stepsCompleted: metrics.stepsCompleted,
        stepsExpected: plan.steps.length,
        retries: metrics.retries,
        userInputsRequired: metrics.userInputsRequired,
        tokenUsage,
        apiCalls,
      },
    });

    return {
      runId,
      testId,
      status,
      matchesExpected,
      metrics: {
        executionTime: duration,
        stepsCompleted: metrics.stepsCompleted,
        stepsExpected: plan.steps.length,
        retries: metrics.retries,
        userInputsRequired: metrics.userInputsRequired,
        tokenUsage,
        apiCalls,
      },
      error: task.error,
    };
  } catch (error: any) {
    logger.error(`[BenchmarkRunner] Error executing test ${testId}:`, error);
    return {
      runId: `run_${Date.now()}`,
      testId,
      status: 'error',
      matchesExpected: false,
      metrics: {
        executionTime: 0,
        stepsCompleted: 0,
        stepsExpected: 0,
        retries: 0,
        userInputsRequired: 0,
      },
      error: error.message,
    };
  }
}

/**
 * Check if result matches expected outcome
 */
function checkExpectedOutcome(
  expected: any,
  task: any,
  actualSteps: string[]
): boolean {
  if (expected.type === 'success') {
    return task.status === 'completed';
  }

  if (expected.type === 'failure') {
    return task.status === 'failed';
  }

  if (expected.type === 'specific_output') {
    if (expected.expectedOutput) {
      // Check if actual output matches expected
      // Simplified comparison
      const actualOutput = task.stepOutputs ? Object.fromEntries(task.stepOutputs) : {};
      return JSON.stringify(actualOutput).includes(JSON.stringify(expected.expectedOutput));
    }
  }

  // Check expected steps
  if (expected.expectedSteps && expected.expectedSteps.length > 0) {
    const stepMatch = expected.expectedSteps.every((step: string, idx: number) => 
      actualSteps[idx] === step
    );
    if (!stepMatch) {
      return false;
    }
  }

  // Check max duration
  if (expected.maxDuration) {
    const metrics = calculateSuccessMetrics(task);
    if (metrics.executionTime > expected.maxDuration) {
      return false;
    }
  }

  return true;
}

/**
 * Execute a suite of tests
 */
export async function executeSuite(
  testIds: string[],
  agentConfigId: string,
  config: {
    timeout?: number;
    parallel?: boolean;
    maxConcurrent?: number;
  } = {}
): Promise<{
  suiteId: string;
  results: BenchmarkExecutionResult[];
  summary: {
    totalTests: number;
    passed: number;
    failed: number;
    timeout: number;
    error: number;
    avgDuration: number;
    successRate: number;
  };
}> {
  try {
    const suiteId = `suite_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const results: BenchmarkExecutionResult[] = [];

    const { timeout = 30000, parallel = false, maxConcurrent = 1 } = config;

    if (parallel && maxConcurrent > 1) {
      // Execute in parallel batches
      for (let i = 0; i < testIds.length; i += maxConcurrent) {
        const batch = testIds.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(
          batch.map(testId => executeTest(testId, agentConfigId, timeout))
        );
        results.push(...batchResults);
      }
    } else {
      // Execute sequentially
      for (const testId of testIds) {
        const result = await executeTest(testId, agentConfigId, timeout);
        results.push(result);
      }
    }

    // Calculate summary
    const totalTests = results.length;
    const passed = results.filter(r => r.status === 'passed').length;
    const failed = results.filter(r => r.status === 'failed').length;
    const timeoutCount = results.filter(r => r.status === 'timeout').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const avgDuration = results.length > 0
      ? results.reduce((sum, r) => sum + r.metrics.executionTime, 0) / results.length
      : 0;
    const successRate = totalTests > 0 ? passed / totalTests : 0;

    return {
      suiteId,
      results,
      summary: {
        totalTests,
        passed,
        failed,
        timeout: timeoutCount,
        error: errorCount,
        avgDuration,
        successRate,
      },
    };
  } catch (error: any) {
    logger.error('[BenchmarkRunner] Error executing suite:', error);
    throw error;
  }
}

/**
 * Compare with baseline
 */
export async function compareWithBaseline(
  runId: string,
  baselineRunId: string
): Promise<{
  performanceDelta: number;
  statusChange: 'improved' | 'degraded' | 'same';
}> {
  try {
    const run = await BenchmarkRun.findOne({ runId });
    const baseline = await BenchmarkRun.findOne({ runId: baselineRunId });

    if (!run || !baseline) {
      throw new Error('Run or baseline not found');
    }

    const durationDelta = ((run.metrics.executionTime - baseline.metrics.executionTime) / baseline.metrics.executionTime) * 100;
    
    let statusChange: 'improved' | 'degraded' | 'same' = 'same';
    if (run.result.status === 'passed' && baseline.result.status === 'failed') {
      statusChange = 'improved';
    } else if (run.result.status === 'failed' && baseline.result.status === 'passed') {
      statusChange = 'degraded';
    } else if (run.result.status === baseline.result.status) {
      if (durationDelta < -10) {
        statusChange = 'improved';
      } else if (durationDelta > 10) {
        statusChange = 'degraded';
      }
    }

    // Update run with baseline comparison
    await BenchmarkRun.findOneAndUpdate(
      { runId },
      {
        baselineComparison: {
          baselineRunId,
          performanceDelta: durationDelta,
          statusChange,
        },
      }
    );

    return {
      performanceDelta: durationDelta,
      statusChange,
    };
  } catch (error: any) {
    logger.error('[BenchmarkRunner] Error comparing with baseline:', error);
    throw error;
  }
}

/**
 * Detect regressions
 */
export async function detectRegressions(
  testId?: string,
  timeRange?: { start: Date; end: Date }
): Promise<any[]> {
  try {
    const query: any = {};
    if (testId) {
      query.testId = testId;
    }
    if (timeRange) {
      query.createdAt = {
        $gte: timeRange.start,
        $lte: timeRange.end,
      };
    }

    // Get recent runs grouped by test
    const runs = await BenchmarkRun.find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Group by testId
    const runsByTest = new Map<string, any[]>();
    for (const run of runs) {
      if (!runsByTest.has(run.testId)) {
        runsByTest.set(run.testId, []);
      }
      runsByTest.get(run.testId)!.push(run);
    }

    const regressions: any[] = [];

    for (const [testId, testRuns] of runsByTest.entries()) {
      if (testRuns.length < 2) continue; // Need at least 2 runs to detect regression

      // Find baseline (most recent successful run)
      const baseline = testRuns.find(r => r.result.status === 'passed');
      if (!baseline) continue;

      // Find current run (most recent)
      const current = testRuns[0];

      // Check for regression
      if (current.result.status === 'failed' && baseline.result.status === 'passed') {
        // Status regression
        const regressionId = `regression_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const test = await BenchmarkTest.findOne({ testId });
        
        const durationDelta = ((current.metrics.executionTime - baseline.metrics.executionTime) / baseline.metrics.executionTime) * 100;
        const severity = durationDelta > 50 ? 'critical' : durationDelta > 20 ? 'high' : 'medium';

        regressions.push({
          regressionId,
          testId,
          testName: test?.name || testId,
          detectedAt: new Date(),
          severity,
          baseline: {
            runId: baseline.runId,
            status: baseline.result.status,
            duration: baseline.metrics.executionTime,
            metrics: baseline.metrics,
          },
          current: {
            runId: current.runId,
            status: current.result.status,
            duration: current.metrics.executionTime,
            metrics: current.metrics,
          },
          delta: {
            statusChanged: true,
            durationDelta,
            metricDeltas: {},
          },
          resolved: false,
        });
      } else if (current.metrics.executionTime > baseline.metrics.executionTime * 1.5) {
        // Performance regression (50% slower)
        const regressionId = `regression_${Date.now()}_${Math.random().toString(36).substring(7)}`;
        const test = await BenchmarkTest.findOne({ testId });
        
        const durationDelta = ((current.metrics.executionTime - baseline.metrics.executionTime) / baseline.metrics.executionTime) * 100;
        const severity = durationDelta > 100 ? 'critical' : durationDelta > 50 ? 'high' : 'medium';

        regressions.push({
          regressionId,
          testId,
          testName: test?.name || testId,
          detectedAt: new Date(),
          severity,
          baseline: {
            runId: baseline.runId,
            status: baseline.result.status,
            duration: baseline.metrics.executionTime,
            metrics: baseline.metrics,
          },
          current: {
            runId: current.runId,
            status: current.result.status,
            duration: current.metrics.executionTime,
            metrics: current.metrics,
          },
          delta: {
            statusChanged: false,
            durationDelta,
            metricDeltas: {},
          },
          resolved: false,
        });
      }
    }

    return regressions;
  } catch (error: any) {
    logger.error('[BenchmarkRunner] Error detecting regressions:', error);
    return [];
  }
}

/**
 * Generate benchmark report
 */
export async function generateReport(suiteId: string): Promise<any> {
  try {
    const suite = await BenchmarkSuite.findOne({ suiteId });
    if (!suite) {
      throw new Error(`Suite not found: ${suiteId}`);
    }

    const runs = await BenchmarkRun.find({ testId: { $in: suite.testIds } })
      .sort({ createdAt: -1 })
      .limit(suite.testIds.length * 10) // Last 10 runs per test
      .lean();

    return {
      suiteId,
      suiteName: suite.name,
      results: suite.results,
      recentRuns: runs,
      message: 'Benchmark report generated',
    };
  } catch (error: any) {
    logger.error('[BenchmarkRunner] Error generating report:', error);
    throw error;
  }
}

