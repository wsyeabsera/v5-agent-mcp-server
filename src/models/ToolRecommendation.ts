import mongoose, { Schema, Document } from 'mongoose';

// Tool recommendation subdocument structure
const ToolRecommendationItemSchema = new Schema(
  {
    toolName: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    score: {
      type: Number,
      required: true,
    },
    reasons: {
      type: [String],
      default: [],
    },
    performance: {
      successRate: Number,
      avgDuration: Number,
      reliability: Number,
    },
    contextFit: {
      score: Number,
      matches: [String],
    },
  },
  { _id: false }
);

// Warning subdocument structure
const WarningSchema = new Schema(
  {
    toolName: {
      type: String,
      required: true,
    },
    warning: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
  },
  { _id: false }
);

export interface IToolRecommendation extends Document {
  requiredAction: string;
  context: string;
  recommendations: Array<{
    toolName: string;
    confidence: number;
    score: number;
    reasons: string[];
    performance: {
      successRate: number;
      avgDuration: number;
      reliability: number;
    };
    contextFit: {
      score: number;
      matches: string[];
    };
  }>;
  warnings: Array<{
    toolName: string;
    warning: string;
    severity: 'low' | 'medium' | 'high';
  }>;
  recommendedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ToolRecommendationSchema = new Schema<IToolRecommendation>(
  {
    requiredAction: {
      type: String,
      required: true,
      index: true,
    },
    context: {
      type: String,
      required: true,
      index: true,
    },
    recommendations: {
      type: [ToolRecommendationItemSchema],
      default: [],
    },
    warnings: {
      type: [WarningSchema],
      default: [],
    },
    recommendedAt: {
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
ToolRecommendationSchema.index({ requiredAction: 1, context: 1 });
ToolRecommendationSchema.index({ recommendedAt: -1 });

export const ToolRecommendation = mongoose.model<IToolRecommendation>(
  'ToolRecommendation',
  ToolRecommendationSchema
);

