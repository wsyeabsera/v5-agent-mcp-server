import { z } from 'zod';

// Query memory input schema
export const queryMemorySchema = z.object({
  query: z.string().describe('What to look for in memory'),
  memoryTypes: z.array(z.enum(['patterns', 'tool_memory', 'insights', 'preferences'])).optional().describe('Filter by memory types'),
  context: z.string().optional().describe('Context for filtering'),
  limit: z.number().optional().default(10).describe('Max results per type'),
});

// Get memory pattern input schema
export const getMemoryPatternSchema = z.object({
  patternType: z.enum(['query_pattern', 'plan_pattern', 'tool_sequence', 'error_pattern']).describe('Pattern type'),
  pattern: z.string().describe('Pattern string to match'),
});

// Store insight input schema
export const storeInsightSchema = z.object({
  insight: z.string().describe('Human-readable insight'),
  insightType: z.enum(['rule', 'optimization', 'warning', 'pattern', 'best_practice']).describe('Insight type'),
  appliesTo: z.object({
    agents: z.array(z.string()).optional().describe('Which agents this applies to'),
    contexts: z.array(z.string()).optional().describe('When this applies'),
    conditions: z.record(z.any()).optional().describe('Conditions for applicability'),
  }).optional().describe('Applicability'),
  evidence: z.array(z.object({
    taskId: z.string().describe('Task ID'),
    description: z.string().describe('Description'),
  })).optional().describe('Evidence from executions'),
  confidence: z.number().min(0).max(1).describe('Confidence score (0-1)'),
  rule: z.string().optional().describe('Machine-readable rule'),
});

// List memory patterns input schema
export const listMemoryPatternsSchema = z.object({
  patternType: z.enum(['query_pattern', 'plan_pattern', 'tool_sequence', 'error_pattern']).optional().describe('Filter by pattern type'),
  context: z.string().optional().describe('Filter by context (partial match)'),
  limit: z.number().optional().default(50).describe('Maximum number of results to return'),
  skip: z.number().optional().default(0).describe('Number of results to skip'),
});

