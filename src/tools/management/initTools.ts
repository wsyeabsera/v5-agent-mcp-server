import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool, Prompt } from '../../models/index.js';
import { listTools, listPrompts } from '../../utils/mcpClient.js';
import { config } from '../../config.js';
import { logger } from '../../utils/logger.js';
import { generateEmbedding } from '../../utils/embeddings.js';
import { upsertToolEmbedding, upsertPromptEmbedding } from '../../utils/pinecone.js';
import {
  createSuccessResponse,
  createErrorResponse,
  handleToolError,
  detectOperationType,
  detectEntityType,
} from '../../utils/toolHelpers.js';
import {
  initToolsSchema,
} from '../schemas/toolSchemas.js';
import {
  initPromptsSchema,
} from '../schemas/promptSchemas.js';

// ========== Initialization Tools ==========
export const initTools = {
  init_tools: {
    description: 'Initialize database by fetching tools from remote MCP server and seeding local database',
    inputSchema: zodToJsonSchema(initToolsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof initToolsSchema>) => {
      try {
        const validatedArgs = initToolsSchema.parse(args);
        const { force, source } = validatedArgs;

        // Fetch tools from remote MCP server
        let remoteTools;
        try {
          remoteTools = await listTools();
        } catch (error: any) {
          logger.error('[init_tools] Error fetching tools from remote server:', error);
          return createErrorResponse(
            `Failed to fetch tools from remote server: ${error.message}. Make sure the remote MCP server is running on port 3000.`
          );
        }

        if (!Array.isArray(remoteTools)) {
          return createErrorResponse(
            `Invalid response from remote server: expected array, got ${typeof remoteTools}`
          );
        }

        if (remoteTools.length === 0) {
          return createSuccessResponse({
            message: 'No tools found on remote server. The remote server may not have any tools available.',
            added: 0,
            total: 0,
            warning: 'Remote server returned empty tools list',
          });
        }

        let added = 0;
        let skipped = 0;
        let embedded = 0;
        let embeddingErrors = 0;
        let filtered = 0;

        // Fetch prompts list to filter out prompts from tools
        let promptNames: string[] = [];
        try {
          const remotePrompts = await listPrompts();
          promptNames = remotePrompts.map(p => p.name);
          logger.info(`[init_tools] Found ${promptNames.length} prompts to filter out`);
        } catch (error: any) {
          logger.warn('[init_tools] Could not fetch prompts list, will not filter:', error.message);
        }

        // Check if Pinecone is configured for tools
        const hasPinecone = config.pineconeApiKey && config.pineconeToolsIndexName;

        // Delete all existing tools and embeddings first
        logger.info('[init_tools] Deleting all existing tools and embeddings...');
        try {
          const deleteResult = await Tool.deleteMany({});
          logger.info(`[init_tools] Deleted ${deleteResult.deletedCount} existing tools from MongoDB`);
          
          if (hasPinecone) {
            try {
              const { getToolsIndex } = await import('../../utils/pinecone.js');
              const index = await getToolsIndex();
              // Delete all vectors from Pinecone index
              await index.deleteAll();
              logger.info('[init_tools] Deleted all existing embeddings from Pinecone');
            } catch (pineconeError: any) {
              logger.warn('[init_tools] Could not delete Pinecone embeddings:', pineconeError.message);
            }
          }
        } catch (error: any) {
          logger.warn('[init_tools] Error deleting existing tools:', error.message);
        }

        // Process each tool (filter out prompts)
        for (const remoteTool of remoteTools) {
          // Skip if this is actually a prompt
          if (promptNames.includes(remoteTool.name)) {
            filtered++;
            logger.debug(`[init_tools] Filtered out prompt: ${remoteTool.name}`);
            continue;
          }
          try {
            // Auto-detect operationType and entityType
            const operationType = detectOperationType(remoteTool.name);
            const entityType = detectEntityType(remoteTool.name);
            
            const toolData = {
              name: remoteTool.name,
              description: remoteTool.description || '',
              inputSchema: remoteTool.inputSchema || {},
              source: source,
              operationType,
              entityType,
            };

            // Always create new (since we deleted all existing)
            await Tool.create(toolData);
            added++;
            const toolSaved = true;

            // Generate embedding and store in Pinecone if configured
            if (toolSaved && hasPinecone) {
              try {
                // Enhanced embedding text: include operationType, entityType, and action verb
                // Format: "operationType entityType ACTION tool_name: description"
                const actionVerb = toolData.name.split('_')[0].toUpperCase(); // Extract action from tool name
                const enhancedDescription = `${actionVerb} operation: ${toolData.description}`;
                const embeddingText = `${operationType} ${entityType} ${enhancedDescription} ${toolData.name}`;
                const embedding = await generateEmbedding(embeddingText);
                await upsertToolEmbedding(
                  toolData.name,
                  toolData.description,
                  embedding,
                  source,
                  operationType,
                  entityType
                );
                embedded++;
              } catch (error: any) {
                logger.warn(`[init_tools] Failed to embed tool ${toolData.name}:`, error.message);
                embeddingErrors++;
                // Continue processing other tools even if embedding fails
              }
            }
          } catch (error: any) {
            // Skip individual tool errors and continue
            skipped++;
            continue;
          }
        }

        const result: any = {
          message: 'Tools initialized successfully',
          added,
          filtered,
          total: remoteTools.length,
          toolsProcessed: remoteTools.length - filtered,
        };

        if (hasPinecone) {
          result.embedded = embedded;
          result.embeddingErrors = embeddingErrors;
        } else {
          result.warning = 'Pinecone tools index not configured - embeddings not stored';
        }

        return createSuccessResponse(result);
      } catch (error: any) {
        return handleToolError(error, 'init_tools');
      }
    },
  },

  init_prompts: {
    description: 'Initialize database by fetching prompts from remote MCP server and seeding local database',
    inputSchema: zodToJsonSchema(initPromptsSchema, { $refStrategy: 'none' }),
    handler: async (args: z.infer<typeof initPromptsSchema>) => {
      try {
        const validatedArgs = initPromptsSchema.parse(args);
        const { force, source } = validatedArgs;

        // Fetch prompts from remote MCP server
        let remotePrompts;
        try {
          remotePrompts = await listPrompts();
        } catch (error: any) {
          logger.error('[init_prompts] Error fetching prompts from remote server:', error);
          return createErrorResponse(
            `Failed to fetch prompts from remote server: ${error.message}. Make sure the remote MCP server is running on port 3000.`
          );
        }

        if (!Array.isArray(remotePrompts)) {
          return createErrorResponse(
            `Invalid response from remote server: expected array, got ${typeof remotePrompts}`
          );
        }

        if (remotePrompts.length === 0) {
          return createSuccessResponse({
            message: 'No prompts found on remote server. The remote server may not have any prompts available.',
            added: 0,
            updated: 0,
            skipped: 0,
            total: 0,
            warning: 'Remote server returned empty prompts list',
          });
        }

        let added = 0;
        let updated = 0;
        let skipped = 0;
        let embedded = 0;
        let embeddingErrors = 0;

        // Check if Pinecone is configured for prompts
        const hasPinecone = config.pineconeApiKey && config.pineconePromptsIndexName;

        // Process each prompt
        for (const remotePrompt of remotePrompts) {
          try {
            const promptData = {
              name: remotePrompt.name,
              description: remotePrompt.description || '',
              arguments: remotePrompt.arguments || [],
              source: source,
            };

            let promptSaved = false;
            if (force) {
              // Update or insert
              const result = await Prompt.findOneAndUpdate(
                { name: remotePrompt.name },
                promptData,
                { upsert: true, new: true }
              );
              if (result) {
                updated++;
                promptSaved = true;
                logger.debug(`[init_prompts] Updated prompt: ${remotePrompt.name}`);
              }
            } else {
              // Only insert if it doesn't exist
              const existing = await Prompt.findOne({ name: remotePrompt.name });
              if (existing) {
                skipped++;
                logger.debug(`[init_prompts] Skipped existing prompt: ${remotePrompt.name}`);
              } else {
                const newPrompt = new Prompt(promptData);
                await newPrompt.save();
                added++;
                promptSaved = true;
                logger.debug(`[init_prompts] Added prompt: ${remotePrompt.name}`);
              }
            }

            // Generate embedding and store in Pinecone if configured
            if (hasPinecone && promptSaved) {
              try {
                // Enhanced embedding text for prompts: include action verb if present
                const embeddingText = `prompt ${remotePrompt.name} ${remotePrompt.description || ''}`;
                const embedding = await generateEmbedding(embeddingText);
                await upsertPromptEmbedding(
                  remotePrompt.name,
                  remotePrompt.description || '',
                  embedding,
                  source
                );
                embedded++;
              } catch (embedError: any) {
                embeddingErrors++;
                logger.warn(`[init_prompts] Failed to generate/upsert embedding for ${remotePrompt.name}:`, embedError.message);
              }
            }
          } catch (error: any) {
            logger.error(`[init_prompts] Error processing prompt ${remotePrompt.name}:`, error);
            skipped++;
            continue;
          }
        }

        const result: any = {
          message: 'Prompts initialized successfully',
          added,
          updated,
          skipped,
          total: remotePrompts.length,
        };

        if (hasPinecone) {
          result.embedded = embedded;
          result.embeddingErrors = embeddingErrors;
        } else {
          result.warning = 'Pinecone prompts index not configured - embeddings not stored';
        }

        return createSuccessResponse(result);
      } catch (error: any) {
        return handleToolError(error, 'init_prompts');
      }
    },
  },
};

