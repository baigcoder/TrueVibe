import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { Notification } from './Notification.model.js';

const router = Router();

// Get notifications
router.get('/', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            userId,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = notifications.length > parseInt(limit as string, 10);
        const results = hasMore ? notifications.slice(0, -1) : notifications;

        res.json({
            success: true,
            data: {
                notifications: results,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Mark as read
router.patch('/:id/read', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const notification = await Notification.findOneAndUpdate(
            { _id: id, userId },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({
                success: false,
                error: { message: 'Notification not found' },
            });
        }

        res.json({
            success: true,
            data: { notification },
        });
    } catch (error) {
        next(error);
    }
});

// Mark all as read
router.post('/read-all', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        await Notification.updateMany(
            { userId, isRead: false },
            { isRead: true }
        );

        res.json({
            success: true,
            message: 'All notifications marked as read',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
