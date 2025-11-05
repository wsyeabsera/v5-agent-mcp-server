import mongoose, { Schema, Document } from 'mongoose';

// Configuration subdocument structure
const ConfigSchema = new Schema(
  {
    agentConfigId: {
      type: String,
      required: true,
    },
    timeout: {
      type: Number,
      default: 30000,
    },
    parallel: {
      type: Boolean,
      default: false,
    },
    maxConcurrent: {
      type: Number,
      default: 1,
    },
  },
  { _id: false }
);

// Results subdocument structure
const ResultsSchema = new Schema(
  {
    totalTests: {
      type: Number,
      required: true,
    },
    passed: {
      type: Number,
      required: true,
    },
    failed: {
      type: Number,
      required: true,
    },
    timeout: {
      type: Number,
      required: true,
    },
    error: {
      type: Number,
      required: true,
    },
    avgDuration: {
      type: Number,
      required: true,
    },
    successRate: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
    },
  },
  { _id: false }
);

// Filters subdocument structure
const FiltersSchema = new Schema(
  {
    categories: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    priority: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

export interface IBenchmarkSuite extends Document {
  suiteId: string;
  name: string;
  description: string;
  testIds: string[];
  filters?: {
    categories?: string[];
    tags?: string[];
    priority?: string[];
  };
  config: {
    agentConfigId: string;
    timeout: number;
    parallel: boolean;
    maxConcurrent: number;
  };
  results: {
    totalTests: number;
    passed: number;
    failed: number;
    timeout: number;
    error: number;
    avgDuration: number;
    successRate: number;
  };
  createdAt: Date;
  completedAt?: Date;
  createdBy?: string;
}

const BenchmarkSuiteSchema = new Schema<IBenchmarkSuite>(
  {
    suiteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    testIds: {
      type: [String],
      required: true,
    },
    filters: {
      type: FiltersSchema,
    },
    config: {
      type: ConfigSchema,
      required: true,
    },
    results: {
      type: ResultsSchema,
    },
    completedAt: {
      type: Date,
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
BenchmarkSuiteSchema.index({ suiteId: 1 });
BenchmarkSuiteSchema.index({ createdAt: -1 });

export const BenchmarkSuite = mongoose.model<IBenchmarkSuite>(
  'BenchmarkSuite',
  BenchmarkSuiteSchema
);

