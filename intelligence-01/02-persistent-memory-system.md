# Persistent Memory System

## Overview
A centralized memory layer that learns from all task executions, stores successful patterns, tracks tool performance, and remembers user preferences. This system enables the AI to improve over time and make smarter decisions based on accumulated knowledge.

## Why This Matters
Currently, the system has no persistent learning. Each execution is independent. With a memory system:
- The system learns from every execution
- Patterns are identified and reused
- Tool performance is tracked and optimized
- User preferences are remembered
- Common errors are avoided

## Architecture

```
Task Execution
    ↓
Memory System (observes & learns)
    ↓
Pattern Extraction
    ↓
Knowledge Storage
    ↓
Agent Queries (retrieves learned knowledge)
```

## Core Components

### 1. Pattern Memory
Stores successful patterns that can be reused

### 2. Tool Memory
Tracks tool performance and optimal usage

### 3. User Preference Memory
Remembers user-specific preferences and corrections

### 4. Insight Memory
Stores learned insights and rules

## Data Models

### MemoryPattern
```typescript
{
  patternId: string;
  patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern';
  
  // Pattern definition
  pattern: {
    query?: string; // Query pattern (e.g., "create_*_for_*")
    goal?: string; // Goal pattern
    steps?: string[]; // Step sequence pattern
    context?: string; // Context pattern
  };
  
  // Success metrics
  successMetrics: {
    successRate: number; // 0-1
    avgExecutionTime: number;
    avgSteps: number;
    reliability: number; // Consistency score
  };
  
  // Usage tracking
  usageCount: number;
  lastUsed: Date;
  firstSeen: Date;
  
  // Evidence
  evidence: Array<{
    taskId: string;
    planId: string;
    outcome: 'success' | 'failure';
    timestamp: Date;
  }>;
  
  // Confidence
  confidence: number; // 0-1, based on evidence quality
  validatedAt: Date;
}
```

### ToolMemory
```typescript
{
  toolName: string;
  
  // Performance metrics
  performance: {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number; // 0-1
    avgDuration: number; // milliseconds
    avgRetries: number;
  };
  
  // Context analysis
  optimalContexts: Array<{
    context: string; // e.g., "facility_management", "shipment_creation"
    successRate: number;
    avgDuration: number;
    usageCount: number;
  }>;
  
  // Common errors
  commonErrors: Array<{
    error: string;
    frequency: number;
    percentage: number;
    contexts: string[]; // When this error occurs
    solutions: string[]; // Known solutions
  }>;
  
  // Parameter insights
  parameterInsights: Array<{
    parameter: string;
    optimalValue: any; // Most successful value
    valuePattern: string; // Pattern in successful values
    importance: number; // 0-1, how critical this param is
  }>;
  
  // Recommendations
  recommendations: Array<{
    type: 'warning' | 'optimization' | 'best_practice';
    message: string;
    confidence: number;
    evidence: string[];
  }>;
  
  lastUpdated: Date;
  lastAnalyzed: Date;
}
```

### UserPreference
```typescript
{
  userId?: string; // Optional, for multi-user systems
  userContext: string; // Context identifier
  
  // Preferences
  preferences: {
    toolPreferences: Record<string, number>; // Tool -> preference score
    parameterDefaults: Record<string, any>; // Default parameter values
    workflowPreferences: string[]; // Preferred workflows
    errorHandling: 'strict' | 'lenient'; // How to handle errors
  };
  
  // Learned from corrections
  corrections: Array<{
    original: any;
    corrected: any;
    context: string;
    timestamp: Date;
  }>;
  
  // Behavior patterns
  patterns: Array<{
    pattern: string;
    frequency: number;
    context: string;
  }>;
  
  lastUpdated: Date;
}
```

### LearnedInsight
```typescript
{
  insightId: string;
  insightType: 'rule' | 'optimization' | 'warning' | 'pattern' | 'best_practice';
  
  // Insight content
  insight: string; // Human-readable insight
  rule: string; // Machine-readable rule (optional)
  
  // Applicability
  appliesTo: {
    agents?: string[]; // Which agents this applies to
    contexts?: string[]; // When this applies
    conditions?: Record<string, any>; // Conditions for applicability
  };
  
  // Evidence
  evidence: Array<{
    taskId: string;
    description: string;
    timestamp: Date;
  }>;
  
  // Confidence
  confidence: number; // 0-1
  evidenceStrength: number; // Quality of evidence
  
  // Validation
  validated: boolean;
  validatedAt?: Date;
  validatedBy?: string; // 'system' | 'user' | 'agent'
  
  // Usage
  usageCount: number;
  lastUsed: Date;
  
  createdAt: Date;
  lastUpdated: Date;
}
```

## Memory Operations

### 1. Observe (Automatic)
**Triggered after each task execution**

```typescript
async function observeTaskExecution(task: Task, plan: Plan, thought: Thought) {
  // Extract patterns
  await extractPatterns(task, plan, thought);
  
  // Update tool performance
  await updateToolPerformance(task);
  
  // Store insights
  await extractInsights(task, plan);
  
  // Learn from outcomes
  await learnFromOutcome(task, plan);
}
```

### 2. Remember (Query)
**Agents query memory for learned knowledge**

```typescript
async function remember(pattern: string, context: string): Promise<Memory> {
  // Find relevant patterns
  const patterns = await findPatterns(pattern, context);
  
  // Get tool recommendations
  const toolMemory = await getToolMemory(context);
  
  // Get relevant insights
  const insights = await getInsights(context);
  
  return { patterns, toolMemory, insights };
}
```

### 3. Learn (Process)
**Background processing to extract deeper insights**

```typescript
async function learn() {
  // Analyze patterns for commonalities
  await identifyPatterns();
  
  // Optimize tool recommendations
  await optimizeToolMemory();
  
  // Generate new insights
  await generateInsights();
  
  // Validate existing insights
  await validateInsights();
}
```

## Pattern Extraction

### Query Pattern Extraction
```typescript
function extractQueryPattern(query: string): string {
  // "Create a shipment for facility HAN" 
  // → "create_*_for_facility_*"
  
  // Replace specific values with wildcards
  const pattern = query
    .replace(/\b[A-Z]{2,}\b/g, '*') // Facility codes
    .replace(/\b\d+\b/g, '*') // Numbers
    .replace(/\b[\w-]+@[\w-]+\.\w+\b/g, '*') // Emails
    .toLowerCase()
    .replace(/\s+/g, '_');
  
  return pattern;
}
```

### Plan Pattern Extraction
```typescript
function extractPlanPattern(plan: Plan): string[] {
  // Extract step sequence
  return plan.steps.map(step => step.action);
  
  // Example: ["list_facilities", "create_shipment"]
}
```

### Tool Sequence Pattern
```typescript
function extractToolSequence(plan: Plan): string {
  // Create a pattern string
  const sequence = plan.steps.map(s => s.action).join(' → ');
  return sequence;
  
  // Example: "list_facilities → create_shipment"
}
```

## Tool Memory Operations

### Update Tool Performance
```typescript
async function updateToolPerformance(task: Task) {
  for (const step of task.executionHistory) {
    const toolName = step.action;
    
    await ToolMemory.findOneAndUpdate(
      { toolName },
      {
        $inc: {
          'performance.totalExecutions': 1,
          'performance.successCount': step.status === 'completed' ? 1 : 0,
          'performance.failureCount': step.status === 'failed' ? 1 : 0,
        },
        $push: {
          'performance.durations': step.duration,
        },
        $set: {
          'performance.lastUpdated': new Date(),
        }
      },
      { upsert: true }
    );
  }
  
  // Recalculate aggregates
  await recalculateToolMetrics(toolName);
}
```

### Get Tool Recommendations
```typescript
async function getToolRecommendations(
  context: string,
  requiredAction: string
): Promise<ToolRecommendation[]> {
  // Find tools that match the action
  const tools = await findToolsByAction(requiredAction);
  
  // Get performance in this context
  const toolMemory = await ToolMemory.find({
    toolName: { $in: tools },
    'optimalContexts.context': context
  });
  
  // Rank by success rate in context
  return toolMemory
    .map(tm => ({
      toolName: tm.toolName,
      successRate: tm.optimalContexts.find(c => c.context === context)?.successRate || 0,
      recommendation: generateRecommendation(tm, context)
    }))
    .sort((a, b) => b.successRate - a.successRate);
}
```

## Insight Generation

### Automatic Insight Generation
```typescript
async function generateInsights() {
  // Analyze patterns for insights
  const patterns = await MemoryPattern.find({ usageCount: { $gte: 5 } });
  
  for (const pattern of patterns) {
    if (pattern.successMetrics.successRate > 0.9) {
      // High success rate → positive insight
      await LearnedInsight.create({
        insightType: 'best_practice',
        insight: `Using pattern "${pattern.pattern}" has ${(pattern.successMetrics.successRate * 100).toFixed(0)}% success rate`,
        appliesTo: { contexts: [pattern.pattern.context] },
        confidence: pattern.successMetrics.successRate,
        evidence: pattern.evidence.map(e => ({
          taskId: e.taskId,
          description: 'Successful execution',
          timestamp: e.timestamp
        }))
      });
    }
  }
  
  // Analyze errors for warnings
  const commonErrors = await analyzeCommonErrors();
  for (const error of commonErrors) {
    await LearnedInsight.create({
      insightType: 'warning',
      insight: `Common error: ${error.error}. Solution: ${error.solution}`,
      appliesTo: { contexts: error.contexts },
      confidence: error.frequency > 0.1 ? 0.8 : 0.5,
      evidence: error.evidence
    });
  }
}
```

## User Preference Learning

### Learn from Corrections
```typescript
async function learnFromCorrection(
  userContext: string,
  original: any,
  corrected: any,
  context: string
) {
  await UserPreference.findOneAndUpdate(
    { userContext },
    {
      $push: {
        corrections: {
          original,
          corrected,
          context,
          timestamp: new Date()
        }
      }
    },
    { upsert: true }
  );
  
  // Extract preference patterns
  await extractPreferencePatterns(userContext);
}
```

## Memory Query APIs

### 1. query_memory
**Purpose**: Query memory for relevant knowledge

**Input**:
```typescript
{
  query: string; // What to look for
  memoryTypes?: ('patterns' | 'tool_memory' | 'insights' | 'preferences')[];
  context?: string;
  limit?: number;
}
```

**Output**:
```typescript
{
  patterns: MemoryPattern[];
  toolMemory: ToolMemory[];
  insights: LearnedInsight[];
  preferences: UserPreference[];
}
```

### 2. get_memory_pattern
**Purpose**: Get a specific pattern

**Input**:
```typescript
{
  patternType: string;
  pattern: string;
}
```

### 3. store_insight
**Purpose**: Manually store an insight (for agents)

**Input**:
```typescript
{
  insight: string;
  insightType: string;
  appliesTo: object;
  evidence: Array<{ taskId: string; description: string }>;
  confidence: number;
}
```

## Implementation Details

### Database Schema

**MemoryPattern Collection**:
- Index on: `patternType`, `pattern.pattern`, `successMetrics.successRate`, `usageCount`
- TTL index on `lastUsed` (optional, for cleanup)

**ToolMemory Collection**:
- Index on: `toolName`, `lastUpdated`
- Aggregated view, updated asynchronously

**UserPreference Collection**:
- Index on: `userContext`, `lastUpdated`
- Optional: TTL for session-based preferences

**LearnedInsight Collection**:
- Index on: `insightType`, `confidence`, `validated`, `appliesTo.contexts`
- Full-text search on `insight`

### Background Jobs

1. **Pattern Analysis Job** (runs hourly):
   - Analyze recent tasks for new patterns
   - Update pattern success rates
   - Validate existing patterns

2. **Tool Performance Analysis** (runs every 6 hours):
   - Recalculate tool metrics
   - Identify optimal contexts
   - Generate recommendations

3. **Insight Generation** (runs daily):
   - Generate new insights from patterns
   - Validate existing insights
   - Remove low-confidence insights

### Performance Optimization

- **Caching**: Cache frequently accessed patterns and tool memory
- **Async Processing**: Pattern extraction and insight generation run asynchronously
- **Batch Updates**: Update tool performance in batches
- **Indexing**: Proper indexes for fast queries

## Integration Points

1. **After Task Completion**:
   - Automatically observe and learn from execution
   - Extract patterns
   - Update tool memory

2. **Before Thought Generation**:
   - Query memory for similar patterns
   - Get relevant insights

3. **Before Plan Generation**:
   - Query tool memory for recommendations
   - Get pattern suggestions

4. **During Execution**:
   - Use tool memory for error prevention
   - Apply learned insights

## Success Metrics

- **Pattern Reuse Rate**: % of tasks using learned patterns
- **Tool Selection Accuracy**: Improvement in tool selection
- **Error Reduction**: Decrease in common errors
- **Insight Confidence**: Quality of generated insights
- **Response Time**: Speed of memory queries

## Future Enhancements

1. **Semantic Memory**: Store semantic relationships between concepts
2. **Episodic Memory**: Remember specific execution episodes
3. **Meta-Learning**: Learn how to learn better
4. **Federated Learning**: Share learnings across instances

