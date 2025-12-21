import mongoose, { Schema, Document } from 'mongoose';

export interface IChannel extends Document {
    _id: mongoose.Types.ObjectId;
    serverId: mongoose.Types.ObjectId;
    categoryId?: mongoose.Types.ObjectId;
    name: string;
    type: 'text' | 'voice' | 'announcement';
    topic?: string;
    position: number;
    isPrivate: boolean;
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

const channelSchema = new Schema<IChannel>(
    {
        serverId: {
            type: Schema.Types.ObjectId,
            ref: 'Server',
            required: true,
            index: true,
        },
        categoryId: {
            type: Schema.Types.ObjectId,
            ref: 'ChannelCategory',
            default: null,
        },
        name: {
            type: String,
            required: [true, 'Channel name is required'],
            maxlength: [100, 'Channel name cannot exceed 100 characters'],
            trim: true,
            lowercase: true,
        },
        type: {
            type: String,
            enum: ['text', 'voice', 'announcement'],
            default: 'text',
        },
        topic: {
            type: String,
            maxlength: [500, 'Topic cannot exceed 500 characters'],
        },
        position: {
            type: Number,
            default: 0,
        },
        isPrivate: {
            type: Boolean,
            default: false,
        },
        lastMessage: {
            content: { type: String },
            senderId: { type: String },
            timestamp: { type: Date },
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
channelSchema.index({ serverId: 1, position: 1 });

export const Channel = mongoose.model<IChannel>('Channel', channelSchema);
