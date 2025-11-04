import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IAgentConfig extends Document {
  availableModelId: Types.ObjectId;
  apiKey: string;
  maxTokenCount: number;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AgentConfigSchema = new Schema<IAgentConfig>(
  {
    availableModelId: {
      type: Schema.Types.ObjectId,
      ref: 'AvailableModel',
      index: true,
      required: true,
    },
    apiKey: {
      type: String,
      required: true,
    },
    maxTokenCount: {
      type: Number,
      required: true,
    },
    isEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Note: No unique indexes are defined - this allows multiple configs per model
// (one-to-many relationship between AvailableModel and AgentConfig)

export const AgentConfig = mongoose.model<IAgentConfig>('AgentConfigs', AgentConfigSchema);

