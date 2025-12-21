import mongoose, { Schema, Document } from 'mongoose';

export type MediaType = 'image' | 'video';

export interface IMedia extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    type: MediaType;
    cloudinaryId: string;
    url: string; // This will continue to be the main URL (likely the optimized one)
    optimizedUrl?: string;
    originalUrl?: string;
    thumbnailUrl: string;
    width: number;
    height: number;
    duration?: number; // For videos
    sizeBytes: number;
    mimeType: string;
    aiAnalysisId?: mongoose.Types.ObjectId;
    createdAt: Date;
}

const mediaSchema = new Schema<IMedia>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['image', 'video'],
            required: true,
        },
        cloudinaryId: {
            type: String,
            required: true,
            unique: true,
        },
        url: {
            type: String,
            required: true,
        },
        optimizedUrl: {
            type: String,
        },
        originalUrl: {
            type: String,
        },
        thumbnailUrl: {
            type: String,
            default: '',
        },
        width: {
            type: Number,
            default: 0,
        },
        height: {
            type: Number,
            default: 0,
        },
        duration: {
            type: Number,
            default: 0,
        },
        sizeBytes: {
            type: Number,
            default: 0,
        },
        mimeType: {
            type: String,
            default: '',
        },
        aiAnalysisId: {
            type: Schema.Types.ObjectId,
            ref: 'AIAnalysis',
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

export const Media = mongoose.model<IMedia>('Media', mediaSchema);
