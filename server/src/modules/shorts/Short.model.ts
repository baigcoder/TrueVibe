import mongoose, { Schema, Document } from 'mongoose';

export interface IShort extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    videoUrl: string;
    thumbnailUrl: string;
    caption?: string;
    hashtags: string[];
    audioTrack?: {
        name: string;
        artist?: string;
        url?: string;
    };
    duration: number; // in seconds, max 60
    likes: string[];
    likesCount: number;
    commentsCount: number;
    sharesCount: number;
    viewsCount: number;
    trustLevel: 'authentic' | 'suspicious' | 'fake' | 'pending' | 'likely_fake' | 'likely_real';
    aiAnalysisId?: mongoose.Types.ObjectId;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const shortSchema = new Schema<IShort>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        videoUrl: {
            type: String,
            required: true,
        },
        thumbnailUrl: {
            type: String,
            required: false,
        },
        caption: {
            type: String,
            maxlength: 500,
        },
        hashtags: [{
            type: String,
            lowercase: true,
        }],
        audioTrack: {
            name: { type: String },
            artist: { type: String },
            url: { type: String },
        },
        duration: {
            type: Number,
            default: 30,
            min: 1,
            max: 60,
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
        viewsCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        trustLevel: {
            type: String,
            enum: ['authentic', 'suspicious', 'fake', 'pending', 'likely_fake', 'likely_real'],
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
    },
    {
        timestamps: true,
    }
);

// Indexes for feed and discovery
shortSchema.index({ createdAt: -1, isDeleted: 1 });
shortSchema.index({ hashtags: 1, createdAt: -1 });
shortSchema.index({ viewsCount: -1, createdAt: -1 }); // Trending

export const Short = mongoose.model<IShort>('Short', shortSchema);
