# Memory & Learning

Persistent memory system that learns from executions.

## Features

- Pattern recognition and reuse
- Tool performance tracking
- User preference learning
- Insight generation

## Components

### Pattern Memory
Stores successful patterns for reuse.

### Tool Memory
Tracks tool performance and optimal contexts.

### User Preference Memory
Remembers user-specific preferences.

### Insight Memory
Stores learned rules and optimizations.

## Tools

- `query_memory` - Query memory for knowledge
- `store_insight` - Store learned insights
- `get_memory_pattern` - Get specific patterns

## Usage

```javascript
// Query memory
const memory = await callTool('query_memory', {
  query: 'create facility',
  memoryTypes: ['patterns', 'tool_memory']
});

// Store insight
await callTool('store_insight', {
  insight: 'Pattern X works well for Y',
  insightType: 'pattern',
  confidence: 0.9
});
```

See [Intelligence Systems](../intelligence/overview.md) for more details.

