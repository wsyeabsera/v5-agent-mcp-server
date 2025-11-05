import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config.js';
import { logger } from './logger.js';
import { getEmbeddingDimension } from './embeddings.js';

let pineconeClient: Pinecone | null = null;
let pineconeToolsIndex: any = null;
let pineconePromptsIndex: any = null;
let pineconeTasksIndex: any = null;
let pineconeParameterMemoryIndex: any = null;

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

/**
 * Get or create Pinecone index for task similarity
 */
export async function getTasksIndex() {
  if (!pineconeClient) {
    await initializePinecone();
  }

  if (!config.pineconeTasksIndexName) {
    throw new Error('PINECONE_TASKS_INDEX_NAME is not configured');
  }

  if (pineconeTasksIndex) {
    return pineconeTasksIndex;
  }

  try {
    const indexList = await pineconeClient!.listIndexes();
    const indexExists = indexList.indexes?.some(
      (idx: any) => idx.name === config.pineconeTasksIndexName
    );

    if (!indexExists) {
      // Create index if it doesn't exist
      const dimension = getEmbeddingDimension();
      logger.info(`[Pinecone] Creating tasks index ${config.pineconeTasksIndexName} with dimension ${dimension}`);
      await pineconeClient!.createIndex({
        name: config.pineconeTasksIndexName,
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

    pineconeTasksIndex = pineconeClient!.index(config.pineconeTasksIndexName);
    logger.info(`[Pinecone] Connected to tasks index: ${config.pineconeTasksIndexName}`);
    return pineconeTasksIndex;
  } catch (error: any) {
    logger.error('[Pinecone] Error getting tasks index:', error);
    throw new Error(`Failed to get Pinecone tasks index: ${error.message}`);
  }
}

/**
 * Upsert task embedding into Pinecone tasks index
 */
export async function upsertTaskEmbedding(
  taskId: string,
  query: string,
  goal: string,
  embedding: number[],
  status: 'completed' | 'failed' | 'paused'
): Promise<void> {
  try {
    const index = await getTasksIndex();
    
    await index.upsert([
      {
        id: taskId,
        values: embedding,
        metadata: {
          taskId,
          query,
          goal,
          status,
        },
      },
    ]);

    logger.debug(`[Pinecone] Upserted task embedding: ${taskId} (status: ${status})`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error upserting task embedding for ${taskId}:`, error);
    throw error;
  }
}

/**
 * Search for similar tasks in Pinecone tasks index
 */
export async function searchSimilarTasks(
  queryEmbedding: number[],
  topK: number = 10,
  filters?: {
    status?: 'completed' | 'failed' | 'paused';
    minSimilarity?: number;
  }
): Promise<Array<{
  taskId: string;
  query: string;
  goal: string;
  status: string;
  score: number;
}>> {
  try {
    const index = await getTasksIndex();
    
    const queryOptions: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    };

    // Add filter if status is specified
    if (filters?.status) {
      queryOptions.filter = {
        status: { $eq: filters.status },
      };
    }

    const queryResponse = await index.query(queryOptions);

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }

    // Filter by minimum similarity if specified
    const minScore = filters?.minSimilarity || 0;
    const results = queryResponse.matches
      .filter((match: any) => (match.score || 0) >= minScore)
      .map((match: any) => ({
        taskId: match.metadata?.taskId || match.id,
        query: match.metadata?.query || '',
        goal: match.metadata?.goal || '',
        status: match.metadata?.status || 'unknown',
        score: match.score || 0,
      }));

    return results;
  } catch (error: any) {
    logger.error('[Pinecone] Error searching similar tasks:', error);
    throw error;
  }
}

/**
 * Delete task embedding from Pinecone
 */
export async function deleteTaskEmbedding(taskId: string): Promise<void> {
  try {
    const index = await getTasksIndex();
    await index.deleteOne(taskId);
    logger.debug(`[Pinecone] Deleted task embedding: ${taskId}`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error deleting task embedding for ${taskId}:`, error);
    throw error;
  }
}

/**
 * Get or create Pinecone index for parameter memory
 */
export async function getParameterMemoryIndex() {
  if (!pineconeClient) {
    await initializePinecone();
  }

  if (!config.pineconeParameterMemoryIndexName) {
    throw new Error('PINECONE_PARAMETER_MEMORY_INDEX_NAME is not configured');
  }

  if (pineconeParameterMemoryIndex) {
    return pineconeParameterMemoryIndex;
  }

  try {
    const indexList = await pineconeClient!.listIndexes();
    const indexExists = indexList.indexes?.some(
      (idx: any) => idx.name === config.pineconeParameterMemoryIndexName
    );

    if (!indexExists) {
      // Create index if it doesn't exist
      const dimension = getEmbeddingDimension();
      logger.info(`[Pinecone] Creating parameter memory index ${config.pineconeParameterMemoryIndexName} with dimension ${dimension}`);
      await pineconeClient!.createIndex({
        name: config.pineconeParameterMemoryIndexName,
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

    pineconeParameterMemoryIndex = pineconeClient!.index(config.pineconeParameterMemoryIndexName);
    logger.info(`[Pinecone] Connected to parameter memory index: ${config.pineconeParameterMemoryIndexName}`);
    return pineconeParameterMemoryIndex;
  } catch (error: any) {
    logger.error('[Pinecone] Error getting parameter memory index:', error);
    throw new Error(`Failed to get Pinecone parameter memory index: ${error.message}`);
  }
}

/**
 * Upsert parameter memory embedding into Pinecone parameter memory index
 */
export async function upsertParameterMemory(
  memoryId: string,
  toolName: string,
  parameterName: string,
  parameterValue: any,
  context: string,
  embedding: number[],
  metadata?: {
    successRate?: number;
    usageCount?: number;
    optimalValue?: boolean;
  }
): Promise<void> {
  try {
    const index = await getParameterMemoryIndex();
    
    await index.upsert([
      {
        id: memoryId,
        values: embedding,
        metadata: {
          toolName,
          parameterName,
          parameterValue: JSON.stringify(parameterValue),
          context,
          ...metadata,
        },
      },
    ]);

    logger.debug(`[Pinecone] Upserted parameter memory: ${memoryId} (tool: ${toolName}, param: ${parameterName})`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error upserting parameter memory for ${memoryId}:`, error);
    throw error;
  }
}

/**
 * Search for similar parameter patterns in Pinecone parameter memory index
 */
export async function searchParameterMemory(
  queryEmbedding: number[],
  topK: number = 10,
  filters?: {
    toolName?: string;
    parameterName?: string;
    context?: string;
    minSuccessRate?: number;
  }
): Promise<Array<{
  memoryId: string;
  toolName: string;
  parameterName: string;
  parameterValue: any;
  context: string;
  score: number;
  successRate?: number;
  usageCount?: number;
}>> {
  try {
    const index = await getParameterMemoryIndex();
    
    const queryOptions: any = {
      vector: queryEmbedding,
      topK,
      includeMetadata: true,
    };

    // Add filter if specified
    if (filters) {
      const filterConditions: any = {};
      if (filters.toolName) {
        filterConditions.toolName = { $eq: filters.toolName };
      }
      if (filters.parameterName) {
        filterConditions.parameterName = { $eq: filters.parameterName };
      }
      if (filters.context) {
        filterConditions.context = { $eq: filters.context };
      }
      if (filters.minSuccessRate !== undefined) {
        filterConditions.successRate = { $gte: filters.minSuccessRate };
      }

      if (Object.keys(filterConditions).length > 0) {
        queryOptions.filter = filterConditions;
      }
    }

    const queryResponse = await index.query(queryOptions);

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return [];
    }

    return queryResponse.matches.map((match: any) => ({
      memoryId: match.id,
      toolName: match.metadata?.toolName || '',
      parameterName: match.metadata?.parameterName || '',
      parameterValue: match.metadata?.parameterValue ? JSON.parse(match.metadata.parameterValue) : null,
      context: match.metadata?.context || '',
      score: match.score || 0,
      successRate: match.metadata?.successRate,
      usageCount: match.metadata?.usageCount,
    }));
  } catch (error: any) {
    logger.error('[Pinecone] Error searching parameter memory:', error);
    throw error;
  }
}

/**
 * Delete parameter memory embedding from Pinecone
 */
export async function deleteParameterMemory(memoryId: string): Promise<void> {
  try {
    const index = await getParameterMemoryIndex();
    await index.deleteOne(memoryId);
    logger.debug(`[Pinecone] Deleted parameter memory: ${memoryId}`);
  } catch (error: any) {
    logger.error(`[Pinecone] Error deleting parameter memory for ${memoryId}:`, error);
    throw error;
  }
}
