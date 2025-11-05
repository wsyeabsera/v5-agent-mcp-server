import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import { generateThoughtsSchema } from './schemas/thoughtSchemas.js';
import { aiCallTools } from './aiCallTools.js';
import { Thought, Tool } from '../models/index.js';
import { searchTools } from './management/searchTools.js';

// Thought interface matching research doc (not to be confused with Thought model)
interface ThoughtData {
  id: string;
  timestamp: string;
  reasoning: string;
  approaches: string[];
  constraints: string[];
  assumptions: string[];
  uncertainties: string[];
  confidence: number; // 0-1
}

interface ThoughtAgentResult {
  thoughts: ThoughtData[];
  primaryApproach: string;
  keyInsights: string[];
  recommendedTools: string[];
}

/**
 * Decompose user query into smaller sub-queries
 * Uses simple heuristics to split complex queries
 */
function decomposeQuery(userQuery: string): string[] {
  const query = userQuery.trim();
  
  // Split by common conjunctions and sequential markers
  const splitPatterns = [
    /\s+and\s+/i,
    /\s+then\s+/i,
    /\s+also\s+/i,
    /\s+after\s+/i,
    /\s+,\s+/,
    /\s+;\s+/,
  ];

  let subQueries = [query];
  
  for (const pattern of splitPatterns) {
    const newSubQueries: string[] = [];
    for (const subQuery of subQueries) {
      const parts = subQuery.split(pattern);
      newSubQueries.push(...parts.map(p => p.trim()).filter(p => p.length > 0));
    }
    subQueries = newSubQueries;
  }

  // Filter out very short sub-queries (likely split artifacts)
  return subQueries.filter(q => q.length > 3);
}

/**
 * Search for tools using semantic search for each sub-query
 */
async function searchToolsForQueries(
  subQueries: string[],
  topK: number = 5
): Promise<Array<{
  toolName: string;
  description: string;
  similarityScore: number;
  inputSchema: any;
  source: string;
  operationType?: string;
  entityType?: string;
}>> {
  const allTools: Map<string, {
    toolName: string;
    description: string;
    similarityScore: number;
    inputSchema: any;
    source: string;
    operationType?: string;
    entityType?: string;
  }> = new Map();

  // Search for tools for each sub-query
  for (const subQuery of subQueries) {
    try {
      const searchResult = await searchTools.get_tool_for_user_prompt.handler({
        userPrompt: subQuery,
        topK,
      });

      // Check if search was successful
      if (!('isError' in searchResult && searchResult.isError) && searchResult.content?.[0]?.text) {
        try {
          const resultData = JSON.parse(searchResult.content[0].text);
          if (resultData.tools && Array.isArray(resultData.tools)) {
            // Merge tools, keeping highest score for duplicates
            for (const tool of resultData.tools) {
              const existing = allTools.get(tool.toolName);
              if (!existing || tool.similarityScore > existing.similarityScore) {
                allTools.set(tool.toolName, {
                  toolName: tool.toolName,
                  description: tool.description,
                  similarityScore: tool.similarityScore,
                  inputSchema: tool.inputSchema,
                  source: tool.source || 'remote',
                  operationType: tool.operationType,
                  entityType: tool.entityType,
                });
              }
            }
          }
        } catch (parseError) {
          logger.warn(`[searchToolsForQueries] Failed to parse search result for "${subQuery}"`);
        }
      }
    } catch (error: any) {
      logger.warn(`[searchToolsForQueries] Tool search failed for "${subQuery}": ${error.message}`);
      // Continue with other sub-queries
    }
  }

  return Array.from(allTools.values());
}

/**
 * Filter and enrich tools with input schemas
 */
async function filterAndEnrichTools(
  tools: Array<{
    toolName: string;
    description: string;
    similarityScore: number;
    inputSchema: any;
    source: string;
    operationType?: string;
    entityType?: string;
  }>,
  minScore: number = 0.6,
  maxTools: number = 10
): Promise<Array<{
  name: string;
  description: string;
  inputSchema: any;
  requiredParams: string[];
  optionalParams: string[];
}>> {
  // Filter by score
  const filtered = tools
    .filter(t => t.similarityScore >= minScore)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxTools);

  // Enrich with full tool details from MongoDB
  const toolNames = filtered.map(t => t.toolName);
  const dbTools = await Tool.find({ name: { $in: toolNames } });

  // Map and enrich tools
  const enriched = filtered.map(tool => {
    const dbTool = dbTools.find(t => t.name === tool.toolName);
    const inputSchema = dbTool?.inputSchema || tool.inputSchema || {};

    // Extract required and optional parameters from inputSchema
    const requiredParams: string[] = [];
    const optionalParams: string[] = [];

    if (inputSchema.properties) {
      const required = inputSchema.required || [];
      for (const [key, value] of Object.entries(inputSchema.properties)) {
        if (required.includes(key)) {
          requiredParams.push(key);
        } else {
          optionalParams.push(key);
        }
      }
    }

    return {
      name: tool.toolName,
      description: tool.description || dbTool?.description || '',
      inputSchema,
      requiredParams,
      optionalParams,
    };
  });

  return enriched;
}

/**
 * Format tools for LLM context
 */
function formatToolsForPrompt(tools: Array<{
  name: string;
  description: string;
  inputSchema: any;
  requiredParams: string[];
  optionalParams: string[];
}>): string {
  if (tools.length === 0) {
    return '\n\nNo specific tools identified for this query.';
  }

  let formatted = '\n\nAvailable tools (with input schemas):\n';
  
  for (const tool of tools) {
    formatted += `\n- **${tool.name}**\n`;
    formatted += `  Description: ${tool.description}\n`;
    
    if (tool.requiredParams.length > 0) {
      formatted += `  Required inputs: ${tool.requiredParams.join(', ')}\n`;
    }
    
    if (tool.optionalParams.length > 0) {
      formatted += `  Optional inputs: ${tool.optionalParams.join(', ')}\n`;
    }

    // Add brief schema info if available
    if (tool.inputSchema && tool.inputSchema.properties) {
      const paramDetails: string[] = [];
      for (const [key, value] of Object.entries(tool.inputSchema.properties)) {
        const param = value as any;
        const type = param.type || 'any';
        const required = tool.requiredParams.includes(key) ? ' (required)' : ' (optional)';
        paramDetails.push(`    - ${key}: ${type}${required}`);
      }
      if (paramDetails.length > 0) {
        formatted += `  Parameters:\n${paramDetails.join('\n')}\n`;
      }
    }
  }

  return formatted;
}

/**
 * Build system prompt for thought generation
 */
function buildThoughtSystemPrompt(
  enrichedTools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
    requiredParams: string[];
    optionalParams: string[];
  }>
): string {
  const toolsContext = enrichedTools && enrichedTools.length > 0
    ? formatToolsForPrompt(enrichedTools)
    : '\n\nNo specific tools identified. Use general reasoning.';

  return `You are a Thought Agent - your job is to think through problems deeply before taking action.

When given a user query, generate structured thoughts that include:
1. **reasoning**: Natural language explanation of what the user is really asking for
2. **approaches**: Multiple possible approaches to solve this (at least 2-3 options)
3. **constraints**: Key constraints, requirements, or limitations identified
4. **assumptions**: Assumptions you're making about the query or context
5. **uncertainties**: Areas of uncertainty or things that need clarification
6. **confidence**: Your confidence level (0.0 to 1.0) in understanding the query
7. **recommendedTools**: Suggested tools that might be helpful (consider the tools listed below)${toolsContext}

Be thorough but concise. Think like a senior engineer planning a solution.
When recommending tools, consider which tools from the list above are most relevant and what inputs they require.

You must respond with valid JSON matching this exact structure:
{
  "reasoning": "string explaining your understanding",
  "approaches": ["approach 1", "approach 2", "approach 3"],
  "constraints": ["constraint 1", "constraint 2"],
  "assumptions": ["assumption 1", "assumption 2"],
  "uncertainties": ["uncertainty 1", "uncertainty 2"],
  "confidence": 0.85,
  "recommendedTools": ["tool1", "tool2"]
}`;
}

/**
 * Build user prompt for thought generation
 */
function buildThoughtUserPrompt(
  userQuery: string,
  conversationHistory?: Array<{ role: string; content: string }>
): string {
  let prompt = `User query: ${userQuery}`;

  if (conversationHistory && conversationHistory.length > 0) {
    prompt += '\n\nConversation history:\n';
    conversationHistory.forEach((msg, idx) => {
      prompt += `${msg.role}: ${msg.content}\n`;
    });
  }

  prompt += '\n\nGenerate your thoughts about this query in the required JSON format.';

  return prompt;
}

/**
 * Parse and validate AI response into Thought structure
 */
function parseThoughtResponse(
  aiResponse: string,
  userQuery: string
): ThoughtAgentResult {
  try {
    // Try to parse JSON - handle cases where response might have markdown code blocks
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\n?(.*?)\n?```/s);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    const parsed = JSON.parse(jsonStr);

    // Validate and extract fields
    const reasoning = parsed.reasoning || 'No reasoning provided';
    const approaches = Array.isArray(parsed.approaches) ? parsed.approaches : [];
    const constraints = Array.isArray(parsed.constraints) ? parsed.constraints : [];
    const assumptions = Array.isArray(parsed.assumptions) ? parsed.assumptions : [];
    const uncertainties = Array.isArray(parsed.uncertainties) ? parsed.uncertainties : [];
    const confidence = typeof parsed.confidence === 'number'
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;
    const recommendedTools = Array.isArray(parsed.recommendedTools)
      ? parsed.recommendedTools
      : [];

    // Generate thought ID and timestamp
    const thoughtId = `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    const thought: ThoughtData = {
      id: thoughtId,
      timestamp,
      reasoning,
      approaches: approaches.length > 0 ? approaches : ['Direct execution'],
      constraints,
      assumptions,
      uncertainties,
      confidence,
    };

    // Extract key insights from reasoning (split by sentences/paragraphs)
    const keyInsights = reasoning
      .split(/[.!?]\s+/)
      .filter((s: string) => s.trim().length > 20)
      .slice(0, 5)
      .map((s: string) => s.trim());

    const primaryApproach = approaches.length > 0 ? approaches[0] : 'Direct execution';

    return {
      thoughts: [thought],
      primaryApproach,
      keyInsights: keyInsights.length > 0 ? keyInsights : [reasoning],
      recommendedTools,
    };
  } catch (error: any) {
    logger.error('[generate_thoughts] Error parsing AI response:', error);
    logger.error('[generate_thoughts] Raw response:', aiResponse);
    
    // Return a fallback thought structure
    const thoughtId = `thought_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return {
      thoughts: [
        {
          id: thoughtId,
          timestamp: new Date().toISOString(),
          reasoning: `Failed to parse AI response. Raw response: ${aiResponse.substring(0, 200)}`,
          approaches: ['Manual review needed'],
          constraints: ['Response parsing failed'],
          assumptions: [],
          uncertainties: ['Unable to parse structured response from AI'],
          confidence: 0.1,
        },
      ],
      primaryApproach: 'Manual review needed',
      keyInsights: ['AI response parsing failed'],
      recommendedTools: [],
    };
  }
}

// ========== Thought Tools ==========
export const thoughtTools = {
  generate_thoughts: {
    description:
      'Generate structured thoughts from a user query using AI. Returns structured JSON that can be used to build thought examples for future reference.',
    inputSchema: zodToJsonSchema(generateThoughtsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof generateThoughtsSchema>) => {
      try {
        const validatedArgs = generateThoughtsSchema.parse(args);
        const { userQuery, agentConfigId, availableTools, conversationHistory, enableToolSearch } = validatedArgs;

        logger.info(`[generate_thoughts] Generating thoughts for query: ${userQuery.substring(0, 100)}`);

        // Discover and enrich tools if enabled
        let enrichedTools: Array<{
          name: string;
          description: string;
          inputSchema: any;
          requiredParams: string[];
          optionalParams: string[];
        }> | undefined;

        if (enableToolSearch) {
          try {
            logger.info('[generate_thoughts] Tool search enabled, discovering tools...');
            
            // Decompose query into sub-queries
            const subQueries = decomposeQuery(userQuery);
            logger.info(`[generate_thoughts] Decomposed query into ${subQueries.length} sub-queries:`, subQueries);

            // Search for tools for each sub-query
            const discoveredTools = await searchToolsForQueries(subQueries, 5);
            logger.info(`[generate_thoughts] Discovered ${discoveredTools.length} tools from search`);

            // Filter and enrich tools
            enrichedTools = await filterAndEnrichTools(discoveredTools, 0.6, 10);
            logger.info(`[generate_thoughts] Filtered and enriched to ${enrichedTools.length} tools`);
          } catch (searchError: any) {
            logger.warn(`[generate_thoughts] Tool search failed, falling back to provided tools: ${searchError.message}`);
            // Fall through to use provided availableTools
          }
        }

        // Fallback to provided availableTools if no enriched tools found
        if (!enrichedTools || enrichedTools.length === 0) {
          if (availableTools && availableTools.length > 0) {
            logger.info(`[generate_thoughts] Using provided availableTools: ${availableTools.join(', ')}`);
            // Try to fetch tool details from MongoDB for provided tools
            try {
              const dbTools = await Tool.find({ name: { $in: availableTools } });
              enrichedTools = availableTools.map(toolName => {
                const dbTool = dbTools.find(t => t.name === toolName);
                const inputSchema = dbTool?.inputSchema || {};
                const requiredParams: string[] = [];
                const optionalParams: string[] = [];

                if (inputSchema.properties) {
                  const required = inputSchema.required || [];
                  for (const [key] of Object.entries(inputSchema.properties)) {
                    if (required.includes(key)) {
                      requiredParams.push(key);
                    } else {
                      optionalParams.push(key);
                    }
                  }
                }

                return {
                  name: toolName,
                  description: dbTool?.description || toolName,
                  inputSchema,
                  requiredParams,
                  optionalParams,
                };
              });
            } catch (error: any) {
              logger.warn(`[generate_thoughts] Failed to fetch tool details, using tool names only`);
              enrichedTools = undefined;
            }
          }
        }

        // Build prompts with enriched tools
        const systemPrompt = buildThoughtSystemPrompt(enrichedTools);
        const userPrompt = buildThoughtUserPrompt(userQuery, conversationHistory);

        // Call execute_ai_call internally
        const aiCallResult = await aiCallTools.execute_ai_call.handler({
          agentConfigId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          responseFormat: { type: 'json_object' },
          temperature: 0.7, // Creative thinking
          maxTokens: 1500,
        });

        // Check if AI call failed
        if ('isError' in aiCallResult && aiCallResult.isError) {
          const errorMsg = aiCallResult.content?.[0]?.text || 'Unknown error';
          return createErrorResponse(`AI call failed: ${errorMsg}`);
        }

        // Extract response text - execute_ai_call returns { content: [{ text: JSON.stringify(data) }] }
        // The data.response contains the actual AI response
        let responseText = '';
        try {
          const responseData = JSON.parse(aiCallResult.content?.[0]?.text || '{}');
          responseText = responseData.response || '';
        } catch (parseError) {
          // If parsing fails, try to extract directly from content
          responseText = aiCallResult.content?.[0]?.text || '';
        }

        if (!responseText) {
          return createErrorResponse('Empty response from AI call');
        }

        // Parse and validate response
        const thoughtResult = parseThoughtResponse(responseText, userQuery);

        logger.info(`[generate_thoughts] Successfully generated thoughts with confidence: ${thoughtResult.thoughts[0].confidence}`);

        // Save to MongoDB
        let savedThought;
        try {
          savedThought = await Thought.create({
            userQuery,
            agentConfigId,
            thoughts: thoughtResult.thoughts,
            primaryApproach: thoughtResult.primaryApproach,
            keyInsights: thoughtResult.keyInsights,
            recommendedTools: thoughtResult.recommendedTools,
          });
          logger.info(`[generate_thoughts] Saved thought to database with ID: ${savedThought._id}`);
        } catch (saveError: any) {
          logger.error('[generate_thoughts] Error saving thought to database:', saveError);
          // Continue even if save fails - return the result anyway
        }

        return createSuccessResponse({
          ...thoughtResult,
          userQuery,
          agentConfigId,
          thoughtId: savedThought?._id?.toString(),
        });
      } catch (error: any) {
        logger.error('[generate_thoughts] Error:', error);
        return handleToolError(error, 'generating thoughts');
      }
    },
  },
};

