import mongoose, { Schema, Document } from 'mongoose';

// Execution subdocument structure
const ExecutionSchema = new Schema(
  {
    taskId: {
      type: String,
      required: true,
    },
    planId: {
      type: String,
      required: true,
    },
    thoughtId: {
      type: String,
    },
    agentConfigId: {
      type: String,
      required: true,
    },
    startedAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
    },
    duration: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

// Result subdocument structure
const ResultSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['passed', 'failed', 'timeout', 'error'],
      required: true,
    },
    actualOutput: {
      type: Schema.Types.Mixed,
    },
    actualSteps: {
      type: [String],
      default: [],
    },
    error: {
      type: String,
    },
    matchesExpected: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

// Metrics subdocument structure
const MetricsSchema = new Schema(
  {
    executionTime: {
      type: Number,
      required: true,
    },
    stepsCompleted: {
      type: Number,
      required: true,
    },
    stepsExpected: {
      type: Number,
      required: true,
    },
    retries: {
      type: Number,
      default: 0,
    },
    userInputsRequired: {
      type: Number,
      default: 0,
    },
    tokenUsage: {
      type: Number,
    },
    apiCalls: {
      type: Number,
    },
  },
  { _id: false }
);

// Baseline comparison subdocument structure
const BaselineComparisonSchema = new Schema(
  {
    baselineRunId: {
      type: String,
    },
    performanceDelta: {
      type: Number,
    },
    statusChange: {
      type: String,
      enum: ['improved', 'degraded', 'same'],
    },
  },
  { _id: false }
);

export interface IBenchmarkRun extends Document {
  runId: string;
  testId: string;
  testName: string;
  execution: {
    taskId: string;
    planId: string;
    thoughtId?: string;
    agentConfigId: string;
    startedAt: Date;
    completedAt?: Date;
    duration: number;
  };
  result: {
    status: 'passed' | 'failed' | 'timeout' | 'error';
    actualOutput?: any;
    actualSteps?: string[];
    error?: string;
    matchesExpected: boolean;
  };
  metrics: {
    executionTime: number;
    stepsCompleted: number;
    stepsExpected: number;
    retries: number;
    userInputsRequired: number;
    tokenUsage?: number;
    apiCalls?: number;
  };
  baselineComparison?: {
    baselineRunId: string;
    performanceDelta: number;
    statusChange: 'improved' | 'degraded' | 'same';
  };
  createdAt: Date;
}

const BenchmarkRunSchema = new Schema<IBenchmarkRun>(
  {
    runId: {
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
    execution: {
      type: ExecutionSchema,
      required: true,
    },
    result: {
      type: ResultSchema,
      required: true,
    },
    metrics: {
      type: MetricsSchema,
      required: true,
    },
    baselineComparison: {
      type: BaselineComparisonSchema,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
BenchmarkRunSchema.index({ testId: 1, createdAt: -1 });
BenchmarkRunSchema.index({ 'execution.agentConfigId': 1, createdAt: -1 });
BenchmarkRunSchema.index({ 'result.status': 1, createdAt: -1 });

export const BenchmarkRun = mongoose.model<IBenchmarkRun>(
  'BenchmarkRun',
  BenchmarkRunSchema
);

