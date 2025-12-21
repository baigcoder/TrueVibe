import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
    userId: string; // The user who receives the notification
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
    senderId?: string; // The user who triggered the notification
    title: string;
    body: string;
    link?: string; // Link to the relevant content (e.g., /app/posts/123)
    isRead: boolean;
    createdAt: Date;
    updatedAt: Date;
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
            enum: ['like', 'comment', 'follow', 'mention', 'message', 'system'],
            required: true,
        },
        senderId: {
            type: String,
        },
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        link: {
            type: String,
        },
        isRead: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Index for fetching unread notifications
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>('Notification', notificationSchema);
