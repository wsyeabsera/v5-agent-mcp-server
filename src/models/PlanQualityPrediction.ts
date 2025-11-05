import mongoose, { Schema, Document } from 'mongoose';

// Prediction subdocument structure
const PredictionSchema = new Schema(
  {
    successProbability: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
    },
    estimatedDuration: {
      type: Number,
      required: true,
    },
    estimatedCost: {
      type: Number,
    },
  },
  { _id: false }
);

// Risk factor subdocument structure
const RiskFactorSchema = new Schema(
  {
    factor: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    mitigation: {
      type: String,
    },
  },
  { _id: false }
);

// Recommendation subdocument structure
const RecommendationSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['optimization', 'warning', 'alternative'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    suggestedAction: {
      type: Schema.Types.Mixed,
    },
  },
  { _id: false }
);

// Comparison subdocument structure
const ComparisonSchema = new Schema(
  {
    similarPlans: {
      type: [
        {
          planId: String,
          successRate: Number,
          similarity: Number,
        },
      ],
      default: [],
    },
    baseline: {
      avgSuccessRate: Number,
      avgDuration: Number,
    },
  },
  { _id: false }
);

export interface IPlanQualityPrediction extends Document {
  planId: string;
  prediction: {
    successProbability: number;
    confidence: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    estimatedDuration: number;
    estimatedCost?: number;
  };
  riskFactors: Array<{
    factor: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    mitigation?: string;
  }>;
  recommendations: Array<{
    type: 'optimization' | 'warning' | 'alternative';
    priority: 'high' | 'medium' | 'low';
    message: string;
    suggestedAction?: any;
  }>;
  comparison?: {
    similarPlans: Array<{
      planId: string;
      successRate: number;
      similarity: number;
    }>;
    baseline: {
      avgSuccessRate: number;
      avgDuration: number;
    };
  };
  predictedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanQualityPredictionSchema = new Schema<IPlanQualityPrediction>(
  {
    planId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    prediction: {
      type: PredictionSchema,
      required: true,
    },
    riskFactors: {
      type: [RiskFactorSchema],
      default: [],
    },
    recommendations: {
      type: [RecommendationSchema],
      default: [],
    },
    comparison: {
      type: ComparisonSchema,
    },
    predictedAt: {
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
PlanQualityPredictionSchema.index({ planId: 1 });
PlanQualityPredictionSchema.index({ 'prediction.riskLevel': 1, 'prediction.successProbability': -1 });
PlanQualityPredictionSchema.index({ predictedAt: -1 });

export const PlanQualityPrediction = mongoose.model<IPlanQualityPrediction>(
  'PlanQualityPrediction',
  PlanQualityPredictionSchema
);

