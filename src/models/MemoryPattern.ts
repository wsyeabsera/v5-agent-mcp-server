import mongoose, { Schema, Document } from 'mongoose';

// Pattern definition subdocument structure
const PatternDefinitionSchema = new Schema(
  {
    query: {
      type: String,
    },
    goal: {
      type: String,
    },
    steps: {
      type: [String],
      default: [],
    },
    context: {
      type: String,
    },
  },
  { _id: false }
);

// Success metrics subdocument structure
const SuccessMetricsSchema = new Schema(
  {
    successRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    avgExecutionTime: {
      type: Number,
      required: true,
    },
    avgSteps: {
      type: Number,
      required: true,
    },
    reliability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

// Evidence subdocument structure
const EvidenceSchema = new Schema(
  {
    taskId: {
      type: String,
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    outcome: {
      type: String,
      enum: ['success', 'failure'],
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

export interface IMemoryPattern extends Document {
  patternId: string;
  patternType: 'query_pattern' | 'plan_pattern' | 'tool_sequence' | 'error_pattern';
  pattern: {
    query?: string;
    goal?: string;
    steps?: string[];
    context?: string;
  };
  successMetrics: {
    successRate: number;
    avgExecutionTime: number;
    avgSteps: number;
    reliability: number;
  };
  usageCount: number;
  lastUsed: Date;
  firstSeen: Date;
  evidence: Array<{
    taskId: string;
    planId: string;
    outcome: 'success' | 'failure';
    timestamp: Date;
  }>;
  confidence: number;
  validatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MemoryPatternSchema = new Schema<IMemoryPattern>(
  {
    patternId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patternType: {
      type: String,
      enum: ['query_pattern', 'plan_pattern', 'tool_sequence', 'error_pattern'],
      required: true,
      index: true,
    },
    pattern: {
      type: PatternDefinitionSchema,
      required: true,
    },
    successMetrics: {
      type: SuccessMetricsSchema,
      required: true,
    },
    usageCount: {
      type: Number,
      default: 0,
      index: true,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
      index: true,
    },
    firstSeen: {
      type: Date,
      default: Date.now,
    },
    evidence: {
      type: [EvidenceSchema],
      default: [],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    validatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
MemoryPatternSchema.index({ patternType: 1, 'pattern.pattern': 'text' });
MemoryPatternSchema.index({ 'successMetrics.successRate': -1, usageCount: -1 });
MemoryPatternSchema.index({ lastUsed: -1 });

export const MemoryPattern = mongoose.model<IMemoryPattern>(
  'MemoryPattern',
  MemoryPatternSchema
);

