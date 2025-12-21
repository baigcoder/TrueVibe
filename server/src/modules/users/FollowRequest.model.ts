import mongoose, { Schema, Document } from 'mongoose';

export interface IFollowRequest extends Document {
    requesterId: string;
    targetId: string;
    status: 'pending' | 'accepted' | 'rejected';
    createdAt: Date;
    updatedAt: Date;
}

const FollowRequestSchema = new Schema<IFollowRequest>(
    {
        requesterId: {
            type: String,
            required: true,
            index: true,
        },
        targetId: {
            type: String,
            required: true,
            index: true,
        },
        status: {
            type: String,
            enum: ['pending', 'accepted', 'rejected'],
            default: 'pending',
        },
    },
    { timestamps: true }
);

// Compound index for efficient lookups
FollowRequestSchema.index({ targetId: 1, status: 1 });
FollowRequestSchema.index({ requesterId: 1, targetId: 1 }, { unique: true });

export const FollowRequest = mongoose.model<IFollowRequest>('FollowRequest', FollowRequestSchema);
