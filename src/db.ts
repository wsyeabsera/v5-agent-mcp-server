import mongoose from 'mongoose';
import { logger } from './utils/logger.js';

export async function connectDB(uri: string): Promise<void> {
  try {
    await mongoose.connect(uri);
    logger.info('MongoDB connected successfully');
    
    // Clean up old indexes that are no longer needed
    await cleanupOldIndexes();
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
}

async function cleanupOldIndexes(): Promise<void> {
  try {
    const collection = mongoose.connection.collection('agentconfigs');
    const indexes = await collection.indexes();
    
    // Drop the old unique index on apiModelName if it exists
    // This was from the old schema and prevents one-to-many relationship
    const oldIndex = indexes.find((idx: any) => idx.name === 'apiModelName_1');
    if (oldIndex) {
      await collection.dropIndex('apiModelName_1');
      logger.info('Dropped old unique index on apiModelName (apiModelName_1)');
    }
  } catch (error: any) {
    // Index might not exist or already dropped, ignore
    if (error.code !== 27) { // 27 = IndexNotFound
      logger.warn('Error cleaning up old indexes:', error.message);
    }
  }
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected successfully');
  } catch (error) {
    logger.error('MongoDB disconnection error:', error);
  }
}

// Handle connection events
mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  logger.info('Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await disconnectDB();
  process.exit(0);
});

