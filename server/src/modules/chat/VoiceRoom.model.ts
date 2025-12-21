import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingRequest {
    userId: mongoose.Types.ObjectId;
    name: string;
    avatar?: string;
    requestedAt: Date;
}

export interface IRaisedHand {
    userId: mongoose.Types.ObjectId;
    name: string;
    avatar?: string;
    raisedAt: Date;
}

export interface IVoiceRoom extends Document {
    _id: mongoose.Types.ObjectId;
    roomId?: string;
    serverId?: mongoose.Types.ObjectId;
    channelId?: mongoose.Types.ObjectId;
    name: string;
    creatorId: mongoose.Types.ObjectId;
    admins: mongoose.Types.ObjectId[];
    participants: mongoose.Types.ObjectId[];
    speakers: mongoose.Types.ObjectId[];      // Users who can speak
    listeners: mongoose.Types.ObjectId[];     // Users in listen-only mode
    raisedHands: IRaisedHand[];              // Users requesting to speak
    pendingRequests: IPendingRequest[];
    maxParticipants: number;
    isActive: boolean;
    requireApproval: boolean;
    type: 'voice' | 'video' | 'live';
    topics: string[];                         // Room topics/tags
    scheduledFor?: Date;                      // Scheduled room start time
    isScheduled: boolean;                     // Is this a scheduled room?
    isRecording: boolean;                     // Recording flag
    reactions: { emoji: string; count: number; }[];  // Live reactions
    createdAt: Date;
    updatedAt: Date;
}

const pendingRequestSchema = new Schema<IPendingRequest>({
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    requestedAt: { type: Date, default: Date.now },
}, { _id: false });

const raisedHandSchema = new Schema<IRaisedHand>({
    userId: { type: Schema.Types.ObjectId, ref: 'Profile', required: true },
    name: { type: String, required: true },
    avatar: { type: String },
    raisedAt: { type: Date, default: Date.now },
}, { _id: false });

const voiceRoomSchema = new Schema<IVoiceRoom>(
    {
        roomId: {
            type: String,
            unique: true,
            sparse: true, // Allow multiple nulls for server channels
            index: true,
        },
        serverId: {
            type: Schema.Types.ObjectId,
            ref: 'Server',
            index: true,
        },
        channelId: {
            type: Schema.Types.ObjectId,
            ref: 'Channel',
            unique: true,
            sparse: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 50,
        },
        creatorId: {
            type: Schema.Types.ObjectId,
            ref: 'Profile',
            required: true,
        },
        admins: [{
            type: Schema.Types.ObjectId,
            ref: 'Profile',
        }],
        participants: [{
            type: Schema.Types.ObjectId,
            ref: 'Profile',
        }],
        speakers: [{
            type: Schema.Types.ObjectId,
            ref: 'Profile',
        }],
        listeners: [{
            type: Schema.Types.ObjectId,
            ref: 'Profile',
        }],
        raisedHands: [raisedHandSchema],
        pendingRequests: [pendingRequestSchema],
        topics: [{
            type: String,
            trim: true,
        }],
        scheduledFor: {
            type: Date,
            default: null,
        },
        isScheduled: {
            type: Boolean,
            default: false,
        },
        isRecording: {
            type: Boolean,
            default: false,
        },
        reactions: [{
            emoji: { type: String, required: true },
            count: { type: Number, default: 0 },
        }],
        maxParticipants: {
            type: Number,
            default: 10,
            min: 2,
            max: 20,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        requireApproval: {
            type: Boolean,
            default: true,
        },
        type: {
            type: String,
            enum: ['voice', 'video', 'live'],
            default: 'voice',
        },
    },
    {
        timestamps: true,
    }
);

// Index for finding active rooms
voiceRoomSchema.index({ isActive: 1, createdAt: -1 });
// Index for scheduled rooms
voiceRoomSchema.index({ isScheduled: 1, scheduledFor: 1 });

// Generate a unique room ID
export function generateRoomId(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const segments = [];
    for (let i = 0; i < 3; i++) {
        let segment = '';
        for (let j = 0; j < 3; j++) {
            segment += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        segments.push(segment);
    }
    return segments.join('-');
}

export const VoiceRoom = mongoose.model<IVoiceRoom>('VoiceRoom', voiceRoomSchema);
