import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config.js';
import { logger } from './logger.js';
import { getEmbeddingDimension } from './embeddings.js';

let pineconeClient: Pinecone | null = null;
let pineconeToolsIndex: any = null;
let pineconePromptsIndex: any = null;

/**
 * Initialize Pinecone client
 */
export async function initializePinecone(): Promise<void> {
  if (!config.pineconeApiKey) {
    throw new Error('PINECONE_API_KEY is not configured');
  }

  try {
    pineconeClient = new Pinecone({
      apiKey: config.pineconeApiKey,
    });
    logger.info('[Pinecone] Client initialized successfully');
  } catch (error: any) {
    logger.error('[Pinecone] Error initializing client:', error);
    throw new Error(`Failed to initialize Pinecone: ${error.message}`);
  }
}

/**
 * Get or create Pinecone index for tools
 */
export async function getToolsIndex() {
  if (!pineconeClient) {
    await initializePinecone();
  }

  if (!config.pineconeToolsIndexName) {
    throw new Error('PINECONE_TOOLS_INDEX_NAME is not configured');
  }

  if (pineconeToolsIndex) {
    return pineconeToolsIndex;
  }

  try {
    const indexList = await pineconeClient!.listIndexes();
    const indexExists = indexList.indexes?.some(
      (idx: any) => idx.name === config.pineconeToolsIndexName
    );

    if (!indexExists) {
      // Create index if it doesn't exist
      const dimension = getEmbeddingDimension();
      logger.info(`[Pinecone] Creating tools index ${config.pineconeToolsIndexName} with dimension ${dimension}`);
      await pineconeClient!.createIndex({
        name: config.pineconeToolsIndexName,
        dimension: dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    pineconeToolsIndex = pineconeClient!.index(config.pineconeToolsIndexName);
    logger.info(`[Pinecone] Connected to tools index: ${config.pineconeToolsIndexName}`);
    return pineconeToolsIndex;
  } catch (error: any) {
    logger.error('[Pinecone] Error getting tools index:', error);
    throw new Error(`Failed to get Pinecone tools index: ${error.message}`);
  }
}

/**
 * Get or create Pinecone index for prompts
 */
async function getPromptsIndex() {
  if (!pineconeClient) {
    await initializePinecone();
  }

  if (!config.pineconePromptsIndexName) {
    throw new Error('PINECONE_PROMPTS_INDEX_NAME is not configured');
  }

  if (pineconePromptsIndex) {
    return pineconePromptsIndex;
  }

  try {
    const indexList = await pineconeClient!.listIndexes();
    const indexExists = indexList.indexes?.some(
      (idx: any) => idx.name === config.pineconePromptsIndexName
    );

    if (!indexExists) {
      // Create index if it doesn't exist
      const dimension = getEmbeddingDimension();
      logger.info(`[Pinecone] Creating prompts index ${config.pineconePromptsIndexName} with dimension ${dimension}`);
      await pineconeClient!.createIndex({
        name: config.pineconePromptsIndexName,
        dimension: dimension,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: 'aws',
            region: 'us-east-1',
          },
        },
      });
      
      // Wait for index to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    pineconePromptsIndex = pineconeClient!.index(config.pineconePromptsIndexName);
    logger.info(`[Pinecone] Connected to prompts index: ${config.pineconePromptsIndexName}`);
    return pineconePromptsIndex;
  } catch (error: any) {
    logger.error('[Pinecone] Error getting prompts index:', error);
    throw new Error(`Failed to get Pinecone prompts index: ${error.message}`);
  }
}

/**
 * Upsert tool embedding into Pinecone tools index
 */
export async function upsertToolEmbedding(
  toolName: string,
  description: string,
  embedding: number[],
  source: string = 'remote',
  operationType?: 'query' | 'mutation',
  entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other'
): Promise<void> {
  try {
    const index = await getToolsIndex();
    
    const metadata: Record<string, any> = {
      toolName,
      description,
      source,
    };
    
    if (operationType) {
      metadata.operationType = operationType;
    }
    
    if (entityType) {
      metadata.entityType = entityType;
    }
    
    await index.upsert([
      {
        id: toolName,
        values: embedding,
        metadata,
      },
    ]);

    logger.debug(`[Pinecone] Upserted tool embedding: ${toolName} (operationType: ${operationType}, entityType: ${entityType})`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error upserting tool embedding for ${toolName}:`, error);
    throw error;
  }
}

/**
 * Upsert prompt embedding into Pinecone prompts index
 */
export async function upsertPromptEmbedding(
  promptName: string,
  description: string,
  embedding: number[],
  source: string = 'remote'
): Promise<void> {
  try {
    const index = await getPromptsIndex();
    
    await index.upsert([
      {
        id: promptName,
        values: embedding,
        metadata: {
          promptName,
          description,
          source,
        },
      },
    ]);

    logger.debug(`[Pinecone] Upserted prompt embedding: ${promptName}`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error upserting prompt embedding for ${promptName}:`, error);
    throw error;
  }
}

/**
 * Search for similar tools in Pinecone tools index
 */
export async function searchSimilarTools(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{
  toolName: string;
  description: string;
  score: number;
  source: string;
  operationType?: 'query' | 'mutation';
  entityType?: 'facility' | 'shipment' | 'contaminant' | 'contract' | 'inspection' | 'other';
}>> {
  try {
    const index = await getToolsIndex();
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }

    return queryResponse.matches.map((match: any) => ({
      toolName: match.metadata?.toolName || match.id,
      description: match.metadata?.description || '',
      score: match.score || 0,
      source: match.metadata?.source || 'unknown',
      operationType: match.metadata?.operationType,
      entityType: match.metadata?.entityType,
    }));
  } catch (error: any) {
    logger.error('[Pinecone] Error searching similar tools:', error);
    throw error;
  }
}

/**
 * Search for similar prompts in Pinecone prompts index
 */
export async function searchSimilarPrompts(
  queryEmbedding: number[],
  topK: number = 3
): Promise<Array<{
  promptName: string;
  description: string;
  score: number;
  source: string;
}>> {
  try {
    const index = await getPromptsIndex();
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }

    return queryResponse.matches.map((match: any) => ({
      promptName: match.metadata?.promptName || match.id,
      description: match.metadata?.description || '',
      score: match.score || 0,
      source: match.metadata?.source || 'unknown',
    }));
  } catch (error: any) {
    logger.error('[Pinecone] Error searching similar prompts:', error);
    throw error;
  }
}

/**
 * Delete tool embedding from Pinecone
 */
export async function deleteToolEmbedding(toolName: string): Promise<void> {
  try {
    const index = await getToolsIndex();
    await index.deleteOne(toolName);
    logger.debug(`[Pinecone] Deleted tool embedding: ${toolName}`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error deleting tool embedding for ${toolName}:`, error);
    throw error;
  }
}

/**
 * Delete prompt embedding from Pinecone
 */
export async function deletePromptEmbedding(promptName: string): Promise<void> {
  try {
    const index = await getPromptsIndex();
    await index.deleteOne(promptName);
    logger.debug(`[Pinecone] Deleted prompt embedding: ${promptName}`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error deleting prompt embedding for ${promptName}:`, error);
    throw error;
  }
}
