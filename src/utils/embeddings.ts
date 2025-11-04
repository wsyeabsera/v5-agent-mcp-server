import { Ollama } from 'ollama';
import { config } from '../config.js';
import { logger } from './logger.js';

// Initialize Ollama client
const ollama = new Ollama({
  host: config.ollamaUrl,
});

/**
 * Generate embedding using Ollama nomic-embed-text:latest
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty');
  }

  try {
    const response = await ollama.embeddings({
      model: 'nomic-embed-text:latest',
      prompt: text,
    });

    if (!response || !response.embedding) {
      throw new Error('Invalid response from Ollama: missing embedding');
    }

    const embedding = response.embedding;
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new Error('Invalid embedding format from Ollama');
    }

    logger.debug(`[Embeddings] Generated embedding of dimension ${embedding.length} for text: ${text.substring(0, 50)}...`);
    return embedding;
  } catch (error: any) {
    logger.error('[Embeddings] Error generating embedding:', error);
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connect')) {
      throw new Error(`Cannot connect to Ollama at ${config.ollamaUrl}. Make sure Ollama is running locally.`);
    }
    throw new Error(`Failed to generate embedding: ${error.message || error}`);
  }
}

/**
 * Get the embedding dimension for nomic-embed-text:latest
 * nomic-embed-text uses 768 dimensions
 */
export function getEmbeddingDimension(): number {
  // nomic-embed-text uses 768 dimensions
  return 768;
}
