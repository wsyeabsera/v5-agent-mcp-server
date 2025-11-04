import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool, Prompt } from '../../models/index.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { generateEmbedding } from '../../utils/embeddings.js';
import { searchSimilarTools, searchSimilarPrompts } from '../../utils/pinecone.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../../utils/toolHelpers.js';
import {
  getToolForUserPromptSchema,
} from '../schemas/toolSchemas.js';
import {
  getPromptForUserPromptSchema,
} from '../schemas/promptSchemas.js';

// ========== Search Tools ==========
export const searchTools = {
  get_tool_for_user_prompt: {
    description: 'Get the best tool(s) for a user query using semantic search',
    inputSchema: zodToJsonSchema(getToolForUserPromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getToolForUserPromptSchema>) => {
      try {
        const validatedArgs = getToolForUserPromptSchema.parse(args);
        const { userPrompt, topK } = validatedArgs;

        // Check if Pinecone is configured for tools
        if (!config.pineconeApiKey || !config.pineconeToolsIndexName) {
          return createErrorResponse(
            'Pinecone tools index not configured. Please set PINECONE_API_KEY and PINECONE_TOOLS_INDEX_NAME environment variables.'
          );
        }

        // Generate embedding for user prompt
        let queryEmbedding: number[];
        try {
          queryEmbedding = await generateEmbedding(userPrompt);
        } catch (error: any) {
          logger.error('[get_tool_for_user_prompt] Error generating embedding:', error);
          return createErrorResponse(
            `Failed to generate embedding: ${error.message}. Make sure Ollama is running locally.`
          );
        }

        // Search for similar tools in Pinecone
        let similarTools;
        try {
          similarTools = await searchSimilarTools(queryEmbedding, topK * 2); // Get more results for re-ranking
        } catch (error: any) {
          logger.error('[get_tool_for_user_prompt] Error searching Pinecone:', error);
          return createErrorResponse(`Failed to search tools: ${error.message}`);
        }

        if (similarTools.length === 0) {
          return createSuccessResponse({
            message: 'No similar tools found',
            userPrompt,
            tools: [],
            suggestion: 'Try running init_tools to seed the vector database',
          });
        }

        // Hybrid search: Apply keyword-based boosting for action verbs
        const queryLower = userPrompt.toLowerCase();
        
        // Action verb mappings
        const actionVerbMap: Record<string, string[]> = {
          create: ['create', 'add', 'new', 'make', 'generate'],
          update: ['update', 'change', 'modify', 'edit', 'alter'],
          delete: ['delete', 'remove', 'destroy'],
          get: ['get', 'fetch', 'retrieve', 'show', 'find', 'display'],
          list: ['list', 'all', 'show all', 'get all', 'fetch all'],
        };

        // Boost scores based on action verb matching
        const boostedTools = similarTools.map((tool) => {
          let boostedScore = tool.score;
          const toolAction = tool.toolName.split('_')[0]; // Extract action from tool name
          
          // Check if query contains action verbs that match the tool action
          if (toolAction in actionVerbMap) {
            const synonyms = actionVerbMap[toolAction];
            const hasMatchingVerb = synonyms.some(verb => queryLower.includes(verb));
            
            if (hasMatchingVerb) {
              // Boost score by 0.15 for direct action verb match
              boostedScore = Math.min(1.0, tool.score + 0.15);
              logger.debug(`[get_tool_for_user_prompt] Boosted ${tool.toolName} from ${tool.score.toFixed(4)} to ${boostedScore.toFixed(4)} due to action verb match`);
            }
          }
          
          return {
            ...tool,
            score: boostedScore,
            originalScore: tool.score, // Keep original for reference
          };
        });

        // Re-rank by boosted score
        boostedTools.sort((a, b) => b.score - a.score);

        // Fetch full tool details from MongoDB
        const toolNames = boostedTools.slice(0, topK).map(t => t.toolName);
        const fullTools = await Tool.find({ name: { $in: toolNames } });

        // Combine similarity scores with tool details
        const recommendedTools = boostedTools.slice(0, topK).map((similar) => {
          const fullTool = fullTools.find(t => t.name === similar.toolName);
          return {
            toolName: similar.toolName,
            description: similar.description,
            similarityScore: similar.score,
            originalScore: similar.originalScore,
            source: similar.source,
            operationType: similar.operationType,
            entityType: similar.entityType,
            inputSchema: fullTool?.inputSchema || null,
          };
        });

        return createSuccessResponse({
          message: `Found ${recommendedTools.length} recommended tool(s)`,
          userPrompt,
          tools: recommendedTools,
        });
      } catch (error: any) {
        return handleToolError(error, 'get_tool_for_user_prompt');
      }
    },
  },

  get_prompt_for_user_prompt: {
    description: 'Get the best prompt(s) for a user query using semantic search',
    inputSchema: zodToJsonSchema(getPromptForUserPromptSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof getPromptForUserPromptSchema>) => {
      try {
        const validatedArgs = getPromptForUserPromptSchema.parse(args);
        const { userPrompt, topK } = validatedArgs;

        // Check if Pinecone is configured
        if (!config.pineconeApiKey || !config.pineconePromptsIndexName) {
          return createErrorResponse(
            'Pinecone prompts index not configured. Please set PINECONE_API_KEY and PINECONE_PROMPTS_INDEX_NAME environment variables.'
          );
        }

        // Generate embedding for user prompt
        let queryEmbedding: number[];
        try {
          queryEmbedding = await generateEmbedding(userPrompt);
        } catch (error: any) {
          logger.error('[get_prompt_for_user_prompt] Error generating embedding:', error);
          return createErrorResponse(`Failed to generate embedding: ${error.message}`);
        }

        // Search Pinecone for similar prompts
        let similarPrompts;
        try {
          similarPrompts = await searchSimilarPrompts(queryEmbedding, topK);
        } catch (error: any) {
          logger.error('[get_prompt_for_user_prompt] Error searching Pinecone:', error);
          return createErrorResponse(`Failed to search prompts: ${error.message}`);
        }

        if (similarPrompts.length === 0) {
          return createSuccessResponse({
            message: 'No matching prompts found',
            query: userPrompt,
            prompts: [],
          });
        }

        // Fetch full prompt details from MongoDB
        const promptNames = similarPrompts.map(p => p.promptName);
        const prompts = await Prompt.find({ name: { $in: promptNames } });

        // Map results with similarity scores
        const results = similarPrompts.map(similar => {
          const prompt = prompts.find(p => p.name === similar.promptName);
          return {
            promptName: similar.promptName,
            description: similar.description,
            similarityScore: similar.score,
            source: similar.source,
            arguments: prompt?.arguments || [],
          };
        });

        return createSuccessResponse({
          message: `Found ${results.length} matching prompt(s)`,
          query: userPrompt,
          prompts: results,
        });
      } catch (error: any) {
        return handleToolError(error, 'get_prompt_for_user_prompt');
      }
    },
  },
};

