import mongoose, { Schema, Document } from 'mongoose';

export interface IAvailableModel extends Document {
  provider: string;
  modelName: string;
  modelId: string;
  createdAt: Date;
  updatedAt: Date;
}

const AvailableModelSchema = new Schema<IAvailableModel>(
  {
    provider: {
      type: String,
      required: true,
      index: true,
    },
    modelName: {
      type: String,
      required: true,
      index: true,
    },
    modelId: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create compound unique index on provider + modelName
AvailableModelSchema.index({ provider: 1, modelName: 1 }, { unique: true });

export const AvailableModel = mongoose.model<IAvailableModel>('AvailableModel', AvailableModelSchema);

