import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import {
  queryMemorySchema,
  getMemoryPatternSchema,
  storeInsightSchema,
  listMemoryPatternsSchema,
} from './schemas/memorySchemas.js';
import {
  MemoryPattern,
  ToolPerformance,
  AgentInsight,
  UserPreference,
} from '../models/index.js';
import { remember } from '../utils/memorySystem.js';
import { generateEmbedding } from '../utils/embeddings.js';
import { searchParameterMemory } from '../utils/pinecone.js';

// ========== Memory Query Tools ==========
export const memoryTools = {
  query_memory: {
    description:
      'Query memory for relevant knowledge including patterns, tool memory, insights, and user preferences. Returns comprehensive memory data for agents to use in decision-making.',
    inputSchema: zodToJsonSchema(queryMemorySchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof queryMemorySchema>) => {
      try {
        const validatedArgs = queryMemorySchema.parse(args);
        const { query, memoryTypes, context, limit = 10 } = validatedArgs;

        logger.info(`[query_memory] Querying memory: ${query} (types: ${memoryTypes?.join(',') || 'all'})`);

        const result = await remember(query, context);

        // Filter by memory types if specified
        const filteredResult: any = {};
        
        if (!memoryTypes || memoryTypes.includes('patterns')) {
          filteredResult.patterns = result.patterns.slice(0, limit);
        }
        
        if (!memoryTypes || memoryTypes.includes('tool_memory')) {
          filteredResult.toolMemory = result.toolMemory.slice(0, limit);
        }
        
        if (!memoryTypes || memoryTypes.includes('insights')) {
          filteredResult.insights = result.insights.slice(0, limit);
        }
        
        if (!memoryTypes || memoryTypes.includes('preferences')) {
          filteredResult.preferences = result.preferences.slice(0, limit);
        }

        return createSuccessResponse({
          ...filteredResult,
          query,
          context,
          message: 'Memory query completed',
        });
      } catch (error: any) {
        logger.error('[query_memory] Error:', error);
        return handleToolError(error, 'querying memory');
      }
    },
  },

  get_memory_pattern: {
    description:
      'Get a specific memory pattern by type and pattern string. Returns pattern with evidence and success metrics.',
    inputSchema: zodToJsonSchema(getMemoryPatternSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getMemoryPatternSchema>) => {
      try {
        const validatedArgs = getMemoryPatternSchema.parse(args);
        const { patternType, pattern } = validatedArgs;

        logger.info(`[get_memory_pattern] Getting pattern: ${patternType} - ${pattern.substring(0, 50)}`);

        const memoryPattern = await MemoryPattern.findOne({
          patternType,
          $or: [
            { 'pattern.query': { $regex: pattern, $options: 'i' } },
            { 'pattern.goal': { $regex: pattern, $options: 'i' } },
            { 'pattern.context': { $regex: pattern, $options: 'i' } },
          ],
        }).lean();

        if (!memoryPattern) {
          return createSuccessResponse({
            pattern: null,
            message: 'Pattern not found',
          });
        }

        return createSuccessResponse({
          pattern: {
            patternId: memoryPattern.patternId,
            patternType: memoryPattern.patternType,
            pattern: memoryPattern.pattern,
            successMetrics: memoryPattern.successMetrics,
            usageCount: memoryPattern.usageCount,
            lastUsed: memoryPattern.lastUsed,
            evidence: memoryPattern.evidence.slice(0, 10), // Limit evidence
            confidence: memoryPattern.confidence,
          },
          message: 'Pattern found',
        });
      } catch (error: any) {
        logger.error('[get_memory_pattern] Error:', error);
        return handleToolError(error, 'getting memory pattern');
      }
    },
  },

  list_memory_patterns: {
    description: 'List memory patterns with optional filters by patternType and context.',
    inputSchema: zodToJsonSchema(listMemoryPatternsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof listMemoryPatternsSchema>) => {
      try {
        const validatedArgs = listMemoryPatternsSchema.parse(args);
        const { patternType, context, limit = 50, skip = 0 } = validatedArgs;

        logger.info('[list_memory_patterns] Listing patterns with filters:', {
          patternType,
          context,
          limit,
          skip,
        });

        // Build filter
        const filter: Record<string, any> = {};
        if (patternType) filter.patternType = patternType;
        if (context) {
          filter.$or = [
            { 'pattern.query': { $regex: context, $options: 'i' } },
            { 'pattern.goal': { $regex: context, $options: 'i' } },
            { 'pattern.context': { $regex: context, $options: 'i' } },
          ];
        }

        const patterns = await MemoryPattern.find(filter)
          .sort({ lastUsed: -1, confidence: -1 })
          .limit(limit)
          .skip(skip)
          .lean();

        const total = await MemoryPattern.countDocuments(filter);

        return createSuccessResponse({
          patterns,
          total,
          limit,
          skip,
          hasMore: skip + limit < total,
        });
      } catch (error: any) {
        logger.error('[list_memory_patterns] Error:', error);
        return handleToolError(error, 'listing memory patterns');
      }
    },
  },

  store_insight: {
    description:
      'Manually store an insight for agents. Validates insight structure and links to evidence. This allows agents to share learnings with the system.',
    inputSchema: zodToJsonSchema(storeInsightSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof storeInsightSchema>) => {
      try {
        const validatedArgs = storeInsightSchema.parse(args);
        const { insight, insightType, appliesTo, evidence = [], confidence, rule } = validatedArgs;

        logger.info(`[store_insight] Storing insight: ${insightType} - ${insight.substring(0, 50)}`);

        // Generate unique insight ID
        const insightId = `insight_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        const newInsight = await AgentInsight.create({
          insightId,
          agentType: 'executor', // Default, can be enhanced
          insightType,
          insight,
          rule,
          appliesTo: appliesTo || {
            agents: [],
            contexts: [],
            conditions: {},
          },
          evidence: evidence.map(e => ({
            taskId: e.taskId,
            description: e.description,
            timestamp: new Date(),
          })),
          confidence,
          evidenceStrength: Math.min(1.0, evidence.length / 5), // Based on evidence count
          validated: false,
          usageCount: 0,
          lastUsed: new Date(),
        });

        return createSuccessResponse({
          insightId: newInsight.insightId,
          message: 'Insight stored successfully',
        });
      } catch (error: any) {
        logger.error('[store_insight] Error:', error);
        return handleToolError(error, 'storing insight');
      }
    },
  },
};

