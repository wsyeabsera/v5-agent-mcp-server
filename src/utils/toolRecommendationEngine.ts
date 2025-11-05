import { Tool, ToolPerformance } from '../models/index.js';
import { logger } from './logger.js';
import { extractContext } from './patternExtractor.js';

/**
 * Tool Recommendation Engine - Optimize tool selection based on learned performance
 */

export interface ToolRecommendationResult {
  requiredAction: string;
  context: string;
  recommendations: Array<{
    toolName: string;
    confidence: number;
    score: number;
    reasons: string[];
    performance: {
      successRate: number;
      avgDuration: number;
      reliability: number;
    };
    contextFit: {
      score: number;
      matches: string[];
    };
  }>;
  warnings: Array<{
    toolName: string;
    warning: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

/**
 * Get tool recommendations for an action
 */
export async function getToolRecommendations(
  requiredAction: string,
  context: string,
  plan?: any
): Promise<ToolRecommendationResult> {
  try {
    logger.debug(`[ToolRecommendationEngine] Getting recommendations for action: ${requiredAction}, context: ${context}`);

    // 1. Find candidate tools
    const candidates = await findCandidateTools(requiredAction);

    if (candidates.length === 0) {
      return {
        requiredAction,
        context,
        recommendations: [],
        warnings: [{
          toolName: requiredAction,
          warning: `No tools found for action: ${requiredAction}`,
          severity: 'high',
        }],
      };
    }

    // 2. Analyze performance in context
    const recommendations = await analyzeToolPerformance(candidates, context, plan);

    // 3. Generate warnings for low-performing tools
    const warnings = generateWarnings(recommendations);

    // Sort by score (highest first)
    recommendations.sort((a, b) => b.score - a.score);

    return {
      requiredAction,
      context,
      recommendations,
      warnings,
    };
  } catch (error: any) {
    logger.error('[ToolRecommendationEngine] Error getting recommendations:', error);
    return {
      requiredAction,
      context,
      recommendations: [],
      warnings: [],
    };
  }
}

/**
 * Find candidate tools for an action
 */
async function findCandidateTools(requiredAction: string): Promise<any[]> {
  try {
    // Search tools by name or description
    const tools = await Tool.find({
      $or: [
        { name: { $regex: requiredAction, $options: 'i' } },
        { description: { $regex: requiredAction, $options: 'i' } },
      ],
    }).lean();

    return tools;
  } catch (error: any) {
    logger.error('[ToolRecommendationEngine] Error finding candidate tools:', error);
    return [];
  }
}

/**
 * Analyze tool performance in context
 */
async function analyzeToolPerformance(
  candidates: any[],
  context: string,
  plan?: any
): Promise<Array<{
  toolName: string;
  confidence: number;
  score: number;
  reasons: string[];
  performance: {
    successRate: number;
    avgDuration: number;
    reliability: number;
  };
  contextFit: {
    score: number;
    matches: string[];
  };
}>> {
  const recommendations: Array<{
    toolName: string;
    confidence: number;
    score: number;
    reasons: string[];
    performance: {
      successRate: number;
      avgDuration: number;
      reliability: number;
    };
    contextFit: {
      score: number;
      matches: string[];
    };
  }> = [];

  for (const tool of candidates) {
    const toolPerf = await ToolPerformance.findOne({ toolName: tool.name }).lean();

    // Get performance metrics
    const successRate = toolPerf?.performance?.successRate || 0.5; // Default for new tools
    const avgDuration = toolPerf?.performance?.avgDuration || 5000; // Default 5 seconds
    const reliability = toolPerf?.performance?.successRate || 0.7; // Use success rate as reliability proxy

    // Check context fit
    const contextFit = calculateContextFit(toolPerf, context);

    // Calculate combined score
    const score = calculateScore(successRate, avgDuration, reliability, contextFit.score);

    // Generate reasons
    const reasons = generateReasons(toolPerf, contextFit, successRate, avgDuration);

    // Confidence based on data availability
    const confidence = toolPerf ? 0.8 : 0.4; // Higher confidence with performance data

    recommendations.push({
      toolName: tool.name,
      confidence,
      score,
      reasons,
      performance: {
        successRate,
        avgDuration,
        reliability,
      },
      contextFit,
    });
  }

  return recommendations;
}

/**
 * Calculate context fit
 */
function calculateContextFit(toolPerf: any, context: string): {
  score: number;
  matches: string[];
} {
  if (!toolPerf || !toolPerf.optimalContexts || toolPerf.optimalContexts.length === 0) {
    return { score: 0.5, matches: [] }; // Neutral score if no context data
  }

  const contextParts = context.toLowerCase().split('_');
  const matches: string[] = [];

  for (const optimalContext of toolPerf.optimalContexts) {
    const optimalParts = optimalContext.context.toLowerCase().split('_');
    
    // Check for overlapping context parts
    const overlap = contextParts.filter(part => optimalParts.includes(part));
    if (overlap.length > 0) {
      matches.push(optimalContext.context);
    }
  }

  // Score based on matches and success rate in those contexts
  let score = 0.5; // Base score
  if (matches.length > 0) {
    const matchedContext = toolPerf.optimalContexts.find((c: any) => matches.includes(c.context));
    if (matchedContext) {
      score = matchedContext.successRate; // Use success rate in this context
    }
  }

  return { score, matches };
}

/**
 * Calculate combined recommendation score
 */
function calculateScore(
  successRate: number,
  avgDuration: number,
  reliability: number,
  contextFit: number
): number {
  // Normalize duration (lower is better, max 10 seconds)
  const durationScore = Math.max(0, 1 - (avgDuration / 10000));

  // Weighted combination
  const weights = {
    successRate: 0.4,
    duration: 0.2,
    reliability: 0.2,
    contextFit: 0.2,
  };

  const score =
    successRate * weights.successRate +
    durationScore * weights.duration +
    reliability * weights.reliability +
    contextFit * weights.contextFit;

  return Math.max(0, Math.min(1, score));
}

/**
 * Generate reasons for recommendation
 */
function generateReasons(
  toolPerf: any,
  contextFit: any,
  successRate: number,
  avgDuration: number
): string[] {
  const reasons: string[] = [];

  if (successRate > 0.8) {
    reasons.push(`High success rate: ${(successRate * 100).toFixed(0)}%`);
  }

  if (contextFit.matches.length > 0) {
    reasons.push(`Performs well in context: ${contextFit.matches.join(', ')}`);
  }

  if (avgDuration < 3000) {
    reasons.push(`Fast execution: ${avgDuration.toFixed(0)}ms average`);
  }

  if (toolPerf && toolPerf.performance?.totalExecutions > 10) {
    reasons.push(`Proven with ${toolPerf.performance.totalExecutions} executions`);
  }

  if (reasons.length === 0) {
    reasons.push('Recommended based on tool description');
  }

  return reasons;
}

/**
 * Generate warnings for low-performing tools
 */
function generateWarnings(recommendations: any[]): Array<{
  toolName: string;
  warning: string;
  severity: 'low' | 'medium' | 'high';
}> {
  const warnings: Array<{
    toolName: string;
    warning: string;
    severity: 'low' | 'medium' | 'high';
  }> = [];

  for (const rec of recommendations) {
    if (rec.performance.successRate < 0.3) {
      warnings.push({
        toolName: rec.toolName,
        warning: `Low success rate: ${(rec.performance.successRate * 100).toFixed(0)}%`,
        severity: 'high',
      });
    } else if (rec.performance.successRate < 0.5) {
      warnings.push({
        toolName: rec.toolName,
        warning: `Moderate success rate: ${(rec.performance.successRate * 100).toFixed(0)}%`,
        severity: 'medium',
      });
    }

    if (rec.performance.avgDuration > 10000) {
      warnings.push({
        toolName: rec.toolName,
        warning: `Slow execution: ${rec.performance.avgDuration.toFixed(0)}ms average`,
        severity: 'medium',
      });
    }
  }

  return warnings;
}

