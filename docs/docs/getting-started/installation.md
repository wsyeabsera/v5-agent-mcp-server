# Installation

This guide will help you install and set up the Agents MCP Server.

## Prerequisites

Before installing, ensure you have the following:

- **Node.js** 18+ (LTS version recommended)
- **MongoDB** (local instance or MongoDB Atlas)
- **npm** or **yarn** package manager
- **Pinecone** account (for vector similarity search - optional but recommended)

## Step 1: Clone the Repository

```bash
git clone https://github.com/v5-clear-ai/agents-mcp-server.git
cd agents-mcp-server
```

## Step 2: Install Dependencies

```bash
npm install
```

Or if you prefer yarn:

```bash
yarn install
```

## Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Configure the following environment variables in `.env`:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server

# Server Configuration
PORT=3000
NODE_ENV=development

# Remote MCP Server (optional)
REMOTE_MCP_SERVER_URL=http://your-remote-mcp-server.com

# Pinecone (optional, for vector search)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_INDEX_NAME=agents-mcp-server
PINECONE_ENVIRONMENT=us-east1-gcp

# AI Model Configuration (optional)
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
```

### MongoDB Setup

#### Local MongoDB
If running MongoDB locally:

```bash
# macOS (using Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod

# Windows
# Start MongoDB service from Services panel
```

#### MongoDB Atlas
For cloud MongoDB:

1. Create an account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

### Pinecone Setup (Optional)

Pinecone is used for vector similarity search in the memory system:

1. Create an account at [Pinecone](https://www.pinecone.io/)
2. Create a new index
3. Copy your API key and index name
4. Update the Pinecone variables in `.env`

## Step 4: Build the Project

```bash
npm run build
```

This compiles TypeScript to JavaScript in the `dist/` directory.

## Step 5: Start the Server

### Development Mode

For development with hot reload:

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

## Step 6: Verify Installation

1. **Check server status**:
   ```bash
   curl http://localhost:3000/health
   ```

   Expected response:
   ```json
   {
     "status": "healthy",
     "mongodb": "connected",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **Check root endpoint**:
   ```bash
   curl http://localhost:3000/
   ```

   Should return server information including available tools count.

## Troubleshooting

### MongoDB Connection Issues

- **Error**: `MongoServerError: connect ECONNREFUSED`
  - **Solution**: Ensure MongoDB is running and the connection string is correct

- **Error**: `Authentication failed`
  - **Solution**: Check MongoDB credentials in the connection string

### Port Already in Use

- **Error**: `EADDRINUSE: address already in use :::3000`
  - **Solution**: Change the `PORT` in `.env` or stop the process using port 3000

### Build Errors

- **Error**: TypeScript compilation errors
  - **Solution**: Run `npm run build` to see detailed error messages
  - Ensure all dependencies are installed: `npm install`

## Next Steps

Once installation is complete:

- Read the [Quick Start Guide](./quick-start.md) to run your first command
- Check [Configuration](./configuration.md) for advanced settings
- Explore [Architecture](../architecture/overview.md) to understand the system design

