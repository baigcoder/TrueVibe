import mongoose, { Schema, Document } from 'mongoose';

// User's public encryption keys for E2EE
export interface IUserKeys extends Document {
    _id: mongoose.Types.ObjectId;
    userId: string;
    identityPublicKey: string;  // Long-term identity key (Base64)
    signedPreKey: {
        keyId: number;
        publicKey: string;  // Base64
        signature: string;  // Signature of public key
        createdAt: Date;
    };
    oneTimePreKeys: Array<{
        keyId: number;
        publicKey: string;  // Base64
        used: boolean;
        usedAt?: Date;
    }>;
    createdAt: Date;
    updatedAt: Date;
}

const userKeysSchema = new Schema<IUserKeys>(
    {
        userId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        identityPublicKey: {
            type: String,
            required: true,
        },
        signedPreKey: {
            keyId: { type: Number, required: true },
            publicKey: { type: String, required: true },
            signature: { type: String, required: true },
            createdAt: { type: Date, default: Date.now },
        },
        oneTimePreKeys: [{
            keyId: { type: Number, required: true },
            publicKey: { type: String, required: true },
            used: { type: Boolean, default: false },
            usedAt: Date,
        }],
    },
    { timestamps: true }
);

export const UserKeys = mongoose.model<IUserKeys>('UserKeys', userKeysSchema);

// Encrypted session between two users
export interface IEncryptedSession extends Document {
    _id: mongoose.Types.ObjectId;
    conversationId: mongoose.Types.ObjectId;
    participantIds: string[];  // Sorted array of 2 user IDs
    sessionData: {
        [userId: string]: {
            ephemeralPublicKey: string;  // Sender's ephemeral key
            usedPreKeyId?: number;
            chainKey: string;  // Encrypted chain key
            messageNumber: number;
        };
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const encryptedSessionSchema = new Schema<IEncryptedSession>(
    {
        conversationId: {
            type: Schema.Types.ObjectId,
            ref: 'Conversation',
            required: true,
            index: true,
        },
        participantIds: [{
            type: String,
        }],
        sessionData: {
            type: Schema.Types.Mixed,
            default: {},
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    { timestamps: true }
);

encryptedSessionSchema.index({ participantIds: 1, isActive: 1 });

export const EncryptedSession = mongoose.model<IEncryptedSession>('EncryptedSession', encryptedSessionSchema);
