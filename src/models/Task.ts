import mongoose, { Schema, Document } from 'mongoose';

// Pending user input subdocument structure
const PendingUserInputSchema = new Schema(
  {
    stepId: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  { _id: false }
);

// Execution history entry subdocument structure
const ExecutionHistoryEntrySchema = new Schema(
  {
    stepId: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['started', 'completed', 'failed', 'skipped'],
      required: true,
    },
    error: {
      type: String,
    },
    duration: {
      type: Number, // milliseconds
    },
    output: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

export interface ITask extends Document {
  planId: string; // Reference to Plan document ID
  status: 'pending' | 'in_progress' | 'paused' | 'completed' | 'failed' | 'cancelled';
  stepOutputs: Map<string, any>; // Map of stepId -> output data
  userInputs: Map<string, any>; // Map of stepId -> user input values (field -> value)
  pendingUserInputs: Array<{
    stepId: string;
    field: string;
    description?: string;
  }>;
  retryCount: Map<string, number>; // Map of stepId -> retry attempt count
  currentStepIndex: number; // Current executing step index
  executionHistory: Array<{
    stepId: string;
    timestamp: Date;
    status: 'started' | 'completed' | 'failed' | 'skipped';
    error?: string;
    duration?: number;
    output?: any;
  }>;
  error?: string; // Error message if task failed
  agentConfigId: string; // For AI generation
  timeout?: number; // Execution timeout in milliseconds (default: 30000)
  lockToken?: string; // For optimistic locking
  maxRetries?: number; // Max retries per step (default: 3)
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    planId: {
      type: String,
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'paused', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
    },
    stepOutputs: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    userInputs: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    pendingUserInputs: {
      type: [PendingUserInputSchema],
      default: [],
    },
    retryCount: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    currentStepIndex: {
      type: Number,
      default: 0,
    },
    timeout: {
      type: Number,
      default: 30000, // 30 seconds default
    },
    lockToken: {
      type: String,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    executionHistory: {
      type: [ExecutionHistoryEntrySchema],
      default: [],
    },
    error: {
      type: String,
    },
    agentConfigId: {
      type: String,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
TaskSchema.index({ createdAt: -1 }); // For sorting by date
TaskSchema.index({ planId: 1, createdAt: -1 }); // For filtering by plan
TaskSchema.index({ status: 1, createdAt: -1 }); // For filtering by status
TaskSchema.index({ agentConfigId: 1, createdAt: -1 }); // For filtering by agent config

export const Task = mongoose.model<ITask>('Task', TaskSchema);

