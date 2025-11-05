import mongoose, { Schema, Document } from 'mongoose';

// Preferences subdocument structure
const PreferencesSchema = new Schema(
  {
    toolPreferences: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    parameterDefaults: {
      type: Map,
      of: Schema.Types.Mixed,
      default: new Map(),
    },
    workflowPreferences: {
      type: [String],
      default: [],
    },
    errorHandling: {
      type: String,
      enum: ['strict', 'lenient'],
      default: 'strict',
    },
  },
  { _id: false }
);

// Correction subdocument structure
const CorrectionSchema = new Schema(
  {
    original: {
      type: Schema.Types.Mixed,
      required: true,
    },
    corrected: {
      type: Schema.Types.Mixed,
      required: true,
    },
    context: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
    },
  },
  { _id: false }
);

// Behavior pattern subdocument structure
const BehaviorPatternSchema = new Schema(
  {
    pattern: {
      type: String,
      required: true,
    },
    frequency: {
      type: Number,
      required: true,
      default: 1,
    },
    context: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

export interface IUserPreference extends Document {
  userId?: string;
  userContext: string;
  preferences: {
    toolPreferences: Map<string, number>;
    parameterDefaults: Map<string, any>;
    workflowPreferences: string[];
    errorHandling: 'strict' | 'lenient';
  };
  corrections: Array<{
    original: any;
    corrected: any;
    context: string;
    timestamp: Date;
  }>;
  patterns: Array<{
    pattern: string;
    frequency: number;
    context: string;
  }>;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserPreferenceSchema = new Schema<IUserPreference>(
  {
    userId: {
      type: String,
      index: true,
    },
    userContext: {
      type: String,
      required: true,
      index: true,
    },
    preferences: {
      type: PreferencesSchema,
      required: true,
      default: () => ({
        toolPreferences: new Map(),
        parameterDefaults: new Map(),
        workflowPreferences: [],
        errorHandling: 'strict',
      }),
    },
    corrections: {
      type: [CorrectionSchema],
      default: [],
    },
    patterns: {
      type: [BehaviorPatternSchema],
      default: [],
    },
    lastUpdated: {
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
UserPreferenceSchema.index({ userContext: 1, lastUpdated: -1 });
UserPreferenceSchema.index({ userId: 1 });

export const UserPreference = mongoose.model<IUserPreference>(
  'UserPreference',
  UserPreferenceSchema
);

