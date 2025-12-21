import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { CallLog } from './CallLog.model.js';

const router = Router();

// Get call history
router.get('/history', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            $or: [{ callerId: userId }, { receiverId: userId }],
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const calls = await CallLog.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = calls.length > parseInt(limit as string, 10);
        const results = hasMore ? calls.slice(0, -1) : calls;

        res.json({
            success: true,
            data: {
                calls: results,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Log a completed call
router.post('/log', authenticate, async (req, res, next) => {
    try {
        const { receiverId, callType, status, startedAt, endedAt, duration } = req.body;
        const callerId = req.user!.userId;

        const callLog = await CallLog.create({
            callerId,
            receiverId,
            callType,
            status,
            startedAt,
            endedAt,
            duration,
        });

        res.status(201).json({
            success: true,
            data: { call: callLog },
        });
    } catch (error) {
        next(error);
    }
});

// WebRTC signaling room info
router.get('/rooms/:roomId', authenticate, (req, res) => {
    const { roomId } = req.params;

    res.json({
        success: true,
        data: {
            roomId,
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
            ],
        },
    });
});

export default router;
