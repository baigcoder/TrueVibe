import mongoose, { Schema, Document } from 'mongoose';

export interface IStory extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    thumbnailUrl?: string;
    caption?: string;
    viewers: {
        userId: string;
        viewedAt: Date;
    }[];
    likes: string[]; // Array of user IDs
    comments: {
        _id: mongoose.Types.ObjectId;
        userId: string;
        content: string;
        createdAt: Date;
    }[];
    reactions: {
        userId: string;
        emoji: string;
        createdAt: Date;
    }[];
    // AI Analysis fields
    trustLevel: 'authentic' | 'suspicious' | 'fake' | 'pending' | 'likely_fake' | 'likely_real';
    aiAnalysisId?: mongoose.Types.ObjectId;
    expiresAt: Date;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const storySchema = new Schema<IStory>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        mediaUrl: {
            type: String,
            required: true,
        },
        mediaType: {
            type: String,
            enum: ['image', 'video'],
            required: true,
        },
        thumbnailUrl: {
            type: String,
        },
        caption: {
            type: String,
            maxlength: 200,
        },
        viewers: [{
            userId: { type: String, required: true },
            viewedAt: { type: Date, default: Date.now },
        }],
        likes: [{
            type: String,
            index: true,
        }],
        comments: [{
            userId: { type: String, required: true },
            content: { type: String, required: true, maxlength: 500 },
            createdAt: { type: Date, default: Date.now },
        }],
        reactions: [{
            userId: { type: String, required: true },
            emoji: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        }],
        // AI Analysis fields
        trustLevel: {
            type: String,
            enum: ['authentic', 'suspicious', 'fake', 'pending', 'likely_fake', 'likely_real'],
            default: 'pending',
        },
        aiAnalysisId: {
            type: Schema.Types.ObjectId,
            ref: 'AIAnalysis',
        },
        expiresAt: {
            type: Date,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Auto-expire stories after 24 hours
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound index for feed queries
storySchema.index({ userId: 1, createdAt: -1, isDeleted: 1 });

export const Story = mongoose.model<IStory>('Story', storySchema);
