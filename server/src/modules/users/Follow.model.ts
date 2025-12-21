import mongoose, { Schema, Document } from 'mongoose';

export interface IFollow extends Document {
    _id: mongoose.Types.ObjectId;
    followerId: string;
    followingId: string;
    createdAt: Date;
}

const followSchema = new Schema<IFollow>(
    {
        followerId: {
            type: String,
            required: true,
            index: true,
        },
        followingId: {
            type: String,
            required: true,
            index: true,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Compound index to prevent duplicate follows and for efficient queries
followSchema.index({ followerId: 1, followingId: 1 }, { unique: true });

export const Follow = mongoose.model<IFollow>('Follow', followSchema);
