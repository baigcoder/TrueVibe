/**
 * API Key Model
 * Per-user API keys for AI service authentication
 */

import mongoose, { Schema, Document, Model } from 'mongoose';
import crypto from 'crypto';

export interface IAPIKey extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    name: string;                    // Friendly name for the key
    keyHash: string;                 // SHA-256 hash of the key
    keyPrefix: string;               // First 8 chars for identification
    permissions: string[];           // Allowed operations
    rateLimit: {
        requestsPerHour: number;
        requestsPerDay: number;
    };
    usage: {
        totalRequests: number;
        lastUsed: Date | null;
    };
    status: 'active' | 'revoked' | 'expired';
    expiresAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}

interface IAPIKeyModel extends Model<IAPIKey> {
    generateKey(): { key: string; hash: string; prefix: string };
    findByKey(key: string): Promise<IAPIKey | null>;
}

const apiKeySchema = new Schema<IAPIKey>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            maxlength: 100,
        },
        keyHash: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        keyPrefix: {
            type: String,
            required: true,
        },
        permissions: [{
            type: String,
            enum: ['ai:analyze', 'ai:report', 'ai:caption', 'ai:hashtags', 'ai:ideas', 'ai:*'],
            default: ['ai:analyze', 'ai:report'],
        }],
        rateLimit: {
            requestsPerHour: { type: Number, default: 100 },
            requestsPerDay: { type: Number, default: 1000 },
        },
        usage: {
            totalRequests: { type: Number, default: 0 },
            lastUsed: { type: Date, default: null },
        },
        status: {
            type: String,
            enum: ['active', 'revoked', 'expired'],
            default: 'active',
        },
        expiresAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Generate a secure API key
apiKeySchema.statics.generateKey = function () {
    // Generate 32 random bytes -> 64 char hex string
    const key = `tvk_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12); // 'tvk_' + 8 chars

    return { key, hash, prefix };
};

// Find API key by the raw key value
apiKeySchema.statics.findByKey = async function (key: string) {
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    return this.findOne({
        keyHash: hash,
        status: 'active',
        $or: [
            { expiresAt: null },
            { expiresAt: { $gt: new Date() } }
        ]
    });
};

// Update usage tracking
apiKeySchema.methods.recordUsage = async function () {
    this.usage.totalRequests += 1;
    this.usage.lastUsed = new Date();
    await this.save();
};

// Check if rate limited (simple check)
apiKeySchema.methods.isRateLimited = async function () {
    // This is a basic implementation
    // For production, use Redis for proper rate limiting
    return false;
};

export const APIKey = mongoose.model<IAPIKey, IAPIKeyModel>('APIKey', apiKeySchema);
