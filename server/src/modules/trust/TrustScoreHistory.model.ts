import mongoose, { Schema, Document } from 'mongoose';

export interface ITrustScoreHistory extends Document {
    userId: string;
    score: number;
    previousScore: number;
    factors: Record<string, number>;
    reason: string;
    createdAt: Date;
}

const trustScoreHistorySchema = new Schema<ITrustScoreHistory>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        score: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        previousScore: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
        },
        factors: {
            type: Schema.Types.Mixed,
            default: {},
        },
        reason: {
            type: String,
            required: true,
            enum: [
                'recalculation',
                'daily_update',
                'verification',
                'new_post',
                'new_follower',
                'report_filed',
                'manual',
            ],
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
trustScoreHistorySchema.index({ userId: 1, createdAt: -1 });

// Auto-expire old entries after 90 days
trustScoreHistorySchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const TrustScoreHistory = mongoose.model<ITrustScoreHistory>(
    'TrustScoreHistory',
    trustScoreHistorySchema
);
