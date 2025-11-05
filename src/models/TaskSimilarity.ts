import mongoose, { Schema, Document } from 'mongoose';

// Success metrics subdocument structure
const SuccessMetricsSchema = new Schema(
  {
    executionTime: {
      type: Number,
      required: true, // milliseconds
    },
    stepsCompleted: {
      type: Number,
      required: true,
    },
    retries: {
      type: Number,
      default: 0,
    },
    userInputsRequired: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

export interface ITaskSimilarity extends Document {
  taskId: string; // Reference to Task document ID
  originalQuery: string; // User query
  goal: string; // Goal from plan
  planId: string; // Reference to Plan document ID
  status: 'completed' | 'failed' | 'paused';
  successMetrics: {
    executionTime: number;
    stepsCompleted: number;
    retries: number;
    userInputsRequired: number;
  };
  embeddingId?: string; // Pinecone vector ID for similarity search
  createdAt: Date;
}

const TaskSimilaritySchema = new Schema<ITaskSimilarity>(
  {
    taskId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    originalQuery: {
      type: String,
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed', 'failed', 'paused'],
      required: true,
      index: true,
    },
    successMetrics: {
      type: SuccessMetricsSchema,
      required: true,
    },
    embeddingId: {
      type: String,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
TaskSimilaritySchema.index({ originalQuery: 'text', goal: 'text' }); // Text search
TaskSimilaritySchema.index({ status: 1, createdAt: -1 }); // Filter by status and date
TaskSimilaritySchema.index({ createdAt: -1 }); // For sorting by date
TaskSimilaritySchema.index({ planId: 1 }); // For filtering by plan

export const TaskSimilarity = mongoose.model<ITaskSimilarity>(
  'TaskSimilarity',
  TaskSimilaritySchema
);

