# Extending the System

Guide to extending Agents MCP Server with custom functionality.

## Overview

This guide covers:
- Adding custom tools
- Creating custom agents
- Extending memory system
- Adding new intelligence features

## Adding Custom Tools

### 1. Define Tool Schema

```typescript
// src/tools/schemas/customSchemas.ts
import { z } from 'zod';

export const customToolSchema = z.object({
  param1: z.string(),
  param2: z.number().optional()
});
```

### 2. Create Tool Handler

```typescript
// src/tools/customTools.ts
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { customToolSchema } from './schemas/customSchemas.js';

export const customTools = {
  my_custom_tool: {
    description: 'Custom tool description',
    inputSchema: zodToJsonSchema(customToolSchema),
    handler: async (args: z.infer<typeof customToolSchema>) => {
      // Tool implementation
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ result: 'success' })
        }]
      };
    }
  }
};
```

### 3. Register Tool

```typescript
// src/tools/index.ts
export { customTools } from './customTools.js';

export const allTools = {
  // ... existing tools
  ...customTools
};
```

## Creating Custom Agents

### Custom Agent Structure

```typescript
// src/utils/customAgent.ts
export class CustomAgent {
  async process(input: string) {
    // Agent logic
    return {
      output: 'processed result',
      confidence: 0.9
    };
  }
}
```

## Extending Memory System

### Custom Memory Types

```typescript
// src/utils/memorySystem.ts
export async function storeCustomMemory(data: any) {
  // Store custom memory
  await MemoryPattern.create({
    patternType: 'custom',
    pattern: data,
    // ... other fields
  });
}
```

## Adding Intelligence Features

### Custom Predictor

```typescript
// src/utils/customPredictor.ts
export async function customPredict(input: any) {
  // Custom prediction logic
  return {
    prediction: 0.85,
    confidence: 0.9
  };
}
```

## Best Practices

1. **Follow Patterns**: Match existing tool/agent patterns
2. **Error Handling**: Always handle errors gracefully
3. **Validation**: Validate all inputs
4. **Documentation**: Document custom functionality
5. **Testing**: Write tests for custom features

## Next Steps

- [Project Structure](./project-structure.md) - Codebase organization
- [Contributing](./contributing.md) - Contribution guidelines

