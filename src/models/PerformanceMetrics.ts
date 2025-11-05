import mongoose, { Schema, Document } from 'mongoose';

// Data point subdocument structure
const DataPointSchema = new Schema(
  {
    timestamp: {
      type: Date,
      required: true,
    },
    value: {
      type: Number,
      required: true,
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export interface IPerformanceMetrics extends Document {
  metricId: string;
  metricType: 'success_rate' | 'avg_duration' | 'token_usage' | 'error_rate';
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    context?: Record<string, any>;
  }>;
  current: number;
  average: number;
  min: number;
  max: number;
  trend: 'improving' | 'degrading' | 'stable';
  period: 'hour' | 'day' | 'week' | 'month';
  startDate: Date;
  endDate: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PerformanceMetricsSchema = new Schema<IPerformanceMetrics>(
  {
    metricId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    metricType: {
      type: String,
      enum: ['success_rate', 'avg_duration', 'token_usage', 'error_rate'],
      required: true,
      index: true,
    },
    dataPoints: {
      type: [DataPointSchema],
      default: [],
    },
    current: {
      type: Number,
      required: true,
    },
    average: {
      type: Number,
      required: true,
    },
    min: {
      type: Number,
      required: true,
    },
    max: {
      type: Number,
      required: true,
    },
    trend: {
      type: String,
      enum: ['improving', 'degrading', 'stable'],
      required: true,
    },
    period: {
      type: String,
      enum: ['hour', 'day', 'week', 'month'],
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
      index: true,
    },
    endDate: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
PerformanceMetricsSchema.index({ metricType: 1, startDate: -1 });
PerformanceMetricsSchema.index({ period: 1, startDate: -1 });

export const PerformanceMetrics = mongoose.model<IPerformanceMetrics>(
  'PerformanceMetrics',
  PerformanceMetricsSchema
);

