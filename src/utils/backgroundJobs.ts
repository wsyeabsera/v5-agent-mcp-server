import { logger } from './logger.js';
import { generateInsights } from './insightGenerator.js';
import { MemoryPattern, ToolPerformance } from '../models/index.js';

/**
 * Background Jobs for Memory System
 * These jobs run periodically to analyze data and generate insights
 */

/**
 * Pattern Analysis Job
 * Runs hourly to analyze recent tasks for new patterns
 */
export async function runPatternAnalysisJob(): Promise<void> {
  try {
    logger.info('[BackgroundJobs] Running pattern analysis job');

    // Analyze recent tasks (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Find patterns that need validation
    const patterns = await MemoryPattern.find({
      lastUsed: { $gte: oneDayAgo },
      usageCount: { $gte: 3 },
    });

    for (const pattern of patterns) {
      // Recalculate success rate from evidence
      const successCount = pattern.evidence.filter(e => e.outcome === 'success').length;
      const newSuccessRate = successCount / pattern.evidence.length;

      // Update pattern if success rate changed significantly
      if (Math.abs(pattern.successMetrics.successRate - newSuccessRate) > 0.1) {
        pattern.successMetrics.successRate = newSuccessRate;
        pattern.confidence = Math.min(1.0, pattern.usageCount / 10);
        await pattern.save();
        logger.debug(`[BackgroundJobs] Updated pattern ${pattern.patternId} success rate`);
      }
    }

    logger.info('[BackgroundJobs] Pattern analysis job completed');
  } catch (error: any) {
    logger.error('[BackgroundJobs] Error in pattern analysis job:', error);
  }
}

/**
 * Tool Performance Analysis Job
 * Runs every 6 hours to recalculate metrics and generate recommendations
 */
export async function runToolPerformanceAnalysisJob(): Promise<void> {
  try {
    logger.info('[BackgroundJobs] Running tool performance analysis job');

    const toolPerfs = await ToolPerformance.find({
      'performance.totalExecutions': { $gte: 5 },
    });

    for (const toolPerf of toolPerfs) {
      // Recalculate success rate
      const total = toolPerf.performance.totalExecutions;
      const successCount = toolPerf.performance.successCount;
      const failureCount = toolPerf.performance.failureCount;

      // Ensure consistency
      if (total !== successCount + failureCount) {
        toolPerf.performance.totalExecutions = successCount + failureCount;
        toolPerf.performance.successRate = successCount / (successCount + failureCount);
      }

      // Update error percentages
      toolPerf.commonErrors.forEach((error: any) => {
        error.percentage = (error.frequency / total) * 100;
      });

      // Generate recommendations
      const recommendations: any[] = [];

      if (toolPerf.performance.successRate < 0.5) {
        recommendations.push({
          type: 'warning',
          message: `Low success rate (${(toolPerf.performance.successRate * 100).toFixed(0)}%). Review tool usage patterns.`,
          confidence: 0.8,
          evidence: [`Total executions: ${total}`],
        });
      }

      if (toolPerf.performance.avgDuration > 5000) {
        recommendations.push({
          type: 'optimization',
          message: `High average duration (${toolPerf.performance.avgDuration.toFixed(0)}ms). Consider optimization.`,
          confidence: 0.7,
          evidence: [`Average duration: ${toolPerf.performance.avgDuration}ms`],
        });
      }

      if (toolPerf.commonErrors.length > 0) {
        const topError = toolPerf.commonErrors[0];
        recommendations.push({
          type: 'warning',
          message: `Common error: ${topError.error.substring(0, 100)}`,
          confidence: Math.min(0.9, topError.percentage / 100),
          evidence: [`Occurs ${topError.frequency} times (${topError.percentage.toFixed(0)}%)`],
        });
      }

      // Update recommendations
      toolPerf.recommendations = recommendations;
      toolPerf.lastAnalyzed = new Date();
      await toolPerf.save();
    }

    logger.info('[BackgroundJobs] Tool performance analysis job completed');
  } catch (error: any) {
    logger.error('[BackgroundJobs] Error in tool performance analysis job:', error);
  }
}

/**
 * Insight Generation Job
 * Runs daily to generate new insights
 */
export async function runInsightGenerationJob(): Promise<void> {
  try {
    logger.info('[BackgroundJobs] Running insight generation job');
    await generateInsights();
    logger.info('[BackgroundJobs] Insight generation job completed');
  } catch (error: any) {
    logger.error('[BackgroundJobs] Error in insight generation job:', error);
  }
}

/**
 * Initialize background jobs
 * Note: In production, use a proper job scheduler (e.g., node-cron, agenda)
 */
export function initializeBackgroundJobs(): void {
  logger.info('[BackgroundJobs] Background jobs initialized');
  // For now, jobs are called manually or via API
  // In production, set up cron jobs or scheduled tasks
}

