import mongoose, { Schema, Document } from 'mongoose';

// Live Stream - for broadcasts to large audiences
export interface ILiveStream extends Document {
    _id: mongoose.Types.ObjectId;
    streamKey: string;  // Unique stream key for OBS/streaming software
    hostId: string;
    coHosts: string[];  // Co-hosts with broadcasting privileges
    title: string;
    description?: string;
    thumbnailUrl?: string;
    category: string;
    tags: string[];
    status: 'scheduled' | 'live' | 'ended';
    visibility: 'public' | 'followers' | 'private';
    viewerCount: number;
    peakViewerCount: number;
    totalViews: number;
    likes: number;
    scheduledFor?: Date;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;  // in seconds
    chatEnabled: boolean;
    giftsEnabled: boolean;
    recordingUrl?: string;  // VOD after stream ends
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const liveStreamSchema = new Schema<ILiveStream>(
    {
        streamKey: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        hostId: {
            type: String,
            required: true,
            index: true,
        },
        coHosts: [{
            type: String,
        }],
        title: {
            type: String,
            required: true,
            maxlength: 100,
        },
        description: {
            type: String,
            maxlength: 500,
        },
        thumbnailUrl: {
            type: String,
        },
        category: {
            type: String,
            default: 'General',
            maxlength: 50,
        },
        tags: [{
            type: String,
            lowercase: true,
        }],
        status: {
            type: String,
            enum: ['scheduled', 'live', 'ended'],
            default: 'scheduled',
        },
        visibility: {
            type: String,
            enum: ['public', 'followers', 'private'],
            default: 'public',
        },
        viewerCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        peakViewerCount: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalViews: {
            type: Number,
            default: 0,
            min: 0,
        },
        likes: {
            type: Number,
            default: 0,
            min: 0,
        },
        scheduledFor: {
            type: Date,
        },
        startedAt: {
            type: Date,
        },
        endedAt: {
            type: Date,
        },
        duration: {
            type: Number,
            default: 0,
        },
        chatEnabled: {
            type: Boolean,
            default: true,
        },
        giftsEnabled: {
            type: Boolean,
            default: true,
        },
        recordingUrl: {
            type: String,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

// Indexes
liveStreamSchema.index({ status: 1, viewerCount: -1 }); // Trending live
liveStreamSchema.index({ status: 1, scheduledFor: 1 }); // Upcoming
liveStreamSchema.index({ hostId: 1, createdAt: -1 }); // User's streams

export const LiveStream = mongoose.model<ILiveStream>('LiveStream', liveStreamSchema);

// Stream Viewer - tracks who's watching
export interface IStreamViewer extends Document {
    _id: mongoose.Types.ObjectId;
    streamId: mongoose.Types.ObjectId;
    userId: string;
    joinedAt: Date;
    leftAt?: Date;
    watchTime?: number;  // seconds
}

const streamViewerSchema = new Schema<IStreamViewer>(
    {
        streamId: {
            type: Schema.Types.ObjectId,
            ref: 'LiveStream',
            required: true,
            index: true,
        },
        userId: {
            type: String,
            required: true,
            index: true,
        },
        joinedAt: {
            type: Date,
            default: Date.now,
        },
        leftAt: Date,
        watchTime: {
            type: Number,
            default: 0,
        },
    }
);

streamViewerSchema.index({ streamId: 1, userId: 1 }, { unique: true });

export const StreamViewer = mongoose.model<IStreamViewer>('StreamViewer', streamViewerSchema);

// Generate unique stream key
export const generateStreamKey = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'live_';
    for (let i = 0; i < 20; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
