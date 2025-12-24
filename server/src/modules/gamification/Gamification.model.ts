import mongoose, { Schema, Document } from 'mongoose';

// Badge Definition - templates for badges users can earn
export interface IBadge extends Document {
    _id: mongoose.Types.ObjectId;
    slug: string;  // unique identifier like 'first_post', 'streak_7'
    name: string;
    description: string;
    icon: string;  // emoji or icon name
    category: 'engagement' | 'content' | 'social' | 'trust' | 'special';
    tier: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
    xpReward: number;
    requirement: {
        type: 'count' | 'streak' | 'threshold' | 'milestone';
        metric: string;  // e.g., 'posts_created', 'days_active', 'trust_score'
        value: number;
    };
    isActive: boolean;
    createdAt: Date;
}

const badgeSchema = new Schema<IBadge>(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            maxlength: 50,
        },
        description: {
            type: String,
            required: true,
            maxlength: 200,
        },
        icon: {
            type: String,
            required: true,
        },
        category: {
            type: String,
            enum: ['engagement', 'content', 'social', 'trust', 'special'],
            required: true,
        },
        tier: {
            type: String,
            enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
            default: 'bronze',
        },
        xpReward: {
            type: Number,
            default: 10,
            min: 0,
        },
        requirement: {
            type: {
                type: String,
                enum: ['count', 'streak', 'threshold', 'milestone'],
                required: true,
            },
            metric: { type: String, required: true },
            value: { type: Number, required: true },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

export const Badge = mongoose.model<IBadge>('Badge', badgeSchema);

// User Achievement - tracks user's earned badges and progress
export interface IUserAchievement extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    badgeId: mongoose.Types.ObjectId;
    earnedAt: Date;
    progress?: number;  // For badges in progress
}

const userAchievementSchema = new Schema<IUserAchievement>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        badgeId: {
            type: Schema.Types.ObjectId,
            ref: 'Badge',
            required: true,
        },
        earnedAt: {
            type: Date,
            default: Date.now,
        },
        progress: {
            type: Number,
            default: 0,
        },
    },
    { timestamps: false }
);

userAchievementSchema.index({ userId: 1, badgeId: 1 }, { unique: true });

export const UserAchievement = mongoose.model<IUserAchievement>('UserAchievement', userAchievementSchema);

// User Stats - tracks gamification stats
export interface IUserStats extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    xp: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    lastActiveDate: Date;
    stats: {
        postsCreated: number;
        commentsCreated: number;
        likesGiven: number;
        likesReceived: number;
        followersGained: number;
        storiesShared: number;
        shortsCreated: number;
    };
    createdAt: Date;
    updatedAt: Date;
}

const userStatsSchema = new Schema<IUserStats>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        xp: {
            type: Number,
            default: 0,
            min: 0,
        },
        level: {
            type: Number,
            default: 1,
            min: 1,
        },
        currentStreak: {
            type: Number,
            default: 0,
            min: 0,
        },
        longestStreak: {
            type: Number,
            default: 0,
            min: 0,
        },
        lastActiveDate: {
            type: Date,
            default: Date.now,
        },
        stats: {
            postsCreated: { type: Number, default: 0 },
            commentsCreated: { type: Number, default: 0 },
            likesGiven: { type: Number, default: 0 },
            likesReceived: { type: Number, default: 0 },
            followersGained: { type: Number, default: 0 },
            storiesShared: { type: Number, default: 0 },
            shortsCreated: { type: Number, default: 0 },
        },
    },
    { timestamps: true }
);

export const UserStats = mongoose.model<IUserStats>('UserStats', userStatsSchema);

// XP required for each level (exponential growth)
export const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.5, level - 1));

// Calculate level from XP
export const calculateLevel = (xp: number): number => {
    let level = 1;
    let xpNeeded = 0;
    while (xpNeeded + XP_PER_LEVEL(level) <= xp) {
        xpNeeded += XP_PER_LEVEL(level);
        level++;
    }
    return level;
};
