import mongoose, { Schema, Document } from 'mongoose';

export interface ITool extends Document {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const ToolSchema = new Schema<ITool>(
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
    inputSchema: {
      type: Schema.Types.Mixed,
      required: true,
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

export const Tool = mongoose.model<ITool>('Tool', ToolSchema);

