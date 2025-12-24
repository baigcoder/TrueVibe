import mongoose, { Schema, Document } from 'mongoose';

export interface IGroupCall extends Document {
    _id: mongoose.Types.ObjectId;
    roomId: string;
    hostId: string;
    title?: string;
    callType: 'audio' | 'video';
    status: 'waiting' | 'active' | 'ended';
    participants: {
        userId: string;
        joinedAt: Date;
        leftAt?: Date;
        role: 'host' | 'participant';
        isMuted: boolean;
        isVideoOff: boolean;
    }[];
    maxParticipants: number;
    isPrivate: boolean;
    inviteCode?: string;
    startedAt?: Date;
    endedAt?: Date;
    duration?: number;
    createdAt: Date;
    updatedAt: Date;
}

const groupCallSchema = new Schema<IGroupCall>(
    {
        roomId: {
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
        title: {
            type: String,
            maxlength: 100,
            default: '',
        },
        callType: {
            type: String,
            enum: ['audio', 'video'],
            default: 'video',
        },
        status: {
            type: String,
            enum: ['waiting', 'active', 'ended'],
            default: 'waiting',
        },
        participants: [{
            userId: { type: String, required: true },
            joinedAt: { type: Date, default: Date.now },
            leftAt: Date,
            role: {
                type: String,
                enum: ['host', 'participant'],
                default: 'participant'
            },
            isMuted: { type: Boolean, default: false },
            isVideoOff: { type: Boolean, default: false },
        }],
        maxParticipants: {
            type: Number,
            default: 8,
            min: 2,
            max: 20,
        },
        isPrivate: {
            type: Boolean,
            default: true,
        },
        inviteCode: {
            type: String,
            sparse: true,
            index: true,
        },
        startedAt: Date,
        endedAt: Date,
        duration: {
            type: Number,
            default: 0,
            min: 0,
        },
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

// Indexes
groupCallSchema.index({ status: 1, createdAt: -1 });
groupCallSchema.index({ 'participants.userId': 1 });

export const GroupCall = mongoose.model<IGroupCall>('GroupCall', groupCallSchema);

// Generate unique room ID
export const generateRoomId = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'gc-';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// Generate invite code
export const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
