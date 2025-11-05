# Complete Tool Management Guide

Comprehensive guide to managing tools in Agents MCP Server.

## Overview

Tool management includes:
- Adding and updating tools
- Searching for tools
- Executing tools
- Managing tool sources (local/remote)

## Adding Tools

### Add a Local Tool

```javascript
const tool = await callTool('add_tool', {
  name: 'my_custom_tool',
  description: 'A custom tool for specific operations',
  inputSchema: {
    type: 'object',
    properties: {
      param1: { type: 'string' },
      param2: { type: 'number' }
    },
    required: ['param1']
  },
  source: 'local',
  operationType: 'mutation',
  entityType: 'other'
});
```

### Add a Remote Tool

```javascript
const tool = await callTool('add_tool', {
  name: 'remote_tool',
  description: 'Tool from remote server',
  inputSchema: { /* schema */ },
  source: 'remote'
});
```

## Searching Tools

### Semantic Search

```javascript
const results = await callTool('get_tool_for_user_prompt', {
  userPrompt: 'create a new facility',
  topK: 5
});

console.log('Recommended tools:', results.tools);
```

### List All Tools

```javascript
// List all tools
const allTools = await callTool('list_tools', {});

// Filter by source
const localTools = await callTool('list_tools', {
  source: 'local'
});

const remoteTools = await callTool('list_tools', {
  source: 'remote'
});
```

## Getting Tool Details

```javascript
const tool = await callTool('get_tool', {
  name: 'create_facility'
});

console.log('Tool schema:', tool.inputSchema);
console.log('Source:', tool.source);
```

## Updating Tools

```javascript
const updated = await callTool('update_tool', {
  name: 'my_tool',
  description: 'Updated description',
  inputSchema: { /* new schema */ }
});
```

## Removing Tools

```javascript
await callTool('remove_tool', {
  name: 'my_tool'
});
```

## Initializing Tools from Remote Server

```javascript
const result = await callTool('init_tools', {
  source: 'remote',
  force: false  // Set to true to update existing tools
});

console.log('Added:', result.added);
console.log('Skipped:', result.skipped);
console.log('Total:', result.total);
```

## Tool Execution

### Execute Local Tool

```javascript
const result = await callTool('list_tools', {
  source: 'local'
});
```

### Execute Remote Tool via MCP Client

```javascript
const result = await callTool('execute_mcp_tool', {
  toolName: 'remote_tool_name',
  arguments: {
    param1: 'value1'
  }
});
```

## Best Practices

1. **Tool Naming**: Use descriptive, consistent naming
2. **Schema Validation**: Always define complete input schemas
3. **Source Tracking**: Use `source` to distinguish local vs remote
4. **Regular Updates**: Keep tools synchronized with remote servers
5. **Semantic Search**: Use semantic search for tool discovery

## Next Steps

- [Tool Reference](../api-reference/tools.md) - Complete tool catalog
- [Search & Discovery](../features/tool-management.md) - Advanced search

