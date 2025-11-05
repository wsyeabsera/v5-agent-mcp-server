# Installation

This comprehensive guide will help you install and configure Agents MCP Server for development and production use.

## Prerequisites

Before installing, ensure you have the following installed and accessible:

### Required Software

- **Node.js** 18+ (LTS version 20.x recommended)
  - Download from [nodejs.org](https://nodejs.org/)
  - Verify: `node --version` should show v18.0.0 or higher
- **npm** or **yarn** package manager
  - npm comes with Node.js
  - For yarn: `npm install -g yarn`
- **Git** for cloning the repository
  - Verify: `git --version`

### Required Services

- **MongoDB** 5.0+ (local instance or MongoDB Atlas)
  - Local: [MongoDB Community Server](https://www.mongodb.com/try/download/community)
  - Cloud: [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier available)

### Optional but Recommended

- **Pinecone** account (for vector similarity search)
  - Sign up at [pinecone.io](https://www.pinecone.io/)
  - Free tier available
- **AI Model API Keys** (for agent functionality)
  - OpenAI: [platform.openai.com](https://platform.openai.com/)
  - Anthropic: [console.anthropic.com](https://console.anthropic.com/)
  - Ollama: [ollama.ai](https://ollama.ai/) (local, free)

## Step 1: Clone the Repository

Clone the repository to your local machine:

```bash
git clone https://github.com/wsyeabsera/v5-agent-mcp-server.git
cd v5-agent-mcp-server
```

Or if you're using SSH:

```bash
git clone git@github.com:wsyeabsera/v5-agent-mcp-server.git
cd v5-agent-mcp-server
```

**Verify**: Check that you're in the correct directory:
```bash
ls -la
# Should show package.json, src/, docs/, etc.
```

## Step 2: Install Dependencies

Install all project dependencies:

### Using npm

```bash
npm install
```

### Using yarn (Recommended)

```bash
yarn install
```

**Expected output**: Dependencies will be installed. This may take 1-2 minutes.

**Verify installation**:
```bash
# Check that node_modules exists
ls node_modules

# Verify TypeScript is installed
npx tsc --version
```

## Step 3: Environment Configuration

Create a `.env` file in the root directory:

```bash
# Create .env file
touch .env
```

### Environment Variables Reference

Configure the following variables in your `.env` file:

#### Required Configuration

```env
# MongoDB Connection
# Format: mongodb://[username:password@]host[:port][/database][?options]
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server

# Server Configuration
PORT=4000
NODE_ENV=development
```

#### Optional Configuration

```env
# Remote MCP Server (for fetching remote tools)
REMOTE_MCP_SERVER_URL=http://localhost:3000/sse

# Pinecone Configuration (for vector similarity search)
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_TOOLS_INDEX_NAME=agents-tools-index
PINECONE_PROMPTS_INDEX_NAME=agents-prompts-index
PINECONE_TASKS_INDEX_NAME=tasks-similarity
PINECONE_PARAMETER_MEMORY_INDEX_NAME=parameter-memory-index

# AI Model Configuration
# OpenAI
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key

# Ollama (local, optional)
OLLAMA_URL=http://localhost:11434

# AI Server (if using separate AI server)
AI_SERVER_URL=http://localhost:3002/stream
```

### Complete .env Template

Here's a complete template with all options:

```env
# ============================================
# MongoDB Configuration (REQUIRED)
# ============================================
MONGODB_URI=mongodb://localhost:27017/agents-mcp-server

# ============================================
# Server Configuration
# ============================================
PORT=4000
NODE_ENV=development

# ============================================
# Remote MCP Server (Optional)
# ============================================
REMOTE_MCP_SERVER_URL=http://localhost:3000/sse

# ============================================
# Pinecone Configuration (Optional but Recommended)
# ============================================
PINECONE_API_KEY=
PINECONE_TOOLS_INDEX_NAME=agents-tools-index
PINECONE_PROMPTS_INDEX_NAME=agents-prompts-index
PINECONE_TASKS_INDEX_NAME=tasks-similarity
PINECONE_PARAMETER_MEMORY_INDEX_NAME=parameter-memory-index

# ============================================
# AI Model API Keys (Required for Agent Features)
# ============================================
# At least one AI provider is required for agent functionality

# OpenAI
OPENAI_API_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Ollama (Local, free alternative)
OLLAMA_URL=http://localhost:11434

# Custom AI Server
AI_SERVER_URL=http://localhost:3002/stream
```

### MongoDB Setup

#### Option 1: Local MongoDB

**macOS (using Homebrew)**:
```bash
# Install MongoDB
brew tap mongodb/brew
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Verify it's running
brew services list | grep mongodb
```

**Linux (Ubuntu/Debian)**:
```bash
# Install MongoDB
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify
sudo systemctl status mongod
```

**Windows**:
1. Download MongoDB from [mongodb.com/download](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Start MongoDB service from Services panel (Win+R → services.msc)

**Verify connection**:
```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017"
# Should connect successfully
```

#### Option 2: MongoDB Atlas (Cloud)

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create Cluster**: 
   - Choose free tier (M0)
   - Select your region
   - Click "Create Cluster"
3. **Create Database User**:
   - Go to "Database Access"
   - Add new user with username/password
   - Set permissions to "Atlas admin" or "Read and write to any database"
4. **Whitelist IP**:
   - Go to "Network Access"
   - Add current IP address (or 0.0.0.0/0 for development)
5. **Get Connection String**:
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - Replace `<password>` with your database user password

**Example connection string**:
```
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/agents-mcp-server?retryWrites=true&w=majority
```

### Pinecone Setup (Optional but Recommended)

Pinecone enables semantic search for tools, prompts, and tasks:

1. **Create Account**: Sign up at [pinecone.io](https://www.pinecone.io/)
2. **Create API Key**:
   - Go to API Keys section
   - Create new API key
   - Copy the key
3. **Create Indexes** (if not auto-created):
   - Tools index: `agents-tools-index`
     - Dimensions: 1536 (for OpenAI embeddings)
     - Metric: cosine
   - Tasks index: `tasks-similarity`
     - Dimensions: 1536
     - Metric: cosine

**Note**: The server will attempt to create indexes automatically if they don't exist.

### AI Model Setup

At least one AI provider is required for agent functionality:

#### OpenAI Setup

1. Create account at [platform.openai.com](https://platform.openai.com/)
2. Go to API Keys section
3. Create new secret key
4. Copy and add to `.env`:
   ```env
   OPENAI_API_KEY=sk-...
   ```

#### Anthropic (Claude) Setup

1. Create account at [console.anthropic.com](https://console.anthropic.com/)
2. Go to API Keys
3. Create new key
4. Add to `.env`:
   ```env
   ANTHROPIC_API_KEY=sk-ant-...
   ```

#### Ollama Setup (Local, Free Alternative)

1. **Install Ollama**: [ollama.ai](https://ollama.ai/)
   ```bash
   # macOS/Linux
   curl -fsSL https://ollama.ai/install.sh | sh
   
   # Windows: Download installer from website
   ```

2. **Start Ollama**:
   ```bash
   ollama serve
   ```

3. **Pull a model**:
   ```bash
   ollama pull llama2
   ```

4. **Configure** (if using custom URL):
   ```env
   OLLAMA_URL=http://localhost:11434
   ```

## Step 4: Build the Project

Compile TypeScript to JavaScript:

```bash
npm run build
```

Or with yarn:

```bash
yarn build
```

**Expected output**:
```
> mcp-server@1.0.0 build
> tsc

# Should complete without errors
```

**Verify build**:
```bash
# Check that dist/ directory exists
ls dist/

# Should see compiled JavaScript files
ls dist/index.js
```

**Common issues**:
- **TypeScript errors**: Fix any TypeScript compilation errors shown
- **Missing dependencies**: Run `npm install` again
- **Permission errors**: Check file permissions

## Step 5: Start the Server

### Development Mode (Recommended for first run)

Runs with hot reload - code changes automatically restart the server:

```bash
npm run dev
```

Or with yarn:

```bash
yarn dev
```

**Expected output**:
```
[INFO] Server starting on port 4000
[INFO] MongoDB connected successfully
[INFO] MCP Server ready
```

**What to look for**:
- ✅ "MongoDB connected successfully"
- ✅ "Server starting on port 4000" (or your configured port)
- ✅ No error messages

### Production Mode

For production use:

```bash
npm start
```

Or with yarn:

```bash
yarn start
```

**Note**: Production mode requires the project to be built first (`npm run build`).

## Step 6: Verify Installation

### 1. Health Check

Test that the server is running:

```bash
curl http://localhost:4000/health
```

**Expected response**:
```json
{
  "status": "healthy",
  "mongodb": "connected",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

**If MongoDB is not connected**:
```json
{
  "status": "unhealthy",
  "mongodb": "disconnected",
  "error": "Connection failed"
}
```

### 2. Root Endpoint

Check server information:

```bash
curl http://localhost:4000/
```

**Expected response**:
```json
{
  "name": "agents-mcp-server",
  "version": "1.0.0",
  "tools": 100,
  "status": "running"
}
```

### 3. MCP Protocol Test

Test JSON-RPC 2.0 endpoint:

```bash
curl -X POST http://localhost:4000/sse \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "test",
    "method": "initialize",
    "params": {}
  }'
```

**Expected response**:
```json
{
  "jsonrpc": "2.0",
  "id": "test",
  "result": {
    "protocolVersion": "2024-11-05",
    "serverInfo": {
      "name": "agents-mcp-server",
      "version": "1.0.0"
    },
    "capabilities": {
      "tools": {},
      "prompts": {},
      "resources": {},
      "sampling": {}
    }
  }
}
```

## Troubleshooting

### MongoDB Connection Issues

#### Error: `MongoServerError: connect ECONNREFUSED`

**Causes**:
- MongoDB is not running
- Wrong connection string
- Network firewall blocking connection

**Solutions**:
1. **Check if MongoDB is running**:
   ```bash
   # macOS
   brew services list | grep mongodb
   
   # Linux
   sudo systemctl status mongod
   
   # Windows: Check Services panel
   ```

2. **Start MongoDB**:
   ```bash
   # macOS
   brew services start mongodb-community
   
   # Linux
   sudo systemctl start mongod
   ```

3. **Verify connection string**:
   - Check `.env` file
   - Test with: `mongosh "mongodb://localhost:27017"`

4. **For MongoDB Atlas**: Check IP whitelist and credentials

#### Error: `Authentication failed`

**Solutions**:
1. Verify username and password in connection string
2. Check database user permissions in MongoDB Atlas
3. Ensure user has read/write permissions

#### Error: `MongooseServerSelectionError`

**Solutions**:
1. Check network connectivity
2. Verify MongoDB server is accessible
3. For Atlas: Check IP whitelist settings

### Port Already in Use

#### Error: `EADDRINUSE: address already in use :::4000`

**Solutions**:

1. **Find process using port**:
   ```bash
   # macOS/Linux
   lsof -i :4000
   
   # Windows
   netstat -ano | findstr :4000
   ```

2. **Kill the process**:
   ```bash
   # macOS/Linux
   kill -9 <PID>
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. **Or change port in `.env`**:
   ```env
   PORT=4001
   ```

### Build Errors

#### TypeScript Compilation Errors

**Solutions**:
1. **Check TypeScript version**:
   ```bash
   npx tsc --version
   ```

2. **Clean and rebuild**:
   ```bash
   rm -rf dist/ node_modules/
   npm install
   npm run build
   ```

3. **Check for syntax errors**:
   - Review error messages
   - Fix any TypeScript errors in source files

#### Missing Dependencies

**Solutions**:
1. **Reinstall dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check Node.js version**:
   ```bash
   node --version  # Should be 18+
   ```

### Pinecone Connection Issues

#### Error: `Pinecone API key not found`

**Solutions**:
1. Verify `PINECONE_API_KEY` is set in `.env`
2. Check API key is valid in Pinecone dashboard
3. Note: Pinecone is optional - server will work without it (with reduced functionality)

#### Error: `Index not found`

**Solutions**:
1. Server will attempt to create indexes automatically
2. Manually create indexes in Pinecone dashboard if needed
3. Check index names match configuration in `.env`

### AI Model API Issues

#### Error: `Invalid API key`

**Solutions**:
1. Verify API key is correct in `.env`
2. Check API key hasn't expired
3. Ensure API key has proper permissions
4. For OpenAI: Check usage limits in dashboard

#### Error: `Model not available`

**Solutions**:
1. Verify model ID is correct
2. Check if model requires API access (some models require waitlist)
3. Ensure account has sufficient credits/quota

## Post-Installation Checklist

- [ ] Server starts without errors
- [ ] MongoDB connection successful
- [ ] Health endpoint returns `{"status": "healthy"}`
- [ ] Initialize endpoint works
- [ ] Tools list endpoint returns tools
- [ ] (Optional) Pinecone indexes created
- [ ] (Optional) AI model API keys configured

## Next Steps

Once installation is verified:

1. **[Quick Start Guide](./quick-start.md)** - Run your first command in 5 minutes
2. **[Configuration Guide](./configuration.md)** - Advanced configuration options
3. **[First Steps](./first-steps.md)** - Complete walkthrough of your first workflow
4. **[Architecture Overview](../architecture/overview.md)** - Understand system design

## Getting Help

If you encounter issues not covered here:

1. **Check logs**: Server logs will show detailed error messages
2. **Review configuration**: Verify all `.env` variables are correct
3. **Check prerequisites**: Ensure all required software is installed
4. **GitHub Issues**: [Open an issue](https://github.com/wsyeabsera/v5-agent-mcp-server/issues) with:
   - Error messages
   - Configuration (without secrets)
   - Steps to reproduce

---

**Ready to continue?** → [Quick Start Guide](./quick-start.md)
