# Memory System

Persistent memory system that learns from all executions.

## Overview

The memory system stores:
- Successful patterns
- Tool performance metrics
- User preferences
- Learned insights

## Components

### Pattern Memory
Stores reusable patterns for queries, plans, and tool sequences.

### Tool Memory
Tracks tool performance, success rates, and optimal contexts.

### User Preference Memory
Remembers user-specific preferences and defaults.

### Insight Memory
Stores learned rules, optimizations, and warnings.

## Usage

```javascript
// Query memory
const memory = await callTool('query_memory', {
  query: 'create facility',
  memoryTypes: ['patterns', 'tool_memory']
});

// Store insight
await callTool('store_insight', {
  insight: 'Tool X works well for Y',
  insightType: 'optimization',
  confidence: 0.9
});
```

## Benefits

- Automatic pattern reuse
- Improved tool selection
- Personalized experiences
- Reduced errors

