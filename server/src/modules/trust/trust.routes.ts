import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { apiLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import * as trustScoreService from './TrustScore.service.js';

const router = Router();

// Apply rate limiting to all trust routes
router.use(apiLimiter);

/**
 * Get current user's trust score with breakdown
 */
router.get('/score', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const breakdown = await trustScoreService.calculateTrustScore(userId);

        res.json({
            success: true,
            data: breakdown,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Get trust score for a specific user (public, limited info)
 */
router.get('/score/:userId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { userId } = req.params;

        const breakdown = await trustScoreService.calculateTrustScore(userId);

        // Return limited info for other users
        res.json({
            success: true,
            data: {
                totalScore: breakdown.totalScore,
                level: breakdown.level,
                lastUpdated: breakdown.lastUpdated,
                // Don't expose detailed factors to others
            },
        });
    } catch (error: any) {
        if (error.message === 'Profile not found') {
            res.status(404).json({ success: false, error: { message: 'User not found' } });
            return;
        }
        next(error);
    }
});

/**
 * Get trust score history for current user
 */
router.get('/history', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const days = parseInt(req.query.days as string) || 30;
        const history = await trustScoreService.getTrustScoreHistory(userId, Math.min(days, 90));

        res.json({
            success: true,
            data: { history },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * Force recalculation of trust score (rate limited more strictly)
 */
router.post('/recalculate', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const breakdown = await trustScoreService.updateTrustScore(userId, 'manual');

        res.json({
            success: true,
            data: breakdown,
            message: 'Trust score recalculated',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
