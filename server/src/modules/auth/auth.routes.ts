import { Router, Request, Response, NextFunction } from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { authLimiter, sessionLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import { syncProfileSchema } from './auth.schema.js';
import { Session } from './Session.model.js';

const router = Router();

// Supabase handles login/register via frontend
// These routes are for profile sync with backend

// Profile sync endpoint - called when user signs in via Supabase
router.post(
    '/sync',
    requireAuth,
    validateBody(syncProfileSchema),
    authController.syncProfile
);

// Get current user profile
router.get('/me', requireAuth, authController.getCurrentUser);

// Session Management Routes

// Get all active sessions for current user
router.get('/sessions', requireAuth, sessionLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const sessions = await Session.getActiveSessions(userId);

        res.json({
            success: true,
            data: { sessions },
        });
    } catch (error) {
        next(error);
    }
});

// Revoke a specific session
router.delete('/sessions/:id', requireAuth, sessionLimiter, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id: sessionId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const revoked = await Session.revokeSession(sessionId, userId);

        if (!revoked) {
            res.status(404).json({ success: false, error: { message: 'Session not found' } });
            return;
        }

        res.json({
            success: true,
            message: 'Session revoked',
        });
    } catch (error) {
        next(error);
    }
});

// Revoke all sessions except current
router.delete('/sessions', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { exceptCurrent } = req.query;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        // Get current session ID from request (if available)
        const currentSessionId = exceptCurrent === 'true' ? req.headers['x-session-id'] as string : undefined;

        const revokedCount = await Session.revokeAllSessions(userId, currentSessionId);

        res.json({
            success: true,
            message: `Revoked ${revokedCount} sessions`,
            data: { revokedCount },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

