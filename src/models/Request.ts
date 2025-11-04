import mongoose, { Schema, Document } from 'mongoose';

export interface IRequest extends Document {
  query: string;
  categories: string[];
  version: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const RequestSchema = new Schema<IRequest>(
  {
    query: {
      type: String,
      required: true,
      index: true,
    },
    categories: {
      type: [String],
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    tags: {
      type: [String],
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Request = mongoose.model<IRequest>('Request', RequestSchema);

