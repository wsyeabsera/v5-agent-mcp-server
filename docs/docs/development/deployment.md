# Deployment

How to deploy Agents MCP Server.

## Prerequisites

- Node.js 18+
- MongoDB instance
- Environment variables configured

## Build

```bash
npm run build
```

## Environment Variables

Ensure all required environment variables are set:
- `MONGODB_URI`
- `PORT`
- `NODE_ENV`
- API keys (if using AI features)

## Production Checklist

- [ ] Environment variables configured
- [ ] MongoDB connection secure
- [ ] API keys secured
- [ ] Logging configured
- [ ] Monitoring set up
- [ ] Health checks enabled

## Deployment Options

### Docker

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

### Platform Services

- Railway
- Heroku
- AWS
- Google Cloud

## Monitoring

- Health endpoint: `/health`
- Logs: Check application logs
- Metrics: Track performance

