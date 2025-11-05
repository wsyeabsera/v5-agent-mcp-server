import mongoose, { Schema, Document } from 'mongoose';

// Common error subdocument structure
const CommonErrorSchema = new Schema(
  {
    error: {
      type: String,
      required: true,
    },
    frequency: {
      type: Number,
      required: true,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    contexts: {
      type: [String],
      default: [],
    },
    solutions: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

// Optimal context subdocument structure
const OptimalContextSchema = new Schema(
  {
    context: {
      type: String,
      required: true,
    },
    successRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    avgDuration: {
      type: Number,
      required: true,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

// Parameter insight subdocument structure
const ParameterInsightSchema = new Schema(
  {
    parameter: {
      type: String,
      required: true,
    },
    optimalValue: {
      type: Schema.Types.Mixed,
    },
    valuePattern: {
      type: String,
    },
    importance: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
  },
  { _id: false }
);

// Recommendation subdocument structure
const RecommendationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['warning', 'optimization', 'best_practice'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    evidence: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

// Performance subdocument structure
const PerformanceSchema = new Schema(
  {
    totalExecutions: {
      type: Number,
      default: 0,
    },
    successCount: {
      type: Number,
      default: 0,
    },
    failureCount: {
      type: Number,
      default: 0,
    },
    successRate: {
      type: Number,
      min: 0,
      max: 1,
      default: 0,
    },
    avgDuration: {
      type: Number,
      default: 0,
    },
    avgRetries: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

export interface IToolPerformance extends Document {
  toolName: string;
  performance: {
    totalExecutions: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    avgDuration: number;
    avgRetries: number;
  };
  optimalContexts: Array<{
    context: string;
    successRate: number;
    avgDuration: number;
    usageCount: number;
  }>;
  commonErrors: Array<{
    error: string;
    frequency: number;
    percentage: number;
    contexts: string[];
    solutions: string[];
  }>;
  parameterInsights: Array<{
    parameter: string;
    optimalValue: any;
    valuePattern: string;
    importance: number;
  }>;
  recommendations: Array<{
    type: 'warning' | 'optimization' | 'best_practice';
    message: string;
    confidence: number;
    evidence: string[];
  }>;
  lastUpdated: Date;
  lastAnalyzed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ToolPerformanceSchema = new Schema<IToolPerformance>(
  {
    toolName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    performance: {
      type: PerformanceSchema,
      required: true,
      default: () => ({
        totalExecutions: 0,
        successCount: 0,
        failureCount: 0,
        successRate: 0,
        avgDuration: 0,
        avgRetries: 0,
      }),
    },
    optimalContexts: {
      type: [OptimalContextSchema],
      default: [],
    },
    commonErrors: {
      type: [CommonErrorSchema],
      default: [],
    },
    parameterInsights: {
      type: [ParameterInsightSchema],
      default: [],
    },
    recommendations: {
      type: [RecommendationSchema],
      default: [],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
      index: true,
    },
    lastAnalyzed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
ToolPerformanceSchema.index({ toolName: 1 }); // Unique tool lookup
ToolPerformanceSchema.index({ lastUpdated: -1 }); // Sort by update time
ToolPerformanceSchema.index({ 'optimalContexts.context': 1 }); // Context lookup

export const ToolPerformance = mongoose.model<IToolPerformance>(
  'ToolPerformance',
  ToolPerformanceSchema
);

