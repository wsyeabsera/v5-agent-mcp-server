import mongoose, { Schema, Document } from 'mongoose';

// Baseline subdocument structure
const BaselineSchema = new Schema(
  {
    runId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['passed', 'failed'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    metrics: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

// Current subdocument structure
const CurrentSchema = new Schema(
  {
    runId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['passed', 'failed'],
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    metrics: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

// Delta subdocument structure
const DeltaSchema = new Schema(
  {
    statusChanged: {
      type: Boolean,
      required: true,
    },
    durationDelta: {
      type: Number,
      required: true,
    },
    metricDeltas: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export interface IRegression extends Document {
  regressionId: string;
  testId: string;
  testName: string;
  detectedAt: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
  baseline: {
    runId: string;
    status: 'passed' | 'failed';
    duration: number;
    metrics: Record<string, any>;
  };
  current: {
    runId: string;
    status: 'passed' | 'failed';
    duration: number;
    metrics: Record<string, any>;
  };
  delta: {
    statusChanged: boolean;
    durationDelta: number;
    metricDeltas: Record<string, number>;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolution?: string;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RegressionSchema = new Schema<IRegression>(
  {
    regressionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    testId: {
      type: String,
      required: true,
      index: true,
    },
    testName: {
      type: String,
      required: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true,
      index: true,
    },
    baseline: {
      type: BaselineSchema,
      required: true,
    },
    current: {
      type: CurrentSchema,
      required: true,
    },
    delta: {
      type: DeltaSchema,
      required: true,
    },
    resolved: {
      type: Boolean,
      default: false,
      index: true,
    },
    resolvedAt: {
      type: Date,
    },
    resolution: {
      type: String,
    },
    resolvedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
RegressionSchema.index({ testId: 1, resolved: 1, detectedAt: -1 });
RegressionSchema.index({ severity: 1, resolved: 1 });
RegressionSchema.index({ detectedAt: -1 });

export const Regression = mongoose.model<IRegression>(
  'Regression',
  RegressionSchema
);

