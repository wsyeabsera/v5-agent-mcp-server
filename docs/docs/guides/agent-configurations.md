# Agent Configurations Guide

How to set up and manage agent configurations.

## Overview

Agent configurations define:
- AI model to use
- API keys
- Token limits
- Enabled status

## Creating a Configuration

### Step 1: Add Available Model

```javascript
const model = await callTool('add_available_model', {
  provider: 'openai',
  modelName: 'GPT-4',
  modelId: 'gpt-4'
});
```

### Step 2: Create Agent Config

```javascript
const config = await callTool('add_agent_config', {
  availableModelId: model._id,
  apiKey: 'your-api-key',
  maxTokenCount: 4000,
  isEnabled: true
});
```

## Managing Configurations

### List Configurations

```javascript
const configs = await callTool('list_agent_configs', {
  isEnabled: true
});
```

### Update Configuration

```javascript
await callTool('update_agent_config', {
  id: 'config-id',
  maxTokenCount: 8000,
  isEnabled: false
});
```

## Best Practices

- Use environment variables for API keys
- Set appropriate token limits
- Enable/disable configs as needed
- Monitor token usage

