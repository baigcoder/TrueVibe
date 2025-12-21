import mongoose, { Schema, Document } from 'mongoose';

export interface IConversation extends Document {
    _id: mongoose.Types.ObjectId;
    type: 'direct' | 'group';
    participants: string[];
    groupName?: string;
    groupAvatar?: string;
    lastMessage?: {
        content: string;
        senderId: string;
        timestamp: Date;
    };
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
}

const conversationSchema = new Schema<IConversation>(
    {
        type: {
            type: String,
            enum: ['direct', 'group'],
            default: 'direct',
        },
        participants: [{
            type: String,
            required: true,
        }],
        groupName: {
            type: String,
            maxlength: [100, 'Group name cannot exceed 100 characters'],
        },
        groupAvatar: {
            type: String,
        },
        lastMessage: {
            content: { type: String },
            senderId: { type: String },
            timestamp: { type: Date },
        },
        createdBy: {
            type: String,
            required: true,
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

// Index for finding user's conversations
conversationSchema.index({ participants: 1 });
conversationSchema.index({ 'lastMessage.timestamp': -1 });

export const Conversation = mongoose.model<IConversation>('Conversation', conversationSchema);
