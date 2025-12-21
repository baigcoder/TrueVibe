import mongoose, { Schema, Document } from 'mongoose';

export interface IServerRole {
    _id: mongoose.Types.ObjectId;
    name: string;
    color: string;
    position: number;
    permissions: string[];
}

export interface IWelcomeScreen {
    enabled: boolean;
    title: string;
    description: string;
    suggestedChannels: mongoose.Types.ObjectId[];
}

export interface IServer extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    description?: string;
    icon?: string;
    banner?: string;
    ownerId: string;
    members: Array<{
        userId: string;
        role: 'owner' | 'admin' | 'moderator' | 'member';
        roleIds: mongoose.Types.ObjectId[];
        joinedAt: Date;
    }>;
    roles: IServerRole[];
    channels: mongoose.Types.ObjectId[];
    inviteCode: string;
    isPublic: boolean;
    memberCount: number;
    welcomeScreen?: IWelcomeScreen;
    createdAt: Date;
    updatedAt: Date;
}

const serverSchema = new Schema<IServer>(
    {
        name: {
            type: String,
            required: [true, 'Server name is required'],
            maxlength: [100, 'Server name cannot exceed 100 characters'],
            trim: true,
        },
        description: {
            type: String,
            maxlength: [500, 'Description cannot exceed 500 characters'],
        },
        icon: {
            type: String,
        },
        banner: {
            type: String,
        },
        ownerId: {
            type: String,
            required: true,
            index: true,
        },
        members: [{
            userId: {
                type: String,
                required: true,
            },
            role: {
                type: String,
                enum: ['owner', 'admin', 'moderator', 'member'],
                default: 'member',
            },
            roleIds: [{
                type: Schema.Types.ObjectId,
            }],
            joinedAt: {
                type: Date,
                default: Date.now,
            },
        }],
        roles: [{
            name: { type: String, required: true },
            color: { type: String, default: '#808080' },
            position: { type: Number, default: 0 },
            permissions: [{ type: String }],
        }],
        channels: [{
            type: Schema.Types.ObjectId,
            ref: 'Channel',
        }],
        inviteCode: {
            type: String,
            unique: true,
            sparse: true,
        },
        isPublic: {
            type: Boolean,
            default: true,
        },
        welcomeScreen: {
            enabled: { type: Boolean, default: false },
            title: { type: String, default: '' },
            description: { type: String, default: '' },
            suggestedChannels: [{ type: Schema.Types.ObjectId, ref: 'Channel' }],
        },
        memberCount: {
            type: Number,
            default: 1,
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
serverSchema.index({ 'members.userId': 1 });
serverSchema.index({ isPublic: 1, memberCount: -1 });

// Generate invite code before saving
serverSchema.pre('save', function (next) {
    if (!this.inviteCode) {
        this.inviteCode = generateInviteCode();
    }
    next();
});

function generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

export const Server = mongoose.model<IServer>('Server', serverSchema);
