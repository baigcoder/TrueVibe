import mongoose, { Document, Schema } from 'mongoose';

export type BadgeType = 'bronze' | 'silver' | 'gold' | 'verified_creator';

export interface IVerificationBadge extends Document {
    userId: string;
    badgeType: BadgeType;
    earnedAt: Date;
    authenticPosts: number;
    totalPosts: number;
    criteria: {
        minPosts: number;
        maxFakeRate: number;
        description: string;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const verificationBadgeSchema = new Schema<IVerificationBadge>(
    {
        userId: { type: String, required: true, index: true },
        badgeType: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'verified_creator'],
            required: true
        },
        earnedAt: { type: Date, default: Date.now },
        authenticPosts: { type: Number, default: 0 },
        totalPosts: { type: Number, default: 0 },
        criteria: {
            minPosts: { type: Number, required: true },
            maxFakeRate: { type: Number, required: true },
            description: { type: String, required: true },
        },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);

// Ensure one badge type per user
verificationBadgeSchema.index({ userId: 1, badgeType: 1 }, { unique: true });

// Badge criteria definitions
export const BADGE_CRITERIA = {
    bronze: {
        minPosts: 10,
        maxFakeRate: 0.1, // Max 10% fake posts
        description: '10+ authentic posts with <10% flagged content',
    },
    silver: {
        minPosts: 50,
        maxFakeRate: 0.05, // Max 5% fake posts
        description: '50+ authentic posts with <5% flagged content',
    },
    gold: {
        minPosts: 100,
        maxFakeRate: 0.02, // Max 2% fake posts
        description: '100+ authentic posts with <2% flagged content',
    },
    verified_creator: {
        minPosts: 200,
        maxFakeRate: 0.01, // Max 1% fake posts
        description: '200+ authentic posts, verified identity, <1% flagged',
    },
};

export const VerificationBadge = mongoose.model<IVerificationBadge>('VerificationBadge', verificationBadgeSchema);
