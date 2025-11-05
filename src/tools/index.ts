// Export MCP client tools and tool management tools
export { mcpClientTools } from './mcpClientTools.js';
export { toolManagementTools } from './management/index.js';
export { aiCallTools } from './aiCallTools.js';
export { mcpResourceTools } from './mcpResourceTools.js';
export { mcpPromptTools } from './mcpPromptTools.js';
export { localPromptTools } from './localPromptTools.js';
export { thoughtTools } from './thoughtTools.js';
export { planTools } from './planTools.js';
export { taskTools } from './taskTools.js';
export { historyTools } from './historyTools.js';
export { memoryTools } from './memoryTools.js';
export { smartTools } from './smartTools.js';

// Combined tools object for easy access
import { mcpClientTools } from './mcpClientTools.js';
import { toolManagementTools } from './management/index.js';
import { aiCallTools } from './aiCallTools.js';
import { mcpResourceTools } from './mcpResourceTools.js';
import { mcpPromptTools } from './mcpPromptTools.js';
import { localPromptTools } from './localPromptTools.js';
import { thoughtTools } from './thoughtTools.js';
import { planTools } from './planTools.js';
import { taskTools } from './taskTools.js';
import { historyTools } from './historyTools.js';
import { memoryTools } from './memoryTools.js';
import { smartTools } from './smartTools.js';
import { benchmarkTools } from './benchmarkTools.js';

export const allTools = {
  ...mcpClientTools,
  ...toolManagementTools,
  ...aiCallTools,
  ...mcpResourceTools,
  ...mcpPromptTools,
  ...localPromptTools,
  ...thoughtTools,
  ...planTools,
  ...taskTools,
  ...historyTools,
  ...memoryTools,
  ...smartTools,
  ...benchmarkTools,
};

