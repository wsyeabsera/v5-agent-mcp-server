import { Plan, PlanPattern, ToolPerformance, MemoryPattern, TaskSimilarity } from '../models/index.js';
import { logger } from './logger.js';
import { extractQueryPattern, extractPlanPattern, extractContext } from './patternExtractor.js';
import { remember } from './memorySystem.js';

/**
 * Plan Quality Predictor - Predict plan success probability before execution
 */

export interface PlanQualityPredictionResult {
  successProbability: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: number;
  estimatedCost?: number;
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
  recommendations: Array<{
    type: 'optimization' | 'warning' | 'alternative';
    priority: 'high' | 'medium' | 'low';
    message: string;
    suggestedAction?: any;
  }>;
  comparison?: {
    similarPlans: Array<{
      planId: string;
      successRate: number;
      similarity: number;
    }>;
    baseline: {
      avgSuccessRate: number;
      avgDuration: number;
    };
  };
}

/**
 * Predict plan quality
 */
export async function predictPlanQuality(plan: any): Promise<PlanQualityPredictionResult> {
  try {
    logger.debug(`[PlanQualityPredictor] Predicting quality for plan: ${plan._id}`);

    // 1. Analyze step sequence
    const stepAnalysis = await analyzeStepSequence(plan);

    // 2. Check tool performance
    const toolAnalysis = await analyzeToolPerformance(plan);

    // 3. Validate parameters
    const parameterAnalysis = validateParameters(plan);

    // 4. Historical comparison
    const historicalComparison = await compareWithHistory(plan);

    // 5. Complexity analysis
    const complexityAnalysis = analyzeComplexity(plan);

    // 6. Calculate success probability
    const successProbability = calculateSuccessProbability({
      stepAnalysis,
      toolAnalysis,
      parameterAnalysis,
      historicalComparison,
      complexityAnalysis,
    });

    // 7. Identify risk factors
    const riskFactors = identifyRiskFactors({
      stepAnalysis,
      toolAnalysis,
      parameterAnalysis,
      complexityAnalysis,
    });

    // 8. Generate recommendations
    const recommendations = await generateRecommendations({
      plan,
      riskFactors,
      successProbability,
      toolAnalysis,
    });

    // 9. Determine risk level
    const riskLevel = determineRiskLevel(successProbability, riskFactors);

    // 10. Estimate duration
    const estimatedDuration = estimateDuration(plan, historicalComparison, toolAnalysis);

    // 11. Estimate cost
    const estimatedCost = estimateCost(plan, toolAnalysis);

    return {
      successProbability,
      confidence: calculateConfidence(historicalComparison.baseline),
      riskLevel,
      estimatedDuration,
      estimatedCost,
      riskFactors,
      recommendations,
      comparison: {
        similarPlans: historicalComparison.similarPlans,
        baseline: historicalComparison.baseline,
      },
    };
  } catch (error: any) {
    logger.error('[PlanQualityPredictor] Error predicting plan quality:', error);
    // Return conservative prediction on error
    return {
      successProbability: 0.5,
      confidence: 0.3,
      riskLevel: 'medium',
      estimatedDuration: 5000,
      riskFactors: [{ factor: 'prediction_error', severity: 'medium', description: 'Unable to complete prediction' }],
      recommendations: [],
    };
  }
}

/**
 * Analyze step sequence
 */
async function analyzeStepSequence(plan: any): Promise<{ score: number; issues: string[] }> {
  const stepSequence = extractPlanPattern(plan);
  const issues: string[] = [];

  // Check for known problematic patterns
  if (stepSequence.length === 0) {
    issues.push('Plan has no steps');
    return { score: 0, issues };
  }

  // Check for repeated tools (might indicate dependency issues)
  const toolCounts = new Map<string, number>();
  stepSequence.forEach((tool: string) => {
    toolCounts.set(tool, (toolCounts.get(tool) || 0) + 1);
  });

  for (const [tool, count] of toolCounts.entries()) {
    if (count > 3) {
      issues.push(`Tool ${tool} used ${count} times, may indicate dependency issues`);
    }
  }

    // Check if step sequence matches known patterns
    const queryPattern = extractQueryPattern(plan.userQuery || '');
    const memory = await remember(queryPattern);
    
    let patternMatchScore = 0;
    if (memory.patterns && memory.patterns.length > 0) {
      // Check if our step sequence matches any successful patterns
      const matchedPattern = memory.patterns.find((p: any) => {
        const patternSteps = p.pattern?.steps || [];
        return patternSteps.length === stepSequence.length &&
          patternSteps.every((step: string, idx: number) => step === stepSequence[idx]);
      });
      
      if (matchedPattern) {
        patternMatchScore = matchedPattern.successMetrics?.successRate || 0.5;
      }
    }

  const baseScore = patternMatchScore > 0 ? patternMatchScore : 0.7; // Default score
  const penalty = issues.length * 0.1;
  const score = Math.max(0, Math.min(1, baseScore - penalty));

  return { score, issues };
}

/**
 * Analyze tool performance
 */
async function analyzeToolPerformance(plan: any): Promise<{
  avgSuccessRate: number;
  lowPerformingTools: string[];
  toolScores: Map<string, number>;
}> {
  const toolScores = new Map<string, number>();
  const lowPerformingTools: string[] = [];
  const successRates: number[] = [];

  for (const step of plan.steps) {
    const toolPerf = await ToolPerformance.findOne({ toolName: step.action }).lean();
    
    if (toolPerf) {
      const successRate = toolPerf.performance?.successRate || 0;
      toolScores.set(step.action, successRate);
      successRates.push(successRate);

      if (successRate < 0.5) {
        lowPerformingTools.push(step.action);
      }
    } else {
      // New tool, conservative score
      toolScores.set(step.action, 0.6);
      successRates.push(0.6);
    }
  }

  const avgSuccessRate = successRates.length > 0
    ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
    : 0.7; // Default

  return { avgSuccessRate, lowPerformingTools, toolScores };
}

/**
 * Validate parameters
 */
function validateParameters(plan: any): { validityScore: number; issues: string[] } {
  const issues: string[] = [];

  for (const step of plan.steps) {
    // Check if step has parameters
    if (!step.parameters || Object.keys(step.parameters).length === 0) {
      // Check if step has template markers (needs user input)
      const paramsStr = JSON.stringify(step.parameters || {});
      if (paramsStr.includes('{{') && paramsStr.includes('}}')) {
        // Has template, needs resolution
        issues.push(`Step ${step.id} has unresolved template parameters`);
      }
    }

    // Check for common parameter issues
    if (step.parameters) {
      for (const [key, value] of Object.entries(step.parameters)) {
        if (value === null || value === undefined) {
          issues.push(`Step ${step.id} has null/undefined parameter: ${key}`);
        }
      }
    }
  }

  const validityScore = issues.length === 0 ? 1.0 : Math.max(0, 1.0 - issues.length * 0.2);

  return { validityScore, issues };
}

/**
 * Compare with historical plans
 */
async function compareWithHistory(plan: any): Promise<{
  similarPlans: Array<{ planId: string; successRate: number; similarity: number }>;
  baseline: {
    avgSuccessRate: number;
    avgDuration: number;
  };
}> {
  const queryPattern = extractQueryPattern(plan.userQuery);
  const stepSequence = extractPlanPattern(plan);

  // Find similar plans
  const similarPatterns = await PlanPattern.find({
    $or: [
      { goalPattern: { $regex: queryPattern, $options: 'i' } },
    ],
  })
    .sort({ successRate: -1, usageCount: -1 })
    .limit(10)
    .lean();

  const similarPlans = similarPatterns.map((p: any) => ({
    planId: p.patternId,
    successRate: p.successRate || 0.5,
    similarity: calculateSimilarity(stepSequence, p.stepSequence || []),
  }));

  const avgSuccessRate = similarPlans.length > 0
    ? similarPlans.reduce((sum, p) => sum + p.successRate, 0) / similarPlans.length
    : 0.7;

  const avgDuration = similarPatterns.length > 0
    ? similarPatterns.reduce((sum, p) => sum + (p.avgExecutionTime || 5000), 0) / similarPatterns.length
    : 5000;

  return {
    similarPlans: similarPlans.slice(0, 5),
    baseline: {
      avgSuccessRate,
      avgDuration,
    },
  };
}

/**
 * Analyze complexity
 */
function analyzeComplexity(plan: any): { riskScore: number; factors: string[] } {
  const factors: string[] = [];
  let riskScore = 0;

  // Step count
  if (plan.steps.length > 5) {
    factors.push('High step count increases complexity');
    riskScore += 0.2;
  }

  // Dependencies
  const dependencies = plan.steps.filter((s: any) => s.dependencies && s.dependencies.length > 0);
  if (dependencies.length > 3) {
    factors.push('Many step dependencies increase failure risk');
    riskScore += 0.15;
  }

  // User input requirements
  const stepsWithTemplates = plan.steps.filter((s: any) => {
    const paramsStr = JSON.stringify(s.parameters || {});
    return paramsStr.includes('{{') && paramsStr.includes('}}');
  });
  if (stepsWithTemplates.length > 0) {
    factors.push(`Plan requires user input for ${stepsWithTemplates.length} step(s)`);
    riskScore += 0.1 * stepsWithTemplates.length;
  }

  riskScore = Math.min(1.0, riskScore);

  return { riskScore, factors };
}

/**
 * Calculate success probability
 */
function calculateSuccessProbability(analyses: any): number {
  const weights = {
    stepSequence: 0.3,
    toolPerformance: 0.3,
    parameterValidation: 0.2,
    historicalSimilarity: 0.15,
    complexity: 0.05,
  };

  const stepScore = analyses.stepAnalysis.score;
  const toolScore = analyses.toolAnalysis.avgSuccessRate;
  const paramScore = analyses.parameterAnalysis.validityScore;
  const historicalScore = analyses.historicalComparison.avgSuccessRate;
  const complexityScore = 1 - analyses.complexityAnalysis.riskScore;

  const probability =
    stepScore * weights.stepSequence +
    toolScore * weights.toolPerformance +
    paramScore * weights.parameterValidation +
    historicalScore * weights.historicalSimilarity +
    complexityScore * weights.complexity;

  return Math.max(0, Math.min(1, probability));
}

/**
 * Identify risk factors
 */
function identifyRiskFactors(analyses: any): Array<{
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigation?: string;
}> {
  const riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }> = [];

  // Tool performance risks
  if (analyses.toolAnalysis.lowPerformingTools.length > 0) {
    riskFactors.push({
      factor: 'low_tool_performance',
      severity: 'high',
      description: `Tools with low success rates: ${analyses.toolAnalysis.lowPerformingTools.join(', ')}`,
      mitigation: 'Consider alternative tools or review tool usage patterns',
    });
  }

  // Parameter validation risks
  if (analyses.parameterAnalysis.issues.length > 0) {
    riskFactors.push({
      factor: 'parameter_issues',
      severity: 'medium',
      description: `Parameter validation issues: ${analyses.parameterAnalysis.issues.join('; ')}`,
      mitigation: 'Review and fix parameter definitions',
    });
  }

  // Complexity risks
  if (analyses.complexityAnalysis.riskScore > 0.5) {
    riskFactors.push({
      factor: 'high_complexity',
      severity: 'medium',
      description: `High complexity: ${analyses.complexityAnalysis.factors.join('; ')}`,
      mitigation: 'Consider breaking into smaller steps or simplifying the plan',
    });
  }

  // Step sequence risks
  if (analyses.stepAnalysis.issues.length > 0) {
    riskFactors.push({
      factor: 'step_sequence_issues',
      severity: 'low',
      description: `Step sequence concerns: ${analyses.stepAnalysis.issues.join('; ')}`,
    });
  }

  return riskFactors;
}

/**
 * Generate recommendations
 */
async function generateRecommendations(args: any): Promise<Array<{
  type: 'optimization' | 'warning' | 'alternative';
  priority: 'high' | 'medium' | 'low';
  message: string;
  suggestedAction?: any;
}>> {
  const recommendations: Array<{
    type: 'optimization' | 'warning' | 'alternative';
    priority: 'high' | 'medium' | 'low';
    message: string;
    suggestedAction?: any;
  }> = [];

  const { plan, riskFactors, successProbability, toolAnalysis } = args;

  // Low success probability warning
  if (successProbability < 0.5) {
    recommendations.push({
      type: 'warning',
      priority: 'high',
      message: `Low success probability (${(successProbability * 100).toFixed(0)}%). Review plan before execution.`,
    });
  }

  // Tool performance recommendations
  if (toolAnalysis.lowPerformingTools.length > 0) {
    recommendations.push({
      type: 'alternative',
      priority: 'high',
      message: `Consider alternatives for low-performing tools: ${toolAnalysis.lowPerformingTools.join(', ')}`,
    });
  }

  // Complexity recommendations
  if (plan.steps.length > 5) {
    recommendations.push({
      type: 'optimization',
      priority: 'medium',
      message: 'Plan has many steps. Consider breaking into smaller sub-plans.',
    });
  }

  return recommendations;
}

/**
 * Determine risk level
 */
function determineRiskLevel(
  successProbability: number,
  riskFactors: Array<{ severity: string }>
): 'low' | 'medium' | 'high' | 'critical' {
  const highSeverityCount = riskFactors.filter(f => f.severity === 'high').length;
  const criticalSeverityCount = riskFactors.filter(f => f.severity === 'critical').length;

  if (criticalSeverityCount > 0 || (successProbability < 0.3 && highSeverityCount > 0)) {
    return 'critical';
  }
  if (successProbability < 0.5 || highSeverityCount > 1) {
    return 'high';
  }
  if (successProbability < 0.7 || highSeverityCount > 0) {
    return 'medium';
  }
  return 'low';
}

/**
 * Estimate duration
 */
function estimateDuration(plan: any, historicalComparison: any, toolAnalysis: any): number {
  // Use historical average if available
  if (historicalComparison.avgDuration > 0) {
    return historicalComparison.avgDuration;
  }

  // Estimate based on tool performance
  let totalDuration = 0;
  for (const step of plan.steps) {
    const toolScore = toolAnalysis.toolScores.get(step.action);
    if (toolScore) {
      // Estimate: 2000ms base + tool-specific duration
      const toolPerf = toolAnalysis.toolScores.get(step.action);
      totalDuration += toolPerf ? 2000 : 3000; // Faster if tool has good performance
    } else {
      totalDuration += 3000; // Default estimate
    }
  }

  return totalDuration || 5000; // Default 5 seconds
}

/**
 * Estimate cost
 */
function estimateCost(plan: any, toolAnalysis: any): number {
  // Rough estimate: 100 tokens per step
  const estimatedTokens = plan.steps.length * 100;
  const estimatedCost = (estimatedTokens / 1000) * 0.0015; // Average cost per 1K tokens
  return estimatedCost;
}

/**
 * Calculate confidence
 */
function calculateConfidence(historicalComparison: any): number {
  if (historicalComparison.similarPlans.length === 0) {
    return 0.3; // Low confidence if no historical data
  }
  if (historicalComparison.similarPlans.length >= 5) {
    return 0.9; // High confidence with many similar plans
  }
  return 0.5 + (historicalComparison.similarPlans.length * 0.1); // Scale with data points
}

/**
 * Calculate similarity between two step sequences
 */
function calculateSimilarity(seq1: string[], seq2: string[]): number {
  if (seq1.length === 0 && seq2.length === 0) return 1.0;
  if (seq1.length === 0 || seq2.length === 0) return 0.0;

  // Simple Jaccard similarity
  const set1 = new Set(seq1);
  const set2 = new Set(seq2);
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return intersection.size / union.size;
}

