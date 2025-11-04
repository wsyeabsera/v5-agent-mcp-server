import mongoose, { Schema, Document } from 'mongoose';

export interface IResource extends Document {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResourceSchema = new Schema<IResource>(
  {
    uri: {
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
    mimeType: {
      type: String,
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

export const Resource = mongoose.model<IResource>('Resource', ResourceSchema);

