import mongoose, { Schema, Document } from 'mongoose';

export interface IPushToken extends Document {
    userId: string;
    token: string;
    platform: 'web' | 'ios' | 'android';
    deviceInfo?: string;
    createdAt: Date;
    updatedAt: Date;
}

const PushTokenSchema = new Schema<IPushToken>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        token: {
            type: String,
            required: true,
            unique: true,
        },
        platform: {
            type: String,
            enum: ['web', 'ios', 'android'],
            default: 'web',
        },
        deviceInfo: {
            type: String,
        },
    },
    { timestamps: true }
);

// Compound index for efficient lookups
PushTokenSchema.index({ userId: 1, token: 1 });

export const PushToken = mongoose.model<IPushToken>('PushToken', PushTokenSchema);
