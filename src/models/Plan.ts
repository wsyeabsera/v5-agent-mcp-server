import mongoose, { Schema, Document } from 'mongoose';

// Plan step subdocument structure
const PlanStepSchema = new Schema(
  {
    id: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      required: true,
    },
    action: {
      type: String,
      required: true,
    },
    parameters: {
      type: Schema.Types.Mixed,
      required: true,
      default: {},
    },
    expectedOutput: {
      type: Schema.Types.Mixed,
      default: {},
    },
    dependencies: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'skipped'],
      default: 'pending',
    },
  },
  { _id: false }
);

// Missing data subdocument structure
const MissingDataSchema = new Schema(
  {
    step: {
      type: String,
      required: true,
    },
    field: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
  },
  { _id: false }
);

export interface IPlan extends Document {
  thoughtId?: string; // Reference to Thought document
  userQuery: string;
  goal: string;
  steps: Array<{
    id: string;
    order: number;
    action: string;
    parameters: Record<string, any>;
    expectedOutput?: Record<string, any>;
    dependencies: string[];
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  }>;
  missingData: Array<{
    step: string;
    field: string;
    type: string;
    description?: string;
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  agentConfigId: string;
  createdAt: Date;
  updatedAt: Date;
}

const PlanSchema = new Schema<IPlan>(
  {
    thoughtId: {
      type: String,
      index: true,
    },
    userQuery: {
      type: String,
      required: true,
      index: true,
    },
    goal: {
      type: String,
      required: true,
    },
    steps: {
      type: [PlanStepSchema],
      required: true,
      default: [],
    },
    missingData: {
      type: [MissingDataSchema],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
      default: 'pending',
      index: true,
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
PlanSchema.index({ createdAt: -1 }); // For sorting by date
PlanSchema.index({ thoughtId: 1, createdAt: -1 }); // For filtering by thought
PlanSchema.index({ status: 1, createdAt: -1 }); // For filtering by status
PlanSchema.index({ agentConfigId: 1, createdAt: -1 }); // For filtering by agent config

export const Plan = mongoose.model<IPlan>('Plan', PlanSchema);

