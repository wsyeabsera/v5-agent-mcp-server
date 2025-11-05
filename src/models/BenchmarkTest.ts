import mongoose, { Schema, Document } from 'mongoose';

// Expected outcome subdocument structure
const ExpectedOutcomeSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['success', 'failure', 'specific_output'],
      required: true,
    },
    expectedOutput: {
      type: Schema.Types.Mixed,
    },
    expectedSteps: {
      type: [String],
      default: [],
    },
    maxDuration: {
      type: Number,
    },
  },
  { _id: false }
);

// Test definition subdocument structure
const TestDefinitionSchema = new Schema(
  {
    query: {
      type: String,
      required: true,
    },
    expectedOutcome: {
      type: ExpectedOutcomeSchema,
      required: true,
    },
    context: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export interface IBenchmarkTest extends Document {
  testId: string;
  name: string;
  description: string;
  test: {
    query: string;
    expectedOutcome: {
      type: 'success' | 'failure' | 'specific_output';
      expectedOutput?: any;
      expectedSteps?: string[];
      maxDuration?: number;
    };
    context?: Record<string, any>;
  };
  category: string;
  tags: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

const BenchmarkTestSchema = new Schema<IBenchmarkTest>(
  {
    testId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    test: {
      type: TestDefinitionSchema,
      required: true,
    },
    category: {
      type: String,
      required: true,
      index: true,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    priority: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      default: 'medium',
      index: true,
    },
    createdBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
BenchmarkTestSchema.index({ category: 1, priority: -1 });
BenchmarkTestSchema.index({ tags: 1 });

export const BenchmarkTest = mongoose.model<IBenchmarkTest>(
  'BenchmarkTest',
  BenchmarkTestSchema
);

