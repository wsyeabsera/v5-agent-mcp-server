# API Endpoints

Complete list of available JSON-RPC methods.

## Core Methods

### `initialize`

Initialize the MCP connection.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "method": "initialize",
  "params": {}
}
```

### `tools/list`

List all available tools.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "2",
  "method": "tools/list",
  "params": {}
}
```

### `tools/call`

Execute a tool.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "3",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {}
  }
}
```

### `tools/validate`

Validate tool parameters.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": "4",
  "method": "tools/validate",
  "params": {
    "name": "tool_name",
    "arguments": {},
    "context": {}
  }
}
```

## Available Tools

See [Tools Catalog](./tools.md) for complete list of tools.

