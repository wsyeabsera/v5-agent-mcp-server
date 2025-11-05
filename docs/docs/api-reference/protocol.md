# JSON-RPC 2.0 Protocol

Agents MCP Server uses JSON-RPC 2.0 for all communication.

## Protocol Overview

JSON-RPC is a stateless, light-weight remote procedure call (RPC) protocol. All requests and responses are JSON objects.

## Request Format

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "method": "method_name",
  "params": {
    // Method-specific parameters
  }
}
```

### Required Fields

- `jsonrpc`: Must be `"2.0"`
- `id`: Unique identifier (string or number)
- `method`: The method to call
- `params`: Method parameters (object)

## Response Format

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"result\": \"data\"}"
      }
    ],
    "isError": false
  }
}
```

### Error Response

```json
{
  "jsonrpc": "2.0",
  "id": "unique-request-id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error message"
      }
    ],
    "isError": true
  }
}
```

## Error Codes

- `-32600`: Invalid Request
- `-32601`: Method Not Found
- `-32602`: Invalid Params
- `-32603`: Internal Error

## Methods

See [Endpoints](./endpoints.md) for available methods.

