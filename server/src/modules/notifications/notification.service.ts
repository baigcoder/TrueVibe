import { Notification } from './Notification.model.js';
import { PushToken } from './PushToken.model.js';
import { emitToUser } from '../../socket/index.js';
import { sendPushNotification } from '../../config/firebase.js';
import { logger } from '../../shared/utils/logger.js';

export interface CreateNotificationParams {
    userId: string;
    type: 'like' | 'comment' | 'follow' | 'mention' | 'message' | 'system';
    title: string;
    body: string;
    senderId?: string;
    link?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
    try {
        console.log(`[NOTIFICATION] Creating notification for user ${params.userId}: ${params.title}`);

        const notification = await Notification.create({
            ...params,
            isRead: false,
        });

        console.log(`[NOTIFICATION] Notification created with ID: ${notification._id}`);
        console.log(`[NOTIFICATION] Emitting socket event to user:${params.userId}`);

        // Emit real-time update via Socket.IO
        emitToUser(params.userId, 'notification:new', {
            notification,
        });

        // Send push notification (non-blocking)
        sendPushToUser(params.userId, params.title, params.body, {
            type: params.type,
            link: params.link || '/',
            notificationId: notification._id.toString(),
        }).catch(err => {
            logger.debug('Push notification skipped or failed:', err.message);
        });

        return notification;
    } catch (error) {
        logger.error('Failed to create notification:', error);
        console.error('[NOTIFICATION] Error creating notification:', error);
        // We don't want to throw here and break the main flow (e.g., liking a post)
        // just because the notification failed.
        return null;
    }
};


/**
 * Send push notification to all devices registered for a user
 */
async function sendPushToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<void> {
    try {
        // Get all tokens for this user
        const tokens = await PushToken.find({ userId }).select('token');

        if (tokens.length === 0) {
            logger.debug(`No push tokens found for user ${userId}`);
            return;
        }

        // Send to each token
        const results = await Promise.allSettled(
            tokens.map(t => sendPushNotification(t.token, title, body, data))
        );

        // Count successes
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        logger.debug(`Push sent to ${successCount}/${tokens.length} devices for user ${userId}`);
    } catch (error) {
        logger.error('Failed to send push to user:', error);
    }
}


/**
 * Send push notification specifically for incoming calls.
 * This uses high-priority delivery and includes call-specific data.
 */
export const sendCallPushNotification = async (
    targetUserId: string,
    callerInfo: { id: string; name: string; avatar?: string },
    callType: 'audio' | 'video',
    callId: string
): Promise<void> => {
    try {
        const tokens = await PushToken.find({ userId: targetUserId }).select('token');

        if (tokens.length === 0) {
            logger.debug(`No push tokens for call notification to user ${targetUserId}`);
            return;
        }

        const icon = callType === 'video' ? '📹' : '📞';
        const title = `${icon} Incoming Call`;
        const body = `${callerInfo.name} is calling you`;

        const results = await Promise.allSettled(
            tokens.map(t => sendPushNotification(t.token, title, body, {
                type: 'incoming_call',
                callType,
                callId,
                callerName: callerInfo.name,
                callerAvatar: callerInfo.avatar || '',
                callerId: callerInfo.id,
            }))
        );

        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length;
        logger.debug(`Call push sent to ${successCount}/${tokens.length} devices for user ${targetUserId}`);
    } catch (error) {
        logger.error('Failed to send call push notification:', error);
    }
};

