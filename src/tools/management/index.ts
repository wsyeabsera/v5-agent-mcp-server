// Export all management tools
export { toolTools } from './toolTools.js';
export { resourceTools } from './resourceTools.js';
export { promptTools } from './promptTools.js';
export { initTools } from './initTools.js';
export { searchTools } from './searchTools.js';

// Combine all management tools into a single object for backward compatibility
import { toolTools } from './toolTools.js';
import { resourceTools } from './resourceTools.js';
import { promptTools } from './promptTools.js';
import { initTools } from './initTools.js';
import { searchTools } from './searchTools.js';

export const toolManagementTools = {
  ...toolTools,
  ...resourceTools,
  ...promptTools,
  ...initTools,
  ...searchTools,
};

