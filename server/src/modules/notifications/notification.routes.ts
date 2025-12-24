import { Router } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { Notification } from './Notification.model.js';
import { Profile } from '../users/Profile.model.js';

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

        // Populate sender info for each notification from Profile
        const notificationsWithSender = await Promise.all(
            notifications.map(async (notif) => {
                const notifObj = notif.toObject() as any;
                if (notifObj.senderId) {
                    try {
                        const sender = await Profile.findOne({ supabaseId: notifObj.senderId })
                            .select('name handle avatar')
                            .lean();
                        if (sender) {
                            notifObj.sender = {
                                _id: notifObj.senderId,
                                name: sender.name,
                                handle: sender.handle,
                                avatar: sender.avatar
                            };
                        }
                    } catch (e) {
                        // Sender lookup failed, continue without sender data
                    }
                }
                return notifObj;
            })
        );

        const hasMore = notificationsWithSender.length > parseInt(limit as string, 10);
        const results = hasMore ? notificationsWithSender.slice(0, -1) : notificationsWithSender;

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
