import mongoose, { Schema, Document } from 'mongoose';

export type NotificationType = 'like' | 'comment' | 'follow' | 'mention' | 'ai_result' | 'message' | 'repost';

export interface INotification extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    type: NotificationType;
    actorId?: string;
    resourceType?: 'post' | 'comment' | 'user' | 'message' | 'media';
    resourceId?: string;
    message: string;
    metadata?: Record<string, unknown>;
    read: boolean;
    createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['like', 'comment', 'follow', 'mention', 'ai_result', 'message', 'repost'],
            required: true,
        },
        actorId: {
            type: String,
        },
        resourceType: {
            type: String,
            enum: ['post', 'comment', 'user', 'message', 'media'],
        },
        resourceId: {
            type: String,
        },
        message: {
            type: String,
            required: true,
            maxlength: 500,
        },
        metadata: {
            type: Schema.Types.Mixed,
        },
        read: {
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

// Index for efficient notification queries
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
