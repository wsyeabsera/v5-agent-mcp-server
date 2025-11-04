// Export MCP client tools and tool management tools
export { mcpClientTools } from './mcpClientTools.js';
export { toolManagementTools } from './toolManagementTools.js';

// Combined tools object for easy access
import { mcpClientTools } from './mcpClientTools.js';
import { toolManagementTools } from './toolManagementTools.js';

export const allTools = {
  ...mcpClientTools,
  ...toolManagementTools,
};

