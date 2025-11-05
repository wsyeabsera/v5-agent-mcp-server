import mongoose, { Schema, Document } from 'mongoose';

// Thought subdocument structure
const ThoughtSubSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    timestamp: {
      type: String,
      required: true,
    },
    reasoning: {
      type: String,
      required: true,
    },
    approaches: {
      type: [String],
      required: true,
      default: [],
    },
    constraints: {
      type: [String],
      required: true,
      default: [],
    },
    assumptions: {
      type: [String],
      required: true,
      default: [],
    },
    uncertainties: {
      type: [String],
      required: true,
      default: [],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

export interface IThought extends Document {
  userQuery: string;
  agentConfigId: string;
  thoughts: Array<{
    id: string;
    timestamp: string;
    reasoning: string;
    approaches: string[];
    constraints: string[];
    assumptions: string[];
    uncertainties: string[];
    confidence: number;
  }>;
  primaryApproach: string;
  keyInsights: string[];
  recommendedTools: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ThoughtSchema = new Schema<IThought>(
  {
    userQuery: {
      type: String,
      required: true,
      index: true,
    },
    agentConfigId: {
      type: String,
      required: true,
      index: true,
    },
    thoughts: {
      type: [ThoughtSubSchema],
      required: true,
      default: [],
    },
    primaryApproach: {
      type: String,
      required: true,
    },
    keyInsights: {
      type: [String],
      required: true,
      default: [],
    },
    recommendedTools: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
ThoughtSchema.index({ createdAt: -1 }); // For sorting by date
ThoughtSchema.index({ userQuery: 'text' }); // For text search
ThoughtSchema.index({ agentConfigId: 1, createdAt: -1 }); // For filtering by agent config

export const Thought = mongoose.model<IThought>('Thought', ThoughtSchema);

