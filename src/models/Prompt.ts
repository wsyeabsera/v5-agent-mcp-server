import mongoose, { Schema, Document } from 'mongoose';

export interface IPrompt extends Document {
  name: string;
  description: string;
  arguments?: Array<{
    name: string;
    description?: string;
    required?: boolean;
  }>;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const PromptSchema = new Schema<IPrompt>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    description: {
      type: String,
      required: true,
    },
    arguments: {
      type: [
        {
          name: String,
          description: String,
          required: Boolean,
        },
      ],
    },
    source: {
      type: String,
      default: 'remote',
      enum: ['remote', 'local'],
    },
  },
  {
    timestamps: true,
  }
);

export const Prompt = mongoose.model<IPrompt>('Prompt', PromptSchema);

