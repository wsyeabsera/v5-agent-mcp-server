# Pattern Extraction Guide

How patterns are extracted and used.

## Overview

Patterns are automatically extracted from successful executions:
- Query patterns
- Plan patterns
- Tool sequences
- Error patterns

## Querying Patterns

```javascript
const pattern = await callTool('get_memory_pattern', {
  patternType: 'plan_pattern',
  pattern: 'create_*_for_facility'
});
```

## Pattern Types

### Query Patterns
Common query structures that work well.

### Plan Patterns
Successful step sequences for goals.

### Tool Sequences
Optimal tool orderings.

### Error Patterns
Common failure patterns to avoid.

## Benefits

- Automatic pattern reuse
- Improved success rates
- Faster execution
- Reduced errors

Patterns are automatically used by the system to improve future executions.

