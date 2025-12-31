import mongoose, { Schema, Document } from 'mongoose';

export interface ISession extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    deviceInfo: {
        browser: string;
        os: string;
        device: string;
    };
    ipAddress: string;
    userAgent: string;
    location?: {
        country?: string;
        city?: string;
    };
    isActive: boolean;
    lastActive: Date;
    createdAt: Date;
    expiresAt: Date;
}

const sessionSchema = new Schema<ISession>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        deviceInfo: {
            browser: { type: String, default: 'Unknown' },
            os: { type: String, default: 'Unknown' },
            device: { type: String, default: 'Unknown' },
        },
        ipAddress: {
            type: String,
            required: true,
        },
        userAgent: {
            type: String,
            required: true,
        },
        location: {
            country: { type: String },
            city: { type: String },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastActive: {
            type: Date,
            default: Date.now,
        },
        expiresAt: {
            type: Date,
            required: true,
            index: true,
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

// Index for cleanup of expired sessions
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for finding user's active sessions
sessionSchema.index({ userId: 1, isActive: 1, lastActive: -1 });

// Static method to create or update session
sessionSchema.statics.upsertSession = async function (
    userId: string,
    sessionData: {
        ipAddress: string;
        userAgent: string;
        deviceInfo?: { browser: string; os: string; device: string };
        location?: { country?: string; city?: string };
    }
): Promise<ISession> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // 30 days expiry

    const session = await this.findOneAndUpdate(
        {
            userId,
            ipAddress: sessionData.ipAddress,
            userAgent: sessionData.userAgent,
            isActive: true,
        },
        {
            $set: {
                lastActive: new Date(),
                expiresAt,
                ...(sessionData.deviceInfo && { deviceInfo: sessionData.deviceInfo }),
                ...(sessionData.location && { location: sessionData.location }),
            },
            $setOnInsert: {
                userId,
                ipAddress: sessionData.ipAddress,
                userAgent: sessionData.userAgent,
            },
        },
        { upsert: true, new: true }
    );

    return session;
};

// Static method to get active sessions for a user
sessionSchema.statics.getActiveSessions = async function (
    userId: string
): Promise<ISession[]> {
    return this.find({
        userId,
        isActive: true,
        expiresAt: { $gt: new Date() },
    }).sort({ lastActive: -1 });
};

// Static method to revoke a session
sessionSchema.statics.revokeSession = async function (
    sessionId: string,
    userId: string
): Promise<boolean> {
    const result = await this.updateOne(
        { _id: sessionId, userId },
        { $set: { isActive: false } }
    );
    return result.modifiedCount > 0;
};

// Static method to revoke all sessions except current
sessionSchema.statics.revokeAllSessions = async function (
    userId: string,
    exceptSessionId?: string
): Promise<number> {
    const query: Record<string, unknown> = { userId, isActive: true };
    if (exceptSessionId) {
        query._id = { $ne: exceptSessionId };
    }
    const result = await this.updateMany(query, { $set: { isActive: false } });
    return result.modifiedCount;
};

export interface ISessionModel extends mongoose.Model<ISession> {
    upsertSession(
        userId: string,
        sessionData: {
            ipAddress: string;
            userAgent: string;
            deviceInfo?: { browser: string; os: string; device: string };
            location?: { country?: string; city?: string };
        }
    ): Promise<ISession>;
    getActiveSessions(userId: string): Promise<ISession[]>;
    revokeSession(sessionId: string, userId: string): Promise<boolean>;
    revokeAllSessions(userId: string, exceptSessionId?: string): Promise<number>;
}

export const Session = mongoose.model<ISession, ISessionModel>('Session', sessionSchema);
