# Pattern Recognition

Identify and reuse successful patterns.

## Overview

The system automatically identifies patterns from successful executions:
- Query patterns
- Plan patterns
- Tool sequences
- Error patterns

## Pattern Types

### Query Patterns
Common query structures that work well.

### Plan Patterns
Successful step sequences for goals.

### Tool Sequences
Optimal tool orderings for tasks.

### Error Patterns
Common failure patterns to avoid.

## Usage

Patterns are automatically extracted and stored. You can query them:

```javascript
const pattern = await callTool('get_memory_pattern', {
  patternType: 'plan_pattern',
  pattern: 'create_*_for_facility'
});
```

## Benefits

- Automatic pattern reuse
- Improved success rates
- Faster execution
- Reduced errors

