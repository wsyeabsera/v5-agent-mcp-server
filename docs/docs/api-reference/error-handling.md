# Error Handling

How to handle errors in API responses.

## Error Types

### JSON-RPC Errors

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "error": {
    "code": -32600,
    "message": "Invalid Request"
  }
}
```

### Tool Execution Errors

```json
{
  "jsonrpc": "2.0",
  "id": "1",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "Error executing tool: ..."
      }
    ],
    "isError": true
  }
}
```

## Error Codes

- `-32600`: Invalid Request (invalid JSON-RPC format)
- `-32601`: Method Not Found
- `-32602`: Invalid Params (validation failed)
- `-32603`: Internal Error (execution error)

## Handling Errors

```javascript
try {
  const result = await callTool('tool_name', {});
} catch (error) {
  if (error.code === -32602) {
    // Invalid parameters
    console.error('Validation error:', error.message);
  } else if (error.code === -32603) {
    // Internal error
    console.error('Execution error:', error.message);
  }
}
```

## Best Practices

1. Always check `isError` flag in responses
2. Parse error messages from `content[0].text`
3. Handle network errors separately
4. Provide user-friendly error messages

