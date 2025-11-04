# Waste Management MCP Server

A Model Context Protocol (MCP) server built with TypeScript and Mongoose for managing facilities, contaminants, inspections, shipments, and contracts data.

## Features

- **HTTP + SSE Transport**: Accessible over the internet via URL
- **5 Collections**: Facilities, Contaminants, Inspections, Shipments, and Contracts
- **30+ Tools**: Full CRUD operations plus AI-powered intelligent tools
- **MCP Sampling Support**: AI-assisted analysis and decision making
- **Mongoose ODM**: Schema validation and relationships between collections
- **TypeScript**: Type-safe development
- **RESTful Health Checks**: Monitor server and database status
- **4 Prompts**: Pre-configured prompts for AI-assisted workflows
- **Dynamic Resources**: Real-time data access via MCP resources

## Prerequisites

- Node.js 18+ 
- MongoDB (local or remote instance)
- npm or yarn

## Installation

1. Clone the repository and navigate to the project directory:

```bash
cd mcp-server
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:

```env
MONGODB_URI=mongodb://localhost:27017/mcp-server
PORT=3000
NODE_ENV=development
```

## Usage

### Development Mode

Run with hot reload:

```bash
npm run dev
```

### Production Mode

Build and run:

```bash
npm run build
npm start
```

## Server Endpoints

- **Root**: `http://localhost:3000/` - Server information
- **SSE**: `http://localhost:3000/sse` - MCP SSE connection endpoint
- **Messages**: `http://localhost:3000/messages` - POST endpoint for MCP messages
- **Health**: `http://localhost:3000/health` - Health check endpoint

## Connecting MCP Clients

### Using with Cursor

Add to your Cursor MCP settings (`~/.cursor/mcp.json` or workspace settings):

```json
{
  "mcpServers": {
    "waste-management": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

For remote servers, replace `localhost:3000` with your server's URL.

### Using with Other MCP Clients

Configure the client to connect to the SSE endpoint: `http://your-server-url:3000/sse`

## Available Tools

### Facilities (5 tools)
- `create_facility` - Create a new facility
- `get_facility` - Get facility by ID
- `list_facilities` - List all facilities with optional filters
- `update_facility` - Update facility by ID
- `delete_facility` - Delete facility by ID

### Contaminants (5 tools)
- `create_contaminant` - Create a new contaminant record
- `get_contaminant` - Get contaminant by ID
- `list_contaminants` - List all contaminants with optional filters
- `update_contaminant` - Update contaminant by ID
- `delete_contaminant` - Delete contaminant by ID

### Inspections (5 tools)
- `create_inspection` - Create a new inspection
- `get_inspection` - Get inspection by ID
- `list_inspections` - List all inspections with optional filters
- `update_inspection` - Update inspection by ID
- `delete_inspection` - Delete inspection by ID

### Shipments (5 tools)
- `create_shipment` - Create a new shipment
- `get_shipment` - Get shipment by ID
- `list_shipments` - List all shipments with optional filters
- `update_shipment` - Update shipment by ID
- `delete_shipment` - Delete shipment by ID

### Contracts (5 tools)
- `create_contract` - Create a new contract
- `get_contract` - Get contract by ID
- `list_contracts` - List all contracts with optional filters
- `update_contract` - Update contract by ID
- `delete_contract` - Delete contract by ID

## AI-Powered Tools with Sampling

The server now includes **MCP Sampling** capabilities, allowing tools to request AI assistance during execution. These intelligent tools combine database queries with AI analysis to provide actionable insights.

### Intelligent Analysis Tools (3 tools)

#### `generate_intelligent_facility_report`
Generate comprehensive facility reports with AI-powered health scores, risk assessments, and recommendations.

**Parameters:**
- `facilityId` (required) - Facility to analyze
- `includeRecommendations` (optional) - Include AI-generated recommendations

**What it provides:**
- Overall facility health score (0-100)
- Top concerns and risk areas
- Compliance risk level assessment
- Actionable recommendations
- Comprehensive metrics and historical data

#### `analyze_shipment_risk`
Perform AI-powered risk assessment for shipments based on contamination history and patterns.

**Parameters:**
- `shipmentId` (required) - Shipment to analyze

**What it provides:**
- AI-generated risk score (0-100)
- Risk factors and reasoning
- Source history analysis
- Recommended actions
- Detailed contamination breakdown

#### `suggest_inspection_questions`
Generate customized inspection checklists using AI elicitation and analysis.

**Parameters:**
- `facilityId` (required) - Facility to generate questions for

**What it provides:**
- AI-selected focus area (contamination, acceptance, processing, or compliance)
- Customized inspection questions (5-7 targeted questions)
- Facility-specific metrics and concerns
- Additional notes based on risk indicators

### How Sampling Works

When you call these tools, the server:
1. Fetches relevant data from MongoDB
2. Requests AI analysis from the connected MCP client
3. Combines raw data with AI insights
4. Returns comprehensive, actionable results

**Example:**
```json
{
  "name": "generate_intelligent_facility_report",
  "arguments": {
    "facilityId": "65f1234567890abcdef12345",
    "includeRecommendations": true
  }
}
```

### Learn More

- **[Sampling Guide](docs/docs/guides/sampling-guide.md)** - Detailed guide on using AI-powered tools
- **[Testing Instructions](SAMPLING_TEST_INSTRUCTIONS.md)** - Step-by-step testing with MCP Inspector
- **[MCP Specification](https://spec.modelcontextprotocol.io/specification/client/sampling/)** - Official sampling documentation

## Data Models

### Facility
- `name`: string
- `shortCode`: string (unique)
- `location`: string
- `timestamps`: createdAt, updatedAt

### Contaminant
- `wasteItemDetected`: string
- `material`: string
- `facilityId`: ObjectId (ref: Facility)
- `detection_time`: Date
- `explosive_level`: enum (low, medium, high)
- `hcl_level`: enum (low, medium, high)
- `so2_level`: enum (low, medium, high)
- `estimated_size`: number
- `shipment_id`: string
- `timestamps`: createdAt, updatedAt

### Inspection
- `facility_id`: ObjectId (ref: Facility)
- `is_delivery_accepted`: boolean
- `does_delivery_meets_conditions`: boolean
- `selected_wastetypes`: array of {category: string, percentage: string}
- `heating_value_calculation`: number
- `waste_producer`: string
- `contract_reference_id`: string
- `timestamps`: createdAt, updatedAt

### Shipment
- `entry_timestamp`: Date
- `exit_timestamp`: Date
- `source`: string
- `facilityId`: ObjectId (ref: Facility)
- `license_plate`: string
- `contract_reference_id`: string
- `contractId`: string
- `timestamps`: createdAt, updatedAt

### Contract
- `producerName`: string
- `debitorName`: string
- `wasteCode`: string
- `timestamps`: createdAt, updatedAt

## Deployment

### Deploy to Railway

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login and deploy:
```bash
railway login
railway init
railway up
```

3. Set environment variables in Railway dashboard:
- `MONGODB_URI`
- `PORT` (Railway will set this automatically)
- `NODE_ENV=production`

### Deploy to Other Platforms

The server can be deployed to any platform that supports Node.js applications:
- Heroku
- AWS (EC2, ECS, Lambda)
- Google Cloud Platform
- DigitalOcean
- Vercel (with serverless functions)

Make sure to:
1. Set the required environment variables
2. Use a production MongoDB instance (e.g., MongoDB Atlas)
3. Configure CORS if needed for specific domains

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── models/          # Mongoose schemas
│   │   ├── Facility.ts
│   │   ├── Contaminant.ts
│   │   ├── Inspection.ts
│   │   ├── Shipment.ts
│   │   ├── Contract.ts
│   │   └── index.ts
│   ├── tools/           # MCP tool implementations
│   │   ├── facilityTools.ts
│   │   ├── contaminantTools.ts
│   │   ├── inspectionTools.ts
│   │   ├── shipmentTools.ts
│   │   ├── contractTools.ts
│   │   └── index.ts
│   ├── db.ts           # Database connection
│   ├── config.ts       # Configuration management
│   └── index.ts        # Main server entry point
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT

## Support

For issues, questions, or contributions, please open an issue in the repository.

# v5-mcp-server
