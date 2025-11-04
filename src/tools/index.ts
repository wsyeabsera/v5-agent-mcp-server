// Export MCP client tools and tool management tools
export { mcpClientTools } from './mcpClientTools.js';
export { toolManagementTools } from './management/index.js';
export { aiCallTools } from './aiCallTools.js';

// Combined tools object for easy access
import { mcpClientTools } from './mcpClientTools.js';
import { toolManagementTools } from './management/index.js';
import { aiCallTools } from './aiCallTools.js';

export const allTools = {
  ...mcpClientTools,
  ...toolManagementTools,
  ...aiCallTools,
};

