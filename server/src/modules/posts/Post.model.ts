import mongoose, { Schema, Document } from 'mongoose';

export type TrustLevel = 'authentic' | 'suspicious' | 'likely_fake' | 'pending';
export type PostVisibility = 'public' | 'followers' | 'private';
export type PostStatus = 'published' | 'draft' | 'scheduled';

export interface IPollOption {
    _id: mongoose.Types.ObjectId;
    text: string;
    votes: string[]; // User IDs who voted
    votesCount: number;
}

export interface IPoll {
    options: IPollOption[];
    expiresAt?: Date;
    allowMultiple: boolean;
    totalVotes: number;
}

export interface IPost extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    content: string;
    media: mongoose.Types.ObjectId[];
    visibility: PostVisibility;
    likes: string[];
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    reposts: string[];
    savedBy: string[];
    trustLevel: TrustLevel;
    aiAnalysisId?: mongoose.Types.ObjectId;
    isDeleted: boolean;
    // Draft and scheduling support
    status: PostStatus;
    scheduledFor?: Date;
    // Mentions
    mentions: string[]; // User IDs mentioned in the post
    // Poll support
    poll?: IPoll;
    hasPoll: boolean;
    // Hashtags
    hashtags: string[];
    // Pin support
    isPinned: boolean;
    // Quote post support
    quotedPostId?: mongoose.Types.ObjectId;
    views: number;
    uniqueViews: string[]; // User IDs who viewed
    engagementCount: number; // Total likes + comments + shares + saves
    lastAnalyzedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const postSchema = new Schema<IPost>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        content: {
            type: String,
            maxlength: [5000, 'Post content cannot exceed 5000 characters'],
            trim: true,
        },
        media: [{
            type: Schema.Types.ObjectId,
            ref: 'Media',
        }],
        visibility: {
            type: String,
            enum: ['public', 'followers', 'private'],
            default: 'public',
        },
        likes: [{
            type: String,
        }],
        likesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        commentsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        sharesCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        reposts: [{
            type: String,
        }],
        savedBy: [{
            type: String,
        }],
        trustLevel: {
            type: String,
            enum: ['authentic', 'suspicious', 'likely_fake', 'pending'],
            default: 'pending',
        },
        aiAnalysisId: {
            type: Schema.Types.ObjectId,
            ref: 'AIAnalysis',
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        // Draft and scheduling support
        status: {
            type: String,
            enum: ['published', 'draft', 'scheduled'],
            default: 'published',
            index: true,
        },
        scheduledFor: {
            type: Date,
            index: true,
        },
        // Mentions
        mentions: [{
            type: String,
        }],
        // Poll support
        poll: {
            options: [{
                text: { type: String, required: true, maxlength: 100 },
                votes: [{ type: String }],
                votesCount: { type: Number, default: 0 },
            }],
            expiresAt: { type: Date },
            allowMultiple: { type: Boolean, default: false },
            totalVotes: { type: Number, default: 0 },
        },
        hasPoll: {
            type: Boolean,
            default: false,
        },
        // Hashtags
        hashtags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        // Pin support
        isPinned: {
            type: Boolean,
            default: false,
        },
        // Quote post support
        quotedPostId: { type: Schema.Types.ObjectId, ref: 'Post' },
        views: { type: Number, default: 0 },
        uniqueViews: [{ type: String }],
        engagementCount: { type: Number, default: 0 },
        lastAnalyzedAt: { type: Date }
    },
    {
        timestamps: true,
        toJSON: {
            transform: (doc, ret: Record<string, unknown>) => {
                ret.__v = undefined;
                return ret;
            },
        },
    }
);

// Indexes for efficient querying
postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });
postSchema.index({ trustLevel: 1 });
postSchema.index({ visibility: 1, createdAt: -1 });
postSchema.index({ hashtags: 1 }); // For hashtag search
postSchema.index({ hasPoll: 1, createdAt: -1 }); // For polls feed
postSchema.index({ status: 1, scheduledFor: 1 }); // For scheduled posts
postSchema.index({ mentions: 1 }); // For mentions lookup

// Virtual for checking if liked by a user
postSchema.methods.isLikedBy = function (userId: string): boolean {
    return this.likes.includes(userId);
};

// Virtual for checking if saved by a user
postSchema.methods.isSavedBy = function (userId: string): boolean {
    return this.savedBy.includes(userId);
};

export const Post = mongoose.model<IPost>('Post', postSchema);
