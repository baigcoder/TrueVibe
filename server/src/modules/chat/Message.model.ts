import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
    _id: mongoose.Types.ObjectId;
    conversationId?: mongoose.Types.ObjectId;
    channelId?: mongoose.Types.ObjectId;
    senderId: string;
    content: string;
    media?: Array<{
        type: 'image' | 'video' | 'file' | 'voice';
        url: string;
        name?: string;
        duration?: number;
    }>;
    reactions: Array<{
        emoji: string;
        users: string[];
    }>;
    replyTo?: mongoose.Types.ObjectId;
    // Message delivery status tracking (WhatsApp-style ticks)
    status: 'sending' | 'sent' | 'delivered' | 'read';
    deliveredTo: Array<{
        userId: string;
        deliveredAt: Date;
    }>;
    readBy: Array<{
        userId: string;
        readAt: Date;
    }>;
    isPinned: boolean;
    isEdited: boolean;
    editedAt?: Date;
    isDeleted: boolean;
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            index: true,
        },
        channelId: {
            type: Schema.Types.ObjectId,
            ref: 'Channel',
            index: true,
        },
        senderId: {
            type: String,
            required: true,
        },
        content: {
            type: String,
            required: [true, 'Message content is required'],
            maxlength: [5000, 'Message cannot exceed 5000 characters'],
        },
        media: [{
            type: {
                type: String,
                enum: ['image', 'video', 'file', 'voice'],
            },
            url: { type: String, required: true },
            name: { type: String },
            duration: { type: Number },
        }],
        reactions: [{
            emoji: { type: String, required: true },
            users: [{ type: String }],
        }],
        replyTo: {
            type: Schema.Types.ObjectId,
            ref: 'Message',
        },
        // Message delivery status (WhatsApp-style ticks)
        status: {
            type: String,
            enum: ['sending', 'sent', 'delivered', 'read'],
            default: 'sent',
        },
        deliveredTo: [{
            userId: { type: String },
            deliveredAt: { type: Date, default: Date.now },
        }],
        readBy: [{
            userId: { type: String },
            readAt: { type: Date, default: Date.now },
        }],
        isPinned: {
            type: Boolean,
            default: false,
        },
        isEdited: {
            type: Boolean,
            default: false,
        },
        editedAt: {
            type: Date,
        },
        isDeleted: {
            type: Boolean,
            default: false,
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

// Indexes for efficient message retrieval
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ channelId: 1, createdAt: -1 });
messageSchema.index({ isPinned: 1, channelId: 1 });

export const Message = mongoose.model<IMessage>('Message', messageSchema);
