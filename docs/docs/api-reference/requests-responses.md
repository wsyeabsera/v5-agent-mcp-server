# Requests and Responses

Detailed format for requests and responses.

## Request Structure

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      "param1": "value1"
    }
  }
}
```

## Response Structure

### Success

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
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

### Error

```json
{
  "jsonrpc": "2.0",
  "id": "unique-id",
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

## Parsing Responses

```javascript
const response = await fetch('/sse', {
  method: 'POST',
  body: JSON.stringify(request)
});

const data = await response.json();

if (data.result.isError) {
  throw new Error(JSON.parse(data.result.content[0].text));
}

const result = JSON.parse(data.result.content[0].text);
```

