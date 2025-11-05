# Tool Management

Manage tools stored in the database.

## Features

- Add, update, and remove tools
- Search tools by description
- Filter by source (local/remote)
- Validate tool schemas

## Tools

- `add_tool` - Add a new tool
- `get_tool` - Get tool by name
- `list_tools` - List all tools
- `update_tool` - Update a tool
- `remove_tool` - Remove a tool

## Usage

```javascript
// Add a tool
await callTool('add_tool', {
  name: 'my_tool',
  description: 'Tool description',
  inputSchema: { /* JSON schema */ },
  source: 'local'
});

// List tools
const tools = await callTool('list_tools', {});

// Search tools
const results = await callTool('get_tool_for_user_prompt', {
  userPrompt: 'create a new facility'
});
```

See [Search & Discovery](../api-reference/tools.md) for more details.

