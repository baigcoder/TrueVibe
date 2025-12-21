import mongoose, { Schema, Document } from 'mongoose';

export interface IAnalyticsSnapshot extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    date: Date;
    metrics: {
        reach: number;
        impressions: number;
        engagement: number;
        engagementRate: number;
        followerGrowth: number;
        trustScoreAverage: number;
        postsCount: number;
        likesReceived: number;
        commentsReceived: number;
        sharesReceived: number;
        topPosts: Array<{
            postId: mongoose.Types.ObjectId;
            reach: number;
            engagement: number;
        }>;
    };
    createdAt: Date;
}

const analyticsSnapshotSchema = new Schema<IAnalyticsSnapshot>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        date: {
            type: Date,
            required: true,
        },
        metrics: {
            reach: { type: Number, default: 0 },
            impressions: { type: Number, default: 0 },
            engagement: { type: Number, default: 0 },
            engagementRate: { type: Number, default: 0 },
            followerGrowth: { type: Number, default: 0 },
            trustScoreAverage: { type: Number, default: 0 },
            postsCount: { type: Number, default: 0 },
            likesReceived: { type: Number, default: 0 },
            commentsReceived: { type: Number, default: 0 },
            sharesReceived: { type: Number, default: 0 },
            topPosts: [{
                postId: { type: Schema.Types.ObjectId, ref: 'Post' },
                reach: { type: Number },
                engagement: { type: Number },
            }],
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

// Compound index for date-based analytics queries
analyticsSnapshotSchema.index({ userId: 1, date: -1 });

export const AnalyticsSnapshot = mongoose.model<IAnalyticsSnapshot>('AnalyticsSnapshot', analyticsSnapshotSchema);
