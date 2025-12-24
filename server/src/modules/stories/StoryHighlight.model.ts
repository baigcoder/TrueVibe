import mongoose, { Schema, Document } from 'mongoose';

export interface IStoryHighlight extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    title: string;
    coverImageUrl?: string;
    stories: {
        storyId?: mongoose.Types.ObjectId; // Original story ID (if still exists)
        mediaUrl: string;
        mediaType: 'image' | 'video';
        thumbnailUrl?: string;
        caption?: string;
        savedAt: Date;
    }[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const storyHighlightSchema = new Schema<IStoryHighlight>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: true,
            maxlength: 50,
            trim: true,
        },
        coverImageUrl: {
            type: String,
        },
        stories: [{
            storyId: {
                type: Schema.Types.ObjectId,
                ref: 'Story',
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
            thumbnailUrl: String,
            caption: String,
            savedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    }
);

// Index for user's highlights
storyHighlightSchema.index({ userId: 1, isActive: 1, createdAt: -1 });

export const StoryHighlight = mongoose.model<IStoryHighlight>('StoryHighlight', storyHighlightSchema);
