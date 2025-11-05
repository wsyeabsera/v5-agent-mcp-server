# Testing

Testing guidelines and practices.

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- test-file.spec.ts
```

## Test Structure

Tests are organized by feature:
- Unit tests for utilities
- Integration tests for tools
- End-to-end tests for workflows

## Writing Tests

```typescript
describe('Tool Execution', () => {
  it('should execute tool successfully', async () => {
    const result = await callTool('tool_name', {});
    expect(result).toBeDefined();
  });
});
```

## Test Coverage

- Aim for high test coverage
- Test error cases
- Test edge cases
- Test integration points

## Best Practices

- Use descriptive test names
- Test one thing per test
- Use mocks for external dependencies
- Clean up after tests

