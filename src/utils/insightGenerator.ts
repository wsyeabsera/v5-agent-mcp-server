import { MemoryPattern, ToolPerformance, AgentInsight, TaskSimilarity } from '../models/index.js';
import { logger } from './logger.js';

/**
 * Generate insights automatically from patterns and performance data
 */
export async function generateInsights(): Promise<void> {
  try {
    logger.info('[InsightGenerator] Starting insight generation');

    // Analyze patterns for high success rates
    await generateBestPractices();

    // Analyze errors for warnings
    await generateWarnings();

    // Analyze tool performance for optimizations
    await generateOptimizations();

    // Validate existing insights
    await validateInsights();

    logger.info('[InsightGenerator] Completed insight generation');
  } catch (error: any) {
    logger.error('[InsightGenerator] Error generating insights:', error);
  }
}

/**
 * Generate best practice insights from successful patterns
 */
async function generateBestPractices(): Promise<void> {
  try {
    const patterns = await MemoryPattern.find({
      usageCount: { $gte: 5 },
      'successMetrics.successRate': { $gte: 0.9 },
    }).lean();

    for (const pattern of patterns) {
      const insightId = `best_practice_${pattern.patternId}`;
      const existingInsight = await AgentInsight.findOne({ insightId });

      if (!existingInsight) {
        await AgentInsight.create({
          insightId,
          agentType: 'executor',
          insightType: 'best_practice',
          insight: `Using pattern "${pattern.pattern.goal || pattern.pattern.query}" has ${(pattern.successMetrics.successRate * 100).toFixed(0)}% success rate with ${pattern.usageCount} uses`,
          appliesTo: {
            contexts: pattern.pattern.context ? [pattern.pattern.context] : [],
          },
          confidence: pattern.successMetrics.successRate,
          evidenceStrength: Math.min(1.0, pattern.usageCount / 10),
          evidence: pattern.evidence
            .filter(e => e.outcome === 'success')
            .slice(0, 5)
            .map(e => ({
              taskId: e.taskId,
              description: 'Successful execution',
              timestamp: e.timestamp,
            })),
          validated: false,
          usageCount: 0,
          lastUsed: new Date(),
        });

        logger.debug(`[InsightGenerator] Created best practice insight: ${insightId}`);
      }
    }
  } catch (error: any) {
    logger.error('[InsightGenerator] Error generating best practices:', error);
  }
}

/**
 * Generate warning insights from common errors
 */
async function generateWarnings(): Promise<void> {
  try {
    const toolPerfs = await ToolPerformance.find({
      'commonErrors.frequency': { $gte: 3 },
    }).lean();

    for (const toolPerf of toolPerfs) {
      for (const error of toolPerf.commonErrors) {
        if (error.frequency >= 3 && error.percentage > 10) {
          const insightId = `warning_${toolPerf.toolName}_${error.error.substring(0, 50).replace(/[^a-z0-9]/g, '_')}`;
          const existingInsight = await AgentInsight.findOne({ insightId });

          if (!existingInsight) {
            await AgentInsight.create({
              insightId,
              agentType: 'executor',
              insightType: 'warning',
              insight: `Common error in ${toolPerf.toolName}: ${error.error.substring(0, 100)}. Occurs in ${error.percentage.toFixed(0)}% of executions`,
              rule: `When using ${toolPerf.toolName}, avoid: ${error.error.substring(0, 50)}`,
              appliesTo: {
                contexts: error.contexts,
              },
              confidence: Math.min(0.9, error.percentage / 100),
              evidenceStrength: Math.min(1.0, error.frequency / 10),
              evidence: [], // Can be populated from task history if needed
              validated: false,
              usageCount: 0,
              lastUsed: new Date(),
            });

            logger.debug(`[InsightGenerator] Created warning insight: ${insightId}`);
          }
        }
      }
    }
  } catch (error: any) {
    logger.error('[InsightGenerator] Error generating warnings:', error);
  }
}

/**
 * Generate optimization insights from tool performance
 */
async function generateOptimizations(): Promise<void> {
  try {
    const toolPerfs = await ToolPerformance.find({
      'performance.totalExecutions': { $gte: 5 },
      'optimalContexts.usageCount': { $gte: 3 },
    }).lean();

    for (const toolPerf of toolPerfs) {
      // Find optimal contexts
      const optimalContexts = toolPerf.optimalContexts
        .filter((ctx: any) => ctx.successRate > 0.8 && ctx.usageCount >= 3)
        .sort((a: any, b: any) => b.successRate - a.successRate);

      if (optimalContexts.length > 0) {
        const bestContext = optimalContexts[0];
        const insightId = `optimization_${toolPerf.toolName}_${bestContext.context}`;
        const existingInsight = await AgentInsight.findOne({ insightId });

        if (!existingInsight) {
          await AgentInsight.create({
            insightId,
            agentType: 'planner',
            insightType: 'optimization',
            insight: `${toolPerf.toolName} performs best in "${bestContext.context}" context with ${(bestContext.successRate * 100).toFixed(0)}% success rate`,
            appliesTo: {
              contexts: [bestContext.context],
            },
            confidence: bestContext.successRate,
            evidenceStrength: Math.min(1.0, bestContext.usageCount / 10),
            evidence: [],
            validated: false,
            usageCount: 0,
            lastUsed: new Date(),
          });

          logger.debug(`[InsightGenerator] Created optimization insight: ${insightId}`);
        }
      }
    }
  } catch (error: any) {
    logger.error('[InsightGenerator] Error generating optimizations:', error);
  }
}

/**
 * Validate existing insights against new data
 */
async function validateInsights(): Promise<void> {
  try {
    const insights = await AgentInsight.find({
      validated: false,
      confidence: { $gte: 0.5 },
    }).lean();

    for (const insight of insights) {
      // Simple validation: check if evidence still supports the insight
      // More sophisticated validation can be added later
      if (insight.evidence.length >= 3 && insight.confidence >= 0.7) {
        await AgentInsight.findByIdAndUpdate(insight._id, {
          validated: true,
          validatedAt: new Date(),
          validatedBy: 'system',
        });

        logger.debug(`[InsightGenerator] Validated insight: ${insight.insightId}`);
      }
    }

    // Remove low-confidence insights that haven't been used
    const lowConfidenceInsights = await AgentInsight.find({
      confidence: { $lt: 0.3 },
      usageCount: 0,
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Older than 30 days
    });

    for (const insight of lowConfidenceInsights) {
      await AgentInsight.findByIdAndDelete(insight._id);
      logger.debug(`[InsightGenerator] Removed low-confidence insight: ${insight.insightId}`);
    }
  } catch (error: any) {
    logger.error('[InsightGenerator] Error validating insights:', error);
  }
}

