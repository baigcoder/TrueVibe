import mongoose, { Document, Schema } from 'mongoose';

export type FlagReason = 'high_fake_score' | 'user_report' | 'auto_moderation' | 'manual';
export type FlagStatus = 'pending' | 'reviewed' | 'removed' | 'approved' | 'dismissed';

export interface IFlaggedPost extends Document {
    postId: mongoose.Types.ObjectId;
    contentType: 'post' | 'short' | 'story';
    userId: string; // Post owner
    flaggedBy: 'system' | 'user' | 'admin';
    flaggedByUserId?: string; // If user reported
    reason: FlagReason;
    fakeScore?: number;
    details: string;
    status: FlagStatus;
    reviewedBy?: string; // Admin who reviewed
    reviewedAt?: Date;
    reviewNotes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const flaggedPostSchema = new Schema<IFlaggedPost>(
    {
        postId: { type: Schema.Types.ObjectId, required: true, index: true },
        contentType: { type: String, enum: ['post', 'short', 'story'], default: 'post' },
        userId: { type: String, required: true, index: true },
        flaggedBy: { type: String, enum: ['system', 'user', 'admin'], required: true },
        flaggedByUserId: { type: String },
        reason: {
            type: String,
            enum: ['high_fake_score', 'user_report', 'auto_moderation', 'manual'],
            required: true,
            index: true
        },
        fakeScore: { type: Number },
        details: { type: String, required: true },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'removed', 'approved', 'dismissed'],
            default: 'pending',
            index: true
        },
        reviewedBy: { type: String },
        reviewedAt: { type: Date },
        reviewNotes: { type: String },
    },
    { timestamps: true }
);

// Compound index for finding pending flags efficiently
flaggedPostSchema.index({ status: 1, createdAt: -1 });
flaggedPostSchema.index({ postId: 1, reason: 1 }, { unique: true });

export const FlaggedPost = mongoose.model<IFlaggedPost>('FlaggedPost', flaggedPostSchema);
