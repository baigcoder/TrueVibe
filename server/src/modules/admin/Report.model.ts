import mongoose, { Schema, Document } from 'mongoose';

export type ReportStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type ReportTargetType = 'post' | 'comment' | 'user';

export interface IReport extends Document {
    _id: mongoose.Types.ObjectId;
    reporterId: string;
    targetType: ReportTargetType;
    targetId: string;
    reason: string;
    description: string;
    status: ReportStatus;
    reviewedBy?: string;
    resolution?: string;
    createdAt: Date;
    resolvedAt?: Date;
}

const reportSchema = new Schema<IReport>(
    {
        reporterId: {
            type: String,
            required: true,
            index: true,
        },
        targetType: {
            type: String,
            enum: ['post', 'comment', 'user'],
            required: true,
        },
        targetId: {
            type: String,
            required: true,
            index: true,
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'spam',
                'harassment',
                'hate_speech',
                'misinformation',
                'deepfake',
                'violence',
                'nudity',
                'copyright',
                'other',
            ],
        },
        description: {
            type: String,
            maxlength: 1000,
            default: '',
        },
        status: {
            type: String,
            enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
            default: 'pending',
        },
        reviewedBy: {
            type: String,
        },
        resolution: {
            type: String,
            maxlength: 500,
        },
        resolvedAt: {
            type: Date,
        },
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
        toJSON: {
            transform: (doc, ret: Record<string, unknown>) => {
                ret.__v = undefined;
                return ret;
            },
        },
    }
);

// Index for admin moderation queue
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1 });

export const Report = mongoose.model<IReport>('Report', reportSchema);
