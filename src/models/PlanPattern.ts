import mongoose, { Schema, Document } from 'mongoose';

export interface IPlanPattern extends Document {
  patternId: string; // Unique pattern identifier
  goalPattern: string; // e.g., "create_*_for_facility_*"
  stepSequence: string[]; // e.g., ["list_facilities", "create_shipment"]
  successRate: number; // 0-1
  avgExecutionTime: number; // milliseconds
  commonIssues: string[];
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PlanPatternSchema = new Schema<IPlanPattern>(
  {
    patternId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    goalPattern: {
      type: String,
      required: true,
      index: true,
    },
    stepSequence: {
      type: [String],
      required: true,
      default: [],
    },
    successRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    avgExecutionTime: {
      type: Number,
      required: true,
    },
    commonIssues: {
      type: [String],
      default: [],
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
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
PlanPatternSchema.index({ goalPattern: 'text' }); // Text search
PlanPatternSchema.index({ successRate: -1, usageCount: -1 }); // Sort by success and usage
PlanPatternSchema.index({ lastUsed: -1 }); // Sort by recency

export const PlanPattern = mongoose.model<IPlanPattern>(
  'PlanPattern',
  PlanPatternSchema
);

