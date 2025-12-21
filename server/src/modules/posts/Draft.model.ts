import mongoose, { Document, Schema } from 'mongoose';

export interface IDraft extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    content: string;
    media: mongoose.Types.ObjectId[];
    poll?: {
        options: Array<{ text: string }>;
        expiresIn: number; // hours
        allowMultiple: boolean;
    };
    hashtags: string[];
    visibility: 'public' | 'private' | 'followers';
    scheduledFor?: Date;
    autoSaved: boolean;
    lastSavedAt: Date;
    createdAt: Date;
    updatedAt: Date;
}

const draftSchema = new Schema<IDraft>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        content: {
            type: String,
            default: '',
            maxlength: 5000,
        },
        media: [{
            type: Schema.Types.ObjectId,
            ref: 'Media',
        }],
        poll: {
            options: [{
                text: { type: String, maxlength: 100 },
            }],
            expiresIn: { type: Number, default: 24 },
            allowMultiple: { type: Boolean, default: false },
        },
        hashtags: [{
            type: String,
            lowercase: true,
            trim: true,
        }],
        visibility: {
            type: String,
            enum: ['public', 'private', 'followers'],
            default: 'public',
        },
        scheduledFor: {
            type: Date,
        },
        autoSaved: {
            type: Boolean,
            default: false,
        },
        lastSavedAt: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Index for efficient user draft queries
draftSchema.index({ userId: 1, lastSavedAt: -1 });

// TTL index: auto-delete drafts after 30 days of inactivity
draftSchema.index({ lastSavedAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const Draft = mongoose.model<IDraft>('Draft', draftSchema);
