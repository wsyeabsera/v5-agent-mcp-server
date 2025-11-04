# Quick Start Guide

## 1. Setup

```bash
# Install dependencies
npm install

# Create environment file
echo "MONGODB_URI=mongodb://localhost:27017/mcp-server
PORT=3000
NODE_ENV=development" > .env

# Make sure MongoDB is running (if using local instance)
# If you don't have MongoDB, you can use MongoDB Atlas (free tier)
```

## 2. Start the Server

```bash
# Development mode (with hot reload)
npm run dev

# Or build and run in production mode
npm run build
npm start
```

You should see:
```
MongoDB connected successfully
MCP Server running on http://localhost:3000
SSE endpoint: http://localhost:3000/sse
Health check: http://localhost:3000/health
Total tools available: 25
```

## 3. Test the Server

### Test Health Endpoint
```bash
curl http://localhost:3000/health
```

### Test Server Info
```bash
curl http://localhost:3000/
```

## 4. Connect Cursor to the MCP Server

### Option A: Using Cursor Settings UI
1. Open Cursor Settings
2. Navigate to "Features" → "Model Context Protocol"
3. Add a new server:
   - Name: `waste-management`
   - URL: `http://localhost:3000/sse`

### Option B: Manual Configuration
Add to your Cursor MCP config file:

**macOS/Linux**: `~/.cursor/mcp.json`  
**Windows**: `%APPDATA%\Cursor\mcp.json`

```json
{
  "mcpServers": {
    "waste-management": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

Or copy the provided `cursor-mcp-config.json` content to your Cursor settings.

## 5. Use Tools in Cursor

Once connected, you can use the tools in Cursor's chat:

### Example: Create a Facility
```
Create a new facility with name "Central Processing Plant", shortCode "CPP-001", and location "New York, NY"
```

### Example: List Facilities
```
Show me all facilities
```

### Example: Create an Inspection
```
Create an inspection for facility ID [facility_id] with delivery accepted as true, conditions met as true, heating value 5000, waste producer "ABC Corp", contract reference "CNT-2025-001", and waste types: [{category: "plastic", percentage: "60%"}, {category: "metal", percentage: "40%"}]
```

### Example: Complex Query
```
List all contaminants detected at facility [facility_id] with high explosive levels
```

## 6. Deploy to Production

### Using Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Add environment variables in Railway dashboard
# - MONGODB_URI (use MongoDB Atlas for production)
# - NODE_ENV=production
```

### Using Heroku

```bash
# Install Heroku CLI and login
heroku login

# Create app
heroku create your-mcp-server

# Add MongoDB (using MongoDB Atlas addon or external)
heroku addons:create mongolab:sandbox

# Deploy
git push heroku main
```

### Update Cursor Config for Production
Once deployed, update your Cursor config with the production URL:

```json
{
  "mcpServers": {
    "waste-management": {
      "url": "https://your-server-url.railway.app/sse"
    }
  }
}
```

## 7. MongoDB Atlas Setup (Recommended for Production)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Create a database user
4. Whitelist your IP (or allow from anywhere for testing: 0.0.0.0/0)
5. Get connection string and update your `.env`:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/mcp-server?retryWrites=true&w=majority
   ```

## Troubleshooting

### MongoDB Connection Failed
- Make sure MongoDB is running: `mongod --version`
- Check connection string in `.env`
- For Atlas, verify network access settings

### Port Already in Use
Change the PORT in your `.env` file:
```
PORT=3001
```

### Cursor Can't Connect
- Verify the server is running: `curl http://localhost:3000/health`
- Check the SSE endpoint is accessible: `curl http://localhost:3000/sse`
- Restart Cursor after updating MCP config

### Tools Not Showing in Cursor
- Make sure the MCP server is properly configured in Cursor settings
- Check Cursor's MCP logs for connection errors
- Verify the SSE endpoint URL is correct

## Next Steps

- Customize the data models in `src/models/`
- Add authentication/authorization if needed
- Implement additional validation
- Add more complex query tools
- Set up monitoring and logging

