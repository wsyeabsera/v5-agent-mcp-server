#!/usr/bin/env node
/**
 * Verification script to check if all tools are properly registered
 */

import { allTools } from './dist/tools/index.js';
import { smartTools } from './dist/tools/smartTools.js';

const newTools = [
  'list_plan_quality_predictions',
  'list_tool_recommendations',
  'list_cost_trackings',
  'get_cost_tracking',
  'list_benchmark_tests',
  'get_benchmark_test',
  'list_benchmark_runs',
  'get_benchmark_run',
  'list_benchmark_suites',
  'get_benchmark_suite',
  'list_regressions',
  'get_regression',
  'list_memory_patterns',
];

console.log('🔍 Verifying Tool Registration\n');
console.log(`Total tools: ${Object.keys(allTools).length}\n`);

// Check each new tool
let allPresent = true;
for (const toolName of newTools) {
  const exists = toolName in allTools;
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${toolName}`);
  
  if (exists) {
    const tool = allTools[toolName];
    const hasDescription = !!tool.description;
    const hasInputSchema = !!tool.inputSchema;
    const hasHandler = typeof tool.handler === 'function';
    
    if (!hasDescription || !hasInputSchema || !hasHandler) {
      console.log(`   ⚠️  Missing: description=${hasDescription}, inputSchema=${hasInputSchema}, handler=${hasHandler}`);
      allPresent = false;
    }
  } else {
    allPresent = false;
  }
}

// Check list_plan_quality_predictions specifically
console.log('\n🔍 Detailed check for list_plan_quality_predictions:');
if ('list_plan_quality_predictions' in allTools) {
  const tool = allTools.list_plan_quality_predictions;
  console.log('  ✅ Tool exists');
  console.log('  ✅ Description:', typeof tool.description === 'string' ? 'Present' : 'Missing');
  console.log('  ✅ InputSchema:', typeof tool.inputSchema === 'object' ? 'Present' : 'Missing');
  console.log('  ✅ Handler:', typeof tool.handler === 'function' ? 'Present' : 'Missing');
  
  // Check if it's in smartTools
  if ('list_plan_quality_predictions' in smartTools) {
    console.log('  ✅ Found in smartTools export');
  } else {
    console.log('  ❌ NOT found in smartTools export');
    allPresent = false;
  }
} else {
  console.log('  ❌ Tool does NOT exist in allTools');
  allPresent = false;
}

// List all tools with "plan" or "quality" in name
console.log('\n📋 All tools containing "plan" or "quality":');
const relatedTools = Object.keys(allTools)
  .filter(k => k.includes('plan') || k.includes('quality'))
  .sort();
relatedTools.forEach(t => console.log(`  - ${t}`));

process.exit(allPresent ? 0 : 1);

