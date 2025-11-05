# Request Flow

Understanding how requests flow through the Agents MCP Server.

## High-Level Flow

```mermaid
graph LR
    A[Client Request] --> B[JSON-RPC Parser]
    B --> C{Request Type}
    C -->|initialize| D[Capability Negotiation]
    C -->|tools/list| E[Tool Discovery]
    C -->|tools/call| F[Tool Execution]
    C -->|tools/validate| G[Parameter Validation]
    D --> H[Response]
    E --> H
    F --> H
    G --> H
    H --> I[Client]
```

## Detailed Request Flow

### 1. Request Reception

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant Router
    participant Validator

    Client->>Server: HTTP POST /sse
    Server->>Router: Parse JSON-RPC
    Router->>Validator: Validate JSON-RPC 2.0
    Validator-->>Router: Valid/Invalid
    Router->>Router: Route by method
```

**Location**: `src/index.ts` - Express route handler

### 2. Method Routing

The server routes requests based on the `method` field:

```typescript
// Pseudo-code
switch (method) {
  case 'initialize':
    return handleInitialize();
  case 'tools/list':
    return handleToolsList();
  case 'tools/call':
    return handleToolsCall();
  case 'tools/validate':
    return handleToolsValidate();
  default:
    return error('Method not found');
}
```

### 3. Tool Execution Flow

```mermaid
sequenceDiagram
    participant Client
    participant Server
    participant ToolHandler
    participant Validator
    participant ToolExecutor
    participant DB
    participant RemoteMCP

    Client->>Server: tools/call
    Server->>ToolHandler: Route to handler
    ToolHandler->>Validator: Validate schema
    Validator-->>ToolHandler: Valid/Invalid
    ToolHandler->>ToolExecutor: Execute tool
    alt Local Tool
        ToolExecutor->>DB: Query/Update
        DB-->>ToolExecutor: Result
    else Remote Tool
        ToolExecutor->>RemoteMCP: Execute via MCP
        RemoteMCP-->>ToolExecutor: Result
    end
    ToolExecutor-->>ToolHandler: Result
    ToolHandler-->>Server: Response
    Server-->>Client: JSON-RPC Response
```

### 4. Agent Execution Flow

When executing agent tools (Thought, Planner, Executor):

```mermaid
sequenceDiagram
    participant Client
    participant ThoughtAgent
    participant PlannerAgent
    participant ExecutorAgent
    participant Memory
    participant Tools

    Client->>ThoughtAgent: generate_thoughts
    ThoughtAgent->>Memory: Query similar tasks
    Memory-->>ThoughtAgent: Patterns
    ThoughtAgent->>ThoughtAgent: Generate thought
    ThoughtAgent-->>Client: Thought object

    Client->>PlannerAgent: generate_plan
    PlannerAgent->>Memory: Query tool performance
    PlannerAgent->>PlannerAgent: Create plan
    PlannerAgent-->>Client: Plan object

    Client->>ExecutorAgent: execute_task
    ExecutorAgent->>Tools: Execute steps
    Tools-->>ExecutorAgent: Results
    ExecutorAgent->>Memory: Store learnings
    ExecutorAgent-->>Client: Final result
```

## Error Handling

### Error Flow

```mermaid
graph TD
    A[Request] --> B{Validation}
    B -->|Invalid| C[Return Error -32600]
    B -->|Valid| D{Route}
    D -->|Method Not Found| E[Return Error -32601]
    D -->|Valid Method| F{Execute}
    F -->|Tool Error| G[Return Error -32603]
    F -->|Success| H[Return Result]
    C --> I[Client]
    E --> I
    G --> I
    H --> I
```

### Error Codes

- **-32600**: Invalid Request (invalid JSON-RPC format)
- **-32601**: Method Not Found
- **-32602**: Invalid Params (validation failed)
- **-32603**: Internal Error (execution error)

## Response Format

### Success Response

```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
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
  "id": "request-id",
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

## Performance Considerations

### Caching

- Tool schemas cached in memory
- Pinecone indexes for fast similarity search
- MongoDB connection pooling

### Optimization

- Parallel execution where possible
- Background job processing
- Efficient database queries with indexes

## Next Steps

- Learn about [MCP Integration](./mcp-integration.md)
- Explore [Core Components](./core-components.md)
- Check [API Reference](../api-reference/protocol.md)

