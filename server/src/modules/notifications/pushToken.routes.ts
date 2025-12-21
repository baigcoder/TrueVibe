import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { PushToken } from './PushToken.model.js';
import { logger } from '../../shared/utils/logger.js';

const router = Router();

// Register a push token
router.post('/register', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth?.userId;
        const { token, platform = 'web', deviceInfo } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: { message: 'Token is required' },
            });
        }

        // Upsert the token
        await PushToken.findOneAndUpdate(
            { token },
            { userId, token, platform, deviceInfo },
            { upsert: true, new: true }
        );

        logger.info(`Push token registered for user ${userId}`);

        res.json({
            success: true,
            message: 'Push token registered successfully',
        });
    } catch (error) {
        next(error);
    }
});

// Unregister a push token
router.delete('/unregister', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth?.userId;
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                error: { message: 'Token is required' },
            });
        }

        await PushToken.findOneAndDelete({ token, userId });

        logger.info(`Push token unregistered for user ${userId}`);

        res.json({
            success: true,
            message: 'Push token unregistered successfully',
        });
    } catch (error) {
        next(error);
    }
});

// Get user's registered tokens (mainly for debugging)
router.get('/my-tokens', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth?.userId;

        const tokens = await PushToken.find({ userId }).select('-__v');

        res.json({
            success: true,
            data: { tokens },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
