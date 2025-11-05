# Core Components

Detailed breakdown of the core components in Agents MCP Server.

## MCP Server

The main HTTP server that handles JSON-RPC 2.0 requests.

### Responsibilities
- Parse and validate JSON-RPC requests
- Route requests to appropriate handlers
- Handle initialization and capability negotiation
- Manage tool discovery and execution
- Provide health check endpoints

### Key Files
- `src/index.ts` - Main server entry point
- `src/config.ts` - Configuration management

## Tool System

Manages tools stored in the database and provides execution capabilities.

### Components

#### Tool Storage
- Database persistence via Mongoose
- Vector embeddings in Pinecone for semantic search
- Metadata tracking (source, entity type, operation type)

#### Tool Execution
- Schema validation
- Parameter extraction
- Remote tool execution via MCP client
- Error handling and retries

#### Tool Discovery
- Semantic search using Pinecone
- Keyword matching
- Category filtering

### Key Files
- `src/tools/management/toolTools.ts` - Tool CRUD operations
- `src/tools/mcpClientTools.ts` - Remote tool execution
- `src/utils/mcpClient.ts` - MCP client implementation

## Agent System

Three-layer architecture for intelligent task execution.

### Thought Agent

**Purpose**: Analyzes user queries and generates structured reasoning.

**Process**:
1. Receives user query
2. Queries memory for similar tasks
3. Generates structured thought object
4. Identifies goals, constraints, and considerations

**Output**: Thought object with:
- Goals
- Constraints
- Considerations
- Recommended approach

**Key Files**: `src/utils/thoughtGenerator.ts`

### Planner Agent

**Purpose**: Converts thoughts into executable plans.

**Process**:
1. Receives thought object
2. Queries tool performance data
3. Creates step-by-step plan
4. Handles dependencies
5. Extracts parameters

**Output**: Plan with:
- Steps with dependencies
- Tool names
- Parameter templates
- Validation rules

**Key Files**: `src/utils/planGenerator.ts`

### Executor Agent

**Purpose**: Executes plans step-by-step.

**Process**:
1. Receives plan
2. Executes steps in dependency order
3. Handles user prompts
4. Manages retries and errors
5. Stores execution results

**Output**: Task execution results with:
- Step outputs
- Final result
- Execution metrics
- Learnings

**Key Files**: `src/utils/taskExecutor.ts`

## Memory System

Persistent learning system that stores and retrieves knowledge.

### Components

#### Pattern Memory
- Stores successful patterns
- Query patterns, plan patterns, tool sequences
- Success metrics and evidence

#### Tool Memory
- Tracks tool performance
- Success rates, common errors
- Optimal contexts

#### User Preference Memory
- User-specific preferences
- Parameter defaults
- Workflow preferences

#### Insight Memory
- Learned rules and optimizations
- Warnings and best practices
- Agent-specific insights

### Key Files
- `src/utils/memorySystem.ts` - Core memory operations
- `src/utils/patternExtractor.ts` - Pattern extraction
- `src/utils/userPreferenceLearner.ts` - User preference learning

## Intelligence Features

Smart features that enhance decision-making.

### Plan Quality Predictor

Predicts plan success probability before execution.

**Factors**:
- Step complexity
- Tool performance history
- Parameter validation
- Historical comparison

**Key Files**: `src/utils/planQualityPredictor.ts`

### Tool Recommendation Engine

Recommends optimal tools for specific actions.

**Factors**:
- Tool performance metrics
- Context matching
- Success patterns
- Cost considerations

**Key Files**: `src/utils/toolRecommendationEngine.ts`

### Plan Refiner

Automatically improves failed plans.

**Process**:
1. Analyzes failure reason
2. Finds similar successful plans
3. Suggests improvements
4. Refines plan structure

**Key Files**: `src/utils/planRefiner.ts`

### Cost Tracker

Tracks token usage and API costs.

**Features**:
- Per-task cost tracking
- Model-specific costs
- Cost optimization suggestions

**Key Files**: `src/utils/costTracker.ts`, `src/utils/costOptimizer.ts`

## Benchmark Suite

Performance tracking and quality assurance.

### Components

#### Test Definitions
- Test cases with expected outcomes
- Categories (CRUD, complex, error handling)
- Priority levels

#### Execution Engine
- Runs tests
- Collects metrics
- Compares with baselines

#### Regression Detection
- Compares current vs historical performance
- Detects degradations
- Alerts on regressions

### Key Files
- `src/utils/benchmarkRunner.ts` - Test execution
- `src/utils/testSuites.ts` - Standard test suites

## Database Layer

MongoDB with Mongoose ODM for data persistence.

### Models

#### Core Models
- Tool, AgentConfig, AvailableModel
- Thought, Plan, Task, Request
- Prompt, Resource

#### Intelligence Models
- MemoryPattern, ToolPerformance
- UserPreference, AgentInsight
- BenchmarkTest, BenchmarkRun
- CostTracking, PlanQualityPrediction

### Key Files
- `src/models/` - All Mongoose models
- `src/db.ts` - Database connection

## Vector Search

Pinecone integration for semantic similarity search.

### Use Cases
- Tool discovery by description
- Prompt search
- Task similarity
- Parameter memory

### Key Files
- `src/utils/pinecone.ts` - Pinecone client

## Next Steps

- Learn about [Data Models](./data-models.md)
- Understand [Request Flow](./request-flow.md)
- Explore [MCP Integration](./mcp-integration.md)

