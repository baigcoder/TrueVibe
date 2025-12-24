import mongoose, { Schema, Document } from 'mongoose';

// Audio/Sound for Shorts
export interface IAudio extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    artist: string;
    audioUrl: string;
    coverUrl?: string;
    duration: number; // in seconds
    genre?: string;
    tags: string[];
    isOriginal: boolean;
    originalCreatorId?: string;  // If user-created
    usageCount: number;  // How many shorts use this
    featuredAt?: Date;   // If featured/promoted
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const audioSchema = new Schema<IAudio>(
    {
        title: {
            type: String,
            required: true,
            index: 'text',
            maxlength: 100,
        },
        artist: {
            type: String,
            required: true,
            index: 'text',
            maxlength: 100,
        },
        audioUrl: {
            type: String,
            required: true,
        },
        coverUrl: {
            type: String,
        },
        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 60,
        },
        genre: {
            type: String,
            maxlength: 50,
        },
        tags: [{
            type: String,
            lowercase: true,
        }],
        isOriginal: {
            type: Boolean,
            default: false,
        },
        originalCreatorId: {
            type: String,
            sparse: true,
            index: true,
        },
        usageCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        featuredAt: {
            type: Date,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes
audioSchema.index({ usageCount: -1 }); // Trending
audioSchema.index({ createdAt: -1 }); // Recent
audioSchema.index({ genre: 1, usageCount: -1 });
audioSchema.index({ tags: 1 });

export const Audio = mongoose.model<IAudio>('Audio', audioSchema);

// User's saved/favorite sounds
export interface ISavedAudio extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    audioId: mongoose.Types.ObjectId;
    savedAt: Date;
}

const savedAudioSchema = new Schema<ISavedAudio>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        audioId: {
            type: Schema.Types.ObjectId,
            ref: 'Audio',
            required: true,
        },
        savedAt: {
            type: Date,
            default: Date.now,
        },
    }
);

savedAudioSchema.index({ userId: 1, audioId: 1 }, { unique: true });

export const SavedAudio = mongoose.model<ISavedAudio>('SavedAudio', savedAudioSchema);
