import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { logger } from '../utils/logger.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
} from '../utils/toolHelpers.js';
import { generatePlanSchema, planSchema } from './schemas/planSchemas.js';
import { aiCallTools } from './aiCallTools.js';
import { Thought, Plan, Tool } from '../models/index.js';
import { searchTools } from './management/searchTools.js';

/**
 * Decompose user query into smaller sub-queries (reused from thoughtTools)
 */
function decomposeQuery(userQuery: string): string[] {
  const query = userQuery.trim();
  
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
      newSubQueries.push(...parts.map(p => p.trim()).filter(p => p.length > 3));
    }
    subQueries = newSubQueries;
  }

  return subQueries.filter(q => q.length > 3);
}

/**
 * Search for tools using semantic search (reused from thoughtTools)
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

  for (const subQuery of subQueries) {
    try {
      const searchResult = await searchTools.get_tool_for_user_prompt.handler({
        userPrompt: subQuery,
        topK,
      });

      if (!('isError' in searchResult && searchResult.isError) && searchResult.content?.[0]?.text) {
        try {
          const resultData = JSON.parse(searchResult.content[0].text);
          if (resultData.tools && Array.isArray(resultData.tools)) {
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
    }
  }

  return Array.from(allTools.values());
}

/**
 * Filter and enrich tools with input schemas (reused from thoughtTools)
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
  const filtered = tools
    .filter(t => t.similarityScore >= minScore)
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, maxTools);

  const toolNames = filtered.map(t => t.toolName);
  const dbTools = await Tool.find({ name: { $in: toolNames } });

  const enriched = filtered.map(tool => {
    const dbTool = dbTools.find(t => t.name === tool.toolName);
    const inputSchema = dbTool?.inputSchema || tool.inputSchema || {};

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
 * Format tools for LLM context in planning prompt
 */
function formatToolsForPlanning(tools: Array<{
  name: string;
  description: string;
  inputSchema: any;
  requiredParams: string[];
  optionalParams: string[];
}>): string {
  if (tools.length === 0) {
    return '\n\nNo specific tools identified for this plan.';
  }

  let formatted = '\n\nAvailable tools with their input requirements:\n';
  
  for (const tool of tools) {
    formatted += `\n- **${tool.name}**\n`;
    formatted += `  Description: ${tool.description}\n`;
    
    if (tool.requiredParams.length > 0) {
      formatted += `  Required inputs: ${tool.requiredParams.join(', ')}\n`;
    }
    
    if (tool.optionalParams.length > 0) {
      formatted += `  Optional inputs: ${tool.optionalParams.join(', ')}\n`;
    }

    // Add parameter details
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
 * Build system prompt for Planner Agent
 */
function buildPlannerSystemPrompt(
  thought: any,
  enrichedTools?: Array<{
    name: string;
    description: string;
    inputSchema: any;
    requiredParams: string[];
    optionalParams: string[];
  }>
): string {
  const toolsContext = enrichedTools && enrichedTools.length > 0
    ? formatToolsForPlanning(enrichedTools)
    : '\n\nNo specific tools identified. Use general planning.';

  const thoughtContext = `
Thought Analysis:
- Reasoning: ${thought.reasoning || 'N/A'}
- Primary Approach: ${thought.primaryApproach || 'N/A'}
- Approaches: ${thought.approaches?.join(', ') || 'N/A'}
- Constraints: ${thought.constraints?.join(', ') || 'N/A'}
- Uncertainties: ${thought.uncertainties?.join(', ') || 'N/A'}
- Recommended Tools: ${thought.recommendedTools?.join(', ') || 'N/A'}
`;

  return `You are a Planner Agent - your job is to convert abstract thoughts into concrete, executable plans.

When given a thought analysis, you must:
1. Create a structured plan with ordered steps
2. Resolve uncertainties by creating conditional steps or marking missing data
3. Extract parameters from the user query and thought context
4. Create dependency chains between steps (step 2 might need step 1's output)
5. Use template syntax for dynamic values:
   - {{step1.output._id}} - Use output from step 1
   - {{NOW}} - Use current timestamp
   - {{PROMPT_USER}} - Mark field that needs user input
   - {{GENERATE}} - Mark field that can be generated

${thoughtContext}

${toolsContext}

You must respond with valid JSON matching this exact structure:
{
  "goal": "High-level goal description",
  "steps": [
    {
      "id": "step1",
      "order": 1,
      "action": "tool_name",
      "parameters": {
        "param1": "value or {{template}}",
        "param2": "{{step1.output._id}}"
      },
      "expectedOutput": {
        "description": "What this step should produce"
      },
      "dependencies": [],
      "status": "pending"
    }
  ],
  "missingData": [
    {
      "step": "step3",
      "field": "source",
      "type": "string",
      "description": "What this field is for"
    }
  ],
  "status": "pending"
}

Rules:
- Each step must have a unique id (step1, step2, etc.)
- Order must be sequential (1, 2, 3...)
- Dependencies should list step IDs that must complete before this step
- If a required parameter is missing, add it to missingData array
- Use template syntax to chain data between steps
- Handle uncertainties by creating conditional logic or user prompts`;
}

/**
 * Build user prompt for planner
 */
function buildPlannerUserPrompt(userQuery: string, thought: any): string {
  return `User Query: ${userQuery}

Convert the thought analysis above into a concrete execution plan. 
- Extract any provided parameters from the user query
- Create steps in the correct order
- Link steps that depend on each other using template syntax
- Mark any missing required data in the missingData array`;
}

/**
 * Parse and validate AI response into Plan structure
 */
function parsePlanResponse(
  aiResponse: string,
  userQuery: string
): z.infer<typeof planSchema> {
  try {
    let jsonStr = aiResponse.trim();
    
    // Remove markdown code blocks if present
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\n?(.*?)\n?```/s);
      if (match) {
        jsonStr = match[1].trim();
      }
    }

    // Try to extract JSON object if there's extra text
    // Look for the first { and find the matching closing }
    const firstBrace = jsonStr.indexOf('{');
    if (firstBrace === -1) {
      throw new Error('No JSON object found in response');
    }
    
    // Find the matching closing brace by counting braces
    let braceCount = 0;
    let lastBrace = -1;
    for (let i = firstBrace; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') braceCount++;
      if (jsonStr[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          lastBrace = i;
          break;
        }
      }
    }
    
    if (lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Invalid JSON structure: unmatched braces');
    }
    
    jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    
    // Log the extracted JSON for debugging
    logger.debug(`[parsePlanResponse] Extracted JSON length: ${jsonStr.length} characters`);

    const parsed = JSON.parse(jsonStr);

    // Validate against schema
    const validationResult = planSchema.safeParse(parsed);
    if (!validationResult.success) {
      logger.error('[parsePlanResponse] Plan validation failed:', validationResult.error);
      throw new Error(`Plan validation failed: ${validationResult.error.message}`);
    }

    // Ensure steps have correct order and unique IDs
    const validatedSteps = validationResult.data.steps.map((step, index) => ({
      ...step,
      id: step.id || `step${index + 1}`,
      order: step.order || index + 1,
      status: step.status || 'pending',
      dependencies: step.dependencies || [],
      parameters: step.parameters || {},
    }));

    return {
      ...validationResult.data,
      steps: validatedSteps,
      status: validationResult.data.status || 'pending',
      missingData: validationResult.data.missingData || [],
    };
  } catch (error: any) {
    logger.error('[parsePlanResponse] Error parsing plan response:', error);
    throw new Error(`Failed to parse plan: ${error.message}`);
  }
}

/**
 * Extract parameters from user query
 */
function extractParametersFromQuery(userQuery: string, toolSchemas: any[]): Record<string, any> {
  const extracted: Record<string, any> = {};
  const queryLower = userQuery.toLowerCase();

  // Simple extraction patterns
  const patterns: Record<string, RegExp> = {
    facilityId: /facility\s+(?:id\s+)?([A-Z0-9]+)/i,
    facilityShortCode: /facility\s+([A-Z]{2,5})/i,
    location: /(?:in|at|from)\s+([A-Za-z\s]+?)(?:\s|$|,)/i,
    licensePlate: /license\s+plate\s+([A-Z0-9]+)/i,
    shipmentId: /shipment\s+(?:id\s+)?([A-Z0-9]+)/i,
  };

  for (const [key, pattern] of Object.entries(patterns)) {
    const match = userQuery.match(pattern);
    if (match) {
      extracted[key] = match[1].trim();
    }
  }

  return extracted;
}

// ========== Plan Tools ==========
export const planTools = {
  generate_plan: {
    description:
      'Generate a structured execution plan from a thought. Converts abstract thoughts into concrete, executable steps with dependencies and parameter extraction.',
    inputSchema: zodToJsonSchema(generatePlanSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof generatePlanSchema>) => {
      try {
        const validatedArgs = generatePlanSchema.parse(args);
        const { thoughtId, thought: thoughtObject, agentConfigId, enableToolSearch } = validatedArgs;

        logger.info(`[generate_plan] Generating plan for thoughtId: ${thoughtId || 'provided object'}`);

        // Fetch or use provided thought
        let thought: any;
        let userQuery: string;

        if (thoughtId) {
          const thoughtDoc = await Thought.findById(thoughtId);
          if (!thoughtDoc) {
            return createErrorResponse(`Thought not found: ${thoughtId}`);
          }
          // Extract thought data from the first thought in the array
          const thoughtData = thoughtDoc.thoughts && thoughtDoc.thoughts.length > 0 
            ? thoughtDoc.thoughts[0] 
            : null;
          thought = {
            reasoning: thoughtData?.reasoning || '',
            primaryApproach: thoughtDoc.primaryApproach,
            approaches: thoughtData?.approaches || [],
            constraints: thoughtData?.constraints || [],
            uncertainties: thoughtData?.uncertainties || [],
            recommendedTools: thoughtDoc.recommendedTools || [],
          };
          userQuery = thoughtDoc.userQuery;
        } else if (thoughtObject) {
          // Handle both direct thought object and Thought document structure
          if (thoughtObject.thoughts && Array.isArray(thoughtObject.thoughts) && thoughtObject.thoughts.length > 0) {
            // It's a Thought document structure
            const thoughtData = thoughtObject.thoughts[0];
            thought = {
              reasoning: thoughtData.reasoning || '',
              primaryApproach: thoughtObject.primaryApproach,
              approaches: thoughtData.approaches || [],
              constraints: thoughtData.constraints || [],
              uncertainties: thoughtData.uncertainties || [],
              recommendedTools: thoughtObject.recommendedTools || [],
            };
            userQuery = thoughtObject.userQuery || '';
          } else {
            // It's already a flattened thought structure
            thought = thoughtObject;
            userQuery = thoughtObject.userQuery || '';
          }
        } else {
          return createErrorResponse('Either thoughtId or thought object must be provided');
        }

        // Discover and enrich tools if enabled
        let enrichedTools: Array<{
          name: string;
          description: string;
          inputSchema: any;
          requiredParams: string[];
          optionalParams: string[];
        }> | undefined;

        if (enableToolSearch && thought.recommendedTools && thought.recommendedTools.length > 0) {
          try {
            logger.info('[generate_plan] Tool search enabled, discovering tools...');
            
            const subQueries = decomposeQuery(userQuery);
            const discoveredTools = await searchToolsForQueries(subQueries, 5);
            enrichedTools = await filterAndEnrichTools(discoveredTools, 0.6, 10);
            
            // Also fetch schemas for recommended tools
            const recommendedTools = await Tool.find({ name: { $in: thought.recommendedTools } });
            const recommendedEnriched = recommendedTools.map(tool => {
              const inputSchema = tool.inputSchema || {};
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
                name: tool.name,
                description: tool.description,
                inputSchema,
                requiredParams,
                optionalParams,
              };
            });

            // Merge discovered and recommended tools
            const toolMap = new Map(enrichedTools.map(t => [t.name, t]));
            for (const tool of recommendedEnriched) {
              if (!toolMap.has(tool.name)) {
                toolMap.set(tool.name, tool);
              }
            }
            enrichedTools = Array.from(toolMap.values());

            logger.info(`[generate_plan] Enriched ${enrichedTools.length} tools`);
          } catch (searchError: any) {
            logger.warn(`[generate_plan] Tool search failed: ${searchError.message}`);
          }
        }

        // Build prompts
        const systemPrompt = buildPlannerSystemPrompt(thought, enrichedTools);
        const userPrompt = buildPlannerUserPrompt(userQuery, thought);

        // Call execute_ai_call
        const aiCallResult = await aiCallTools.execute_ai_call.handler({
          agentConfigId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          responseFormat: { type: 'json_object' },
          temperature: 0.7,
          maxTokens: 2000,
        });

        // Check if AI call failed
        if ('isError' in aiCallResult && aiCallResult.isError) {
          const errorMsg = aiCallResult.content?.[0]?.text || 'Unknown error';
          return createErrorResponse(`AI call failed: ${errorMsg}`);
        }

        // Extract response text
        let responseText = '';
        try {
          const contentText = aiCallResult.content?.[0]?.text || '';
          // Try to parse as JSON first (if wrapped in JSON response format)
          try {
            const responseData = JSON.parse(contentText);
            responseText = responseData.response || responseData.text || contentText;
          } catch {
            // If not JSON, use directly
            responseText = contentText;
          }
        } catch (parseError) {
          responseText = aiCallResult.content?.[0]?.text || '';
        }

        if (!responseText) {
          return createErrorResponse('Empty response from AI call');
        }

        logger.debug(`[generate_plan] AI response length: ${responseText.length} characters`);
        
        // Parse and validate response
        const planResult = parsePlanResponse(responseText, userQuery);

        logger.info(`[generate_plan] Successfully generated plan with ${planResult.steps.length} steps`);

        // Save to MongoDB
        let savedPlan;
        try {
          savedPlan = await Plan.create({
            thoughtId: thoughtId || undefined,
            userQuery,
            goal: planResult.goal,
            steps: planResult.steps,
            missingData: planResult.missingData || [],
            status: planResult.status || 'pending',
            agentConfigId,
          });
          logger.info(`[generate_plan] Saved plan to database with ID: ${savedPlan._id}`);
        } catch (saveError: any) {
          logger.error('[generate_plan] Error saving plan to database:', saveError);
        }

        return createSuccessResponse({
          ...planResult,
          userQuery,
          agentConfigId,
          thoughtId: thoughtId || undefined,
          planId: savedPlan?._id?.toString(),
        });
      } catch (error: any) {
        logger.error('[generate_plan] Error:', error);
        return handleToolError(error, 'generating plan');
      }
    },
  },
};

