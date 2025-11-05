import mongoose, { Schema, Document } from 'mongoose';

// Evidence subdocument structure
const EvidenceSchema = new Schema(
  {
    taskId: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// AppliesTo subdocument structure
const AppliesToSchema = new Schema(
  {
    agents: {
      type: [String],
      default: [],
    },
    contexts: {
      type: [String],
      default: [],
    },
    conditions: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false }
);

export interface IAgentInsight extends Document {
  insightId: string;
  agentType: 'thought' | 'planner' | 'executor';
  insightType: 'rule' | 'optimization' | 'warning' | 'pattern' | 'best_practice';
  insight: string; // Human-readable insight
  rule?: string; // Machine-readable rule (optional)
  appliesTo: {
    agents?: string[];
    contexts?: string[];
    conditions?: Record<string, any>;
  };
  evidence: Array<{
    taskId: string;
    description: string;
    timestamp: Date;
  }>;
  confidence: number; // 0-1
  evidenceStrength: number; // Quality of evidence (0-1)
  validated: boolean;
  validatedAt?: Date;
  validatedBy?: 'system' | 'user' | 'agent';
  usageCount: number;
  lastUsed: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AgentInsightSchema = new Schema<IAgentInsight>(
  {
    insightId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    agentType: {
      type: String,
      enum: ['thought', 'planner', 'executor'],
      required: true,
      index: true,
    },
    insightType: {
      type: String,
      enum: ['rule', 'optimization', 'warning', 'pattern', 'best_practice'],
      required: true,
      index: true,
    },
    insight: {
      type: String,
      required: true,
    },
    rule: {
      type: String,
    },
    appliesTo: {
      type: AppliesToSchema,
      default: () => ({
        agents: [],
        contexts: [],
        conditions: {},
      }),
    },
    evidence: {
      type: [EvidenceSchema],
      default: [],
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      index: true,
    },
    evidenceStrength: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5,
    },
    validated: {
      type: Boolean,
      default: false,
      index: true,
    },
    validatedAt: {
      type: Date,
    },
    validatedBy: {
      type: String,
      enum: ['system', 'user', 'agent'],
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    lastUsed: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes for common queries
AgentInsightSchema.index({ agentType: 1, insightType: 1, confidence: -1 }); // Filter by agent, type, and confidence
AgentInsightSchema.index({ validated: 1, confidence: -1 }); // Filter by validation status
AgentInsightSchema.index({ 'appliesTo.contexts': 1 }); // Filter by context
AgentInsightSchema.index({ createdAt: -1 }); // Sort by creation date
AgentInsightSchema.index({ insight: 'text' }); // Full-text search on insight

export const AgentInsight = mongoose.model<IAgentInsight>(
  'AgentInsight',
  AgentInsightSchema
);

