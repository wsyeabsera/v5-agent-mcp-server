# Project Structure

Overview of the project structure.

## Directory Layout

```
agents-mcp-server/
├── src/
│   ├── models/          # Data models
│   ├── tools/           # Tool implementations
│   ├── utils/           # Utility functions
│   ├── config.ts        # Configuration
│   ├── db.ts            # Database connection
│   └── index.ts         # Server entry point
├── docs/                # Docusaurus documentation
├── frontend-docs/       # Frontend documentation
└── package.json
```

## Key Directories

### `src/models/`
Mongoose schemas for all data models.

### `src/tools/`
Tool implementations organized by category.

### `src/utils/`
Utility functions including:
- Agent implementations
- Memory system
- Benchmark runner
- Cost tracking

## Configuration

Configuration is in `src/config.ts` and loaded from environment variables.

## Database

MongoDB is used for data persistence. Connection is configured in `src/db.ts`.

