# Smart Features

## Overview
Advanced intelligence features that make the system smarter: plan quality prediction, tool recommendation optimization, automatic plan refinement, and cost tracking. These features enable proactive optimization and continuous improvement.

## Why This Matters
Currently, the system:
- Doesn't predict if a plan will succeed before execution
- Doesn't optimize tool selection based on learned performance
- Doesn't automatically improve failed plans
- Doesn't track costs or optimize for efficiency

With smart features:
- Predict failures before they happen
- Optimize tool selection automatically
- Learn from failures and improve plans
- Track and optimize costs

## Feature 1: Plan Quality Predictor

### Overview
Predict the success probability of a plan before execution, allowing early intervention and optimization.

### Architecture
```
Plan Generated
    ↓
Quality Predictor (analyzes plan)
    ↓
Success Probability Score
    ↓
Risk Assessment
    ↓
Recommendations (if needed)
```

### Data Model

```typescript
interface PlanQualityPrediction {
  planId: string;
  
  // Prediction
  prediction: {
    successProbability: number; // 0-1
    confidence: number; // 0-1, confidence in prediction
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: number; // milliseconds
    estimatedCost?: number; // tokens/API calls
  };
  
  // Risk factors
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
  
  // Recommendations
  recommendations: Array<{
    type: 'optimization' | 'warning' | 'alternative';
    priority: 'high' | 'medium' | 'low';
    message: string;
    suggestedAction?: any;
  }>;
  
  // Comparison
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
  
  predictedAt: Date;
}
```

### Prediction Factors

1. **Step Sequence Analysis**
   - Check if step sequence matches successful patterns
   - Identify unusual step combinations
   - Validate dependencies

2. **Tool Performance**
   - Check tool success rates in similar contexts
   - Identify tools with low success rates
   - Check for common tool errors

3. **Parameter Validation**
   - Check if parameters match expected patterns
   - Identify missing required parameters
   - Validate parameter formats

4. **Historical Similarity**
   - Compare with similar past plans
   - Use success rates of similar plans
   - Identify patterns from failures

5. **Complexity Analysis**
   - Count steps (more steps = higher risk)
   - Count dependencies (more deps = higher risk)
   - Identify user input requirements (more inputs = higher risk)

### Implementation

```typescript
class PlanQualityPredictor {
  async predict(plan: Plan, context: ExecutionContext): Promise<PlanQualityPrediction> {
    // 1. Analyze step sequence
    const stepAnalysis = await this.analyzeStepSequence(plan);
    
    // 2. Check tool performance
    const toolAnalysis = await this.analyzeToolPerformance(plan);
    
    // 3. Validate parameters
    const parameterAnalysis = await this.validateParameters(plan);
    
    // 4. Historical comparison
    const historicalComparison = await this.compareWithHistory(plan);
    
    // 5. Complexity analysis
    const complexityAnalysis = this.analyzeComplexity(plan);
    
    // 6. Calculate success probability
    const successProbability = this.calculateSuccessProbability({
      stepAnalysis,
      toolAnalysis,
      parameterAnalysis,
      historicalComparison,
      complexityAnalysis
    });
    
    // 7. Identify risk factors
    const riskFactors = this.identifyRiskFactors({
      stepAnalysis,
      toolAnalysis,
      parameterAnalysis,
      complexityAnalysis
    });
    
    // 8. Generate recommendations
    const recommendations = await this.generateRecommendations({
      plan,
      riskFactors,
      successProbability
    });
    
    return {
      planId: plan._id.toString(),
      prediction: {
        successProbability,
        confidence: this.calculateConfidence(historicalComparison),
        riskLevel: this.determineRiskLevel(successProbability, riskFactors),
        estimatedDuration: this.estimateDuration(plan, historicalComparison),
        estimatedCost: await this.estimateCost(plan)
      },
      riskFactors,
      recommendations,
      comparison: historicalComparison,
      predictedAt: new Date()
    };
  }
  
  private calculateSuccessProbability(analyses: any): number {
    // Weighted average of factors
    const weights = {
      stepSequence: 0.3,
      toolPerformance: 0.3,
      parameterValidation: 0.2,
      historicalSimilarity: 0.15,
      complexity: 0.05
    };
    
    return (
      analyses.stepAnalysis.score * weights.stepSequence +
      analyses.toolAnalysis.avgSuccessRate * weights.toolPerformance +
      analyses.parameterAnalysis.validityScore * weights.parameterValidation +
      analyses.historicalComparison.avgSuccessRate * weights.historicalSimilarity +
      (1 - analyses.complexityAnalysis.riskScore) * weights.complexity
    );
  }
}
```

### Tool: predict_plan_quality

**Input**:
```typescript
{
  planId: string;
}
```

**Output**:
```typescript
{
  prediction: PlanQualityPrediction;
  shouldExecute: boolean; // If probability > threshold
  suggestions: string[]; // Optimization suggestions
}
```

## Feature 2: Tool Recommendation Engine

### Overview
Optimize tool selection based on learned performance, context, and success patterns.

### Architecture
```
Task Context
    ↓
Tool Recommendation Engine
    ↓
Performance Analysis
    ↓
Context Matching
    ↓
Optimized Tool Recommendations
```

### Data Model

```typescript
interface ToolRecommendation {
  requiredAction: string; // What action is needed
  context: string; // Execution context
  
  // Recommendations
  recommendations: Array<{
    toolName: string;
    confidence: number; // 0-1
    score: number; // Combined score
    reasons: string[]; // Why this tool is recommended
    
    // Performance data
    performance: {
      successRate: number;
      avgDuration: number;
      reliability: number;
    };
    
    // Context fit
    contextFit: {
      score: number;
      matches: string[];
    };
  }>;
  
  // Warnings
  warnings: Array<{
    toolName: string;
    warning: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  
  recommendedAt: Date;
}
```

### Recommendation Factors

1. **Historical Performance**
   - Success rate in similar contexts
   - Average execution time
   - Reliability score

2. **Context Matching**
   - Tool performance in this specific context
   - Parameter availability
   - Expected output match

3. **Tool Compatibility**
   - Works well with other tools in plan
   - Known good tool combinations
   - Dependency compatibility

4. **User Preferences**
   - User's preferred tools (if available)
   - Past successful tool choices

### Implementation

```typescript
class ToolRecommendationEngine {
  async recommend(
    requiredAction: string,
    context: ExecutionContext,
    plan: Plan
  ): Promise<ToolRecommendation> {
    // 1. Find candidate tools
    const candidates = await this.findCandidateTools(requiredAction);
    
    // 2. Analyze each candidate
    const analyses = await Promise.all(
      candidates.map(tool => this.analyzeTool(tool, context, plan))
    );
    
    // 3. Score and rank
    const recommendations = analyses
      .map(analysis => ({
        ...analysis,
        score: this.calculateScore(analysis)
      }))
      .sort((a, b) => b.score - a.score);
    
    // 4. Generate warnings
    const warnings = this.generateWarnings(analyses);
    
    return {
      requiredAction,
      context: context.description,
      recommendations,
      warnings,
      recommendedAt: new Date()
    };
  }
  
  private calculateScore(analysis: any): number {
    const weights = {
      successRate: 0.4,
      contextFit: 0.3,
      compatibility: 0.2,
      userPreference: 0.1
    };
    
    return (
      analysis.performance.successRate * weights.successRate +
      analysis.contextFit.score * weights.contextFit +
      analysis.compatibility.score * weights.compatibility +
      analysis.userPreference * weights.userPreference
    );
  }
}
```

### Tool: get_tool_recommendations

**Input**:
```typescript
{
  requiredAction: string;
  context?: string;
  planId?: string; // For compatibility analysis
}
```

**Output**:
```typescript
{
  recommendations: ToolRecommendation;
  bestTool: string; // Top recommendation
}
```

## Feature 3: Automatic Plan Refinement

### Overview
Automatically improve plans based on failures, feedback, and learned optimizations.

### Architecture
```
Plan Execution
    ↓
Failure Detection
    ↓
Root Cause Analysis
    ↓
Plan Refinement
    ↓
Improved Plan
```

### Refinement Strategies

1. **Parameter Optimization**
   - Fix invalid parameters
   - Add missing parameters
   - Optimize parameter values

2. **Step Sequence Optimization**
   - Reorder steps for better flow
   - Add missing steps
   - Remove redundant steps

3. **Tool Substitution**
   - Replace failing tools with better alternatives
   - Use more reliable tools
   - Optimize tool combinations

4. **Dependency Resolution**
   - Fix broken dependencies
   - Add missing dependencies
   - Optimize dependency order

### Data Model

```typescript
interface PlanRefinement {
  originalPlanId: string;
  refinedPlanId: string;
  
  // Refinement details
  refinements: Array<{
    type: 'parameter_fix' | 'step_reorder' | 'tool_substitution' | 'dependency_fix';
    original: any;
    refined: any;
    reason: string;
    confidence: number;
  }>;
  
  // Analysis
  analysis: {
    rootCause: string;
    issues: string[];
    improvements: string[];
  };
  
  // Validation
  validated: boolean;
  validationResult?: {
    success: boolean;
    testRunId?: string;
  };
  
  refinedAt: Date;
}
```

### Implementation

```typescript
class PlanRefiner {
  async refine(
    failedTask: Task,
    plan: Plan
  ): Promise<PlanRefinement> {
    // 1. Analyze failure
    const analysis = await this.analyzeFailure(failedTask, plan);
    
    // 2. Generate refinements
    const refinements = await this.generateRefinements(analysis, plan);
    
    // 3. Create refined plan
    const refinedPlan = await this.createRefinedPlan(plan, refinements);
    
    // 4. Validate refinement
    const validation = await this.validateRefinement(refinedPlan);
    
    return {
      originalPlanId: plan._id.toString(),
      refinedPlanId: refinedPlan._id.toString(),
      refinements,
      analysis,
      validated: validation.success,
      validationResult: validation,
      refinedAt: new Date()
    };
  }
  
  private async analyzeFailure(task: Task, plan: Plan): Promise<FailureAnalysis> {
    // Identify failed step
    const failedStep = task.executionHistory.find(e => e.status === 'failed');
    
    // Analyze error
    const errorAnalysis = this.analyzeError(failedStep.error);
    
    // Check parameter issues
    const parameterIssues = this.checkParameters(plan.steps.find(s => s.id === failedStep.stepId));
    
    // Check tool issues
    const toolIssues = await this.checkToolIssues(failedStep);
    
    return {
      failedStep: failedStep.stepId,
      rootCause: this.determineRootCause(errorAnalysis, parameterIssues, toolIssues),
      issues: [errorAnalysis, parameterIssues, toolIssues].flat(),
      context: {
        stepOutputs: task.stepOutputs,
        userInputs: task.userInputs
      }
    };
  }
}
```

### Tool: refine_plan

**Input**:
```typescript
{
  taskId: string; // Failed task
  autoExecute?: boolean; // Auto-execute refined plan
}
```

**Output**:
```typescript
{
  refinement: PlanRefinement;
  refinedPlan: Plan;
  shouldExecute: boolean;
}
```

## Feature 4: Cost Tracking & Optimization

### Overview
Track token usage, API calls, and costs. Optimize for efficiency.

### Data Model

```typescript
interface CostMetrics {
  taskId: string;
  planId: string;
  
  // Token usage
  tokens: {
    input: number;
    output: number;
    total: number;
    byAgent: Record<string, number>; // thought, planner, executor
  };
  
  // API calls
  apiCalls: {
    total: number;
    byTool: Record<string, number>;
    byProvider: Record<string, number>;
  };
  
  // Cost estimation
  cost: {
    estimated: number; // USD
    byAgent: Record<string, number>;
    byTool: Record<string, number>;
    currency: string;
  };
  
  // Efficiency
  efficiency: {
    tokensPerStep: number;
    tokensPerSecond: number;
    costPerSuccess: number;
  };
  
  trackedAt: Date;
}
```

### Cost Tracking

```typescript
class CostTracker {
  async trackTaskExecution(task: Task, plan: Plan): Promise<CostMetrics> {
    // 1. Collect token usage from AI calls
    const tokenUsage = await this.collectTokenUsage(task);
    
    // 2. Count API calls
    const apiCalls = this.countApiCalls(task);
    
    // 3. Calculate costs
    const cost = await this.calculateCost(tokenUsage, apiCalls);
    
    // 4. Calculate efficiency
    const efficiency = this.calculateEfficiency(task, tokenUsage, cost);
    
    return {
      taskId: task._id.toString(),
      planId: plan._id.toString(),
      tokens: tokenUsage,
      apiCalls,
      cost,
      efficiency,
      trackedAt: new Date()
    };
  }
  
  private async calculateCost(
    tokens: TokenUsage,
    apiCalls: ApiCalls
  ): Promise<CostEstimate> {
    // Get pricing from agent configs
    const pricing = await this.getPricing();
    
    // Calculate token costs
    const tokenCost = (
      tokens.input * pricing.inputTokenPrice +
      tokens.output * pricing.outputTokenPrice
    );
    
    // Calculate API call costs
    const apiCost = Object.entries(apiCalls.byTool).reduce(
      (sum, [tool, count]) => sum + (count * pricing.toolCallPrice),
      0
    );
    
    return {
      estimated: tokenCost + apiCost,
      byAgent: this.allocateByAgent(tokens, pricing),
      byTool: this.allocateByTool(apiCalls, pricing),
      currency: 'USD'
    };
  }
}
```

### Cost Optimization

```typescript
class CostOptimizer {
  async optimize(plan: Plan, costBudget?: number): Promise<Optimization> {
    // 1. Analyze current cost
    const currentCost = await this.estimateCost(plan);
    
    // 2. Identify optimization opportunities
    const opportunities = await this.identifyOpportunities(plan);
    
    // 3. Generate optimized plan
    const optimizedPlan = await this.optimizePlan(plan, opportunities, costBudget);
    
    // 4. Calculate savings
    const savings = currentCost - await this.estimateCost(optimizedPlan);
    
    return {
      originalPlan: plan,
      optimizedPlan,
      savings: {
        tokens: savings.tokens,
        cost: savings.cost,
        percentage: (savings.cost / currentCost) * 100
      },
      optimizations: opportunities
    };
  }
  
  private async identifyOpportunities(plan: Plan): Promise<OptimizationOpportunity[]> {
    const opportunities: OptimizationOpportunity[] = [];
    
    // Check for expensive tools
    for (const step of plan.steps) {
      const toolCost = await this.getToolCost(step.action);
      if (toolCost > this.thresholds.expensive) {
        opportunities.push({
          type: 'tool_substitution',
          step: step.id,
          currentTool: step.action,
          suggestedTool: await this.findCheaperAlternative(step.action),
          potentialSavings: toolCost - await this.getToolCost(suggestedTool)
        });
      }
    }
    
    // Check for redundant steps
    const redundantSteps = this.findRedundantSteps(plan);
    if (redundantSteps.length > 0) {
      opportunities.push({
        type: 'step_removal',
        steps: redundantSteps,
        potentialSavings: await this.estimateSavings(redundantSteps)
      });
    }
    
    return opportunities;
  }
}
```

### Tools

#### 1. track_cost
**Purpose**: Track costs for a task execution

**Input**:
```typescript
{
  taskId: string;
}
```

**Output**:
```typescript
{
  costMetrics: CostMetrics;
  summary: {
    totalCost: number;
    efficiency: number;
    recommendations: string[];
  };
}
```

#### 2. optimize_cost
**Purpose**: Optimize plan for cost efficiency

**Input**:
```typescript
{
  planId: string;
  costBudget?: number;
}
```

**Output**:
```typescript
{
  optimization: Optimization;
  shouldApply: boolean;
}
```

## Integration Points

1. **Before Plan Execution**: Predict quality, optimize tools
2. **During Execution**: Track costs in real-time
3. **After Failure**: Auto-refine plan
4. **Periodic**: Optimize based on learned patterns

## Success Metrics

- **Prediction Accuracy**: % of correct success/failure predictions
- **Tool Optimization**: Improvement in tool selection accuracy
- **Refinement Success**: % of refined plans that succeed
- **Cost Reduction**: % reduction in costs over time
- **Efficiency Improvement**: Improvement in tokens/cost per success

## Future Enhancements

1. **ML-Based Predictions**: Use ML models for better predictions
2. **Real-Time Optimization**: Optimize during execution
3. **Multi-Objective Optimization**: Balance cost, speed, quality
4. **Predictive Costing**: Predict costs before execution
5. **Budget Management**: Enforce cost budgets

