import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { UserKeys, EncryptedSession } from './Encryption.model.js';

const router = Router();

// Register/update user's public keys
router.post('/keys/register', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { identityPublicKey, signedPreKey, oneTimePreKeys } = req.body;

        if (!identityPublicKey || !signedPreKey || !oneTimePreKeys) {
            return res.status(400).json({
                success: false,
                error: { message: 'identityPublicKey, signedPreKey, and oneTimePreKeys are required' },
            });
        }

        const keys = await UserKeys.findOneAndUpdate(
            { userId },
            {
                userId,
                identityPublicKey,
                signedPreKey: {
                    ...signedPreKey,
                    createdAt: new Date(),
                },
                oneTimePreKeys: oneTimePreKeys.map((k: any, i: number) => ({
                    keyId: k.keyId || i,
                    publicKey: k.publicKey,
                    used: false,
                })),
            },
            { upsert: true, new: true }
        );

        res.json({
            success: true,
            message: 'Keys registered successfully',
            data: { keyCount: keys.oneTimePreKeys.length },
        });
    } catch (error) {
        next(error);
    }
});

// Get user's pre-key bundle for establishing session
router.get('/keys/:userId/bundle', requireAuth, async (req, res, next) => {
    try {
        const { userId } = req.params;

        const keys = await UserKeys.findOne({ userId });

        if (!keys) {
            return res.status(404).json({
                success: false,
                error: { message: 'User has not registered encryption keys' },
            });
        }

        // Get an unused one-time pre-key
        const unusedPreKey = keys.oneTimePreKeys.find(k => !k.used);

        // Mark it as used
        if (unusedPreKey) {
            unusedPreKey.used = true;
            unusedPreKey.usedAt = new Date();
            await keys.save();
        }

        res.json({
            success: true,
            data: {
                identityPublicKey: keys.identityPublicKey,
                signedPreKey: {
                    keyId: keys.signedPreKey.keyId,
                    publicKey: keys.signedPreKey.publicKey,
                    signature: keys.signedPreKey.signature,
                },
                oneTimePreKey: unusedPreKey ? {
                    keyId: unusedPreKey.keyId,
                    publicKey: unusedPreKey.publicKey,
                } : null,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Upload more one-time pre-keys (when running low)
router.post('/keys/replenish', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { oneTimePreKeys } = req.body;

        const keys = await UserKeys.findOne({ userId });

        if (!keys) {
            return res.status(404).json({
                success: false,
                error: { message: 'Please register keys first' },
            });
        }

        // Get highest key ID
        const maxKeyId = Math.max(...keys.oneTimePreKeys.map(k => k.keyId), 0);

        // Add new keys
        const newKeys = oneTimePreKeys.map((k: any, i: number) => ({
            keyId: k.keyId || maxKeyId + i + 1,
            publicKey: k.publicKey,
            used: false,
        }));

        keys.oneTimePreKeys.push(...newKeys);
        await keys.save();

        res.json({
            success: true,
            message: 'Keys replenished',
            data: { totalKeys: keys.oneTimePreKeys.filter(k => !k.used).length },
        });
    } catch (error) {
        next(error);
    }
});

// Get remaining one-time pre-keys count
router.get('/keys/count', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        const keys = await UserKeys.findOne({ userId });

        res.json({
            success: true,
            data: {
                remainingKeys: keys ? keys.oneTimePreKeys.filter(k => !k.used).length : 0,
                hasKeys: !!keys,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Create/get encrypted session for a conversation
router.post('/session/establish', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { conversationId, recipientId, ephemeralPublicKey, usedPreKeyId } = req.body;

        // Create sorted participant IDs array
        const participantIds = [userId, recipientId].sort();

        let session = await EncryptedSession.findOne({
            conversationId,
            isActive: true,
        });

        if (!session) {
            session = await EncryptedSession.create({
                conversationId,
                participantIds,
                sessionData: {},
            });
        }

        // Update session data for this user
        session.sessionData[userId] = {
            ephemeralPublicKey,
            usedPreKeyId,
            chainKey: '', // Will be computed client-side
            messageNumber: 0,
        };

        await session.save();

        res.json({
            success: true,
            data: {
                sessionId: session._id,
                sessionData: session.sessionData,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get session for a conversation
router.get('/session/:conversationId', requireAuth, async (req, res, next) => {
    try {
        const { conversationId } = req.params;

        const session = await EncryptedSession.findOne({
            conversationId,
            isActive: true,
        });

        res.json({
            success: true,
            data: { session },
        });
    } catch (error) {
        next(error);
    }
});

// Check if user has encryption enabled
router.get('/status/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        const keys = await UserKeys.findOne({ userId });

        res.json({
            success: true,
            data: {
                encryptionEnabled: !!keys,
                hasValidKeys: keys ? keys.oneTimePreKeys.some(k => !k.used) : false,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
