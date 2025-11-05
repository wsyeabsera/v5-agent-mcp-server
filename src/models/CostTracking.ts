import mongoose, { Schema, Document } from 'mongoose';

// Token usage subdocument structure
const TokenUsageSchema = new Schema(
  {
    input: {
      type: Number,
      default: 0,
    },
    output: {
      type: Number,
      default: 0,
    },
    total: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

export interface ICostTracking extends Document {
  taskId: string;
  planId: string;
  agentConfigId: string;
  tokenUsage: {
    input: number;
    output: number;
    total: number;
  };
  apiCalls: number;
  estimatedCost: number; // in USD
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const CostTrackingSchema = new Schema<ICostTracking>(
  {
    taskId: {
      type: String,
      required: true,
      index: true,
    },
    planId: {
      type: String,
      required: true,
      index: true,
    },
    agentConfigId: {
      type: String,
      required: true,
      index: true,
    },
    tokenUsage: {
      type: TokenUsageSchema,
      required: true,
      default: () => ({
        input: 0,
        output: 0,
        total: 0,
      }),
    },
    apiCalls: {
      type: Number,
      default: 0,
    },
    estimatedCost: {
      type: Number,
      default: 0,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
CostTrackingSchema.index({ taskId: 1 });
CostTrackingSchema.index({ planId: 1 });
CostTrackingSchema.index({ agentConfigId: 1, timestamp: -1 });
CostTrackingSchema.index({ timestamp: -1 });

export const CostTracking = mongoose.model<ICostTracking>(
  'CostTracking',
  CostTrackingSchema
);

