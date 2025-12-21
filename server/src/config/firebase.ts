import admin from 'firebase-admin';
import { logger } from '../shared/utils/logger.js';

// Initialize Firebase Admin
// Note: You need to set FIREBASE_SERVICE_ACCOUNT env variable with the JSON service account key
// Or use GOOGLE_APPLICATION_CREDENTIALS environment variable

let firebaseApp: admin.app.App | null = null;

export function initializeFirebase(): admin.app.App | null {
    if (firebaseApp) {
        return firebaseApp;
    }

    try {
        const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;

        if (!serviceAccountJson) {
            logger.warn('FIREBASE_SERVICE_ACCOUNT not set - push notifications disabled');
            return null;
        }

        const serviceAccount = JSON.parse(serviceAccountJson);

        firebaseApp = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });

        logger.info('Firebase Admin SDK initialized successfully');
        return firebaseApp;
    } catch (error) {
        logger.error('Failed to initialize Firebase Admin SDK:', error);
        return null;
    }
}

export async function sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: Record<string, string>,
    imageUrl?: string
): Promise<boolean> {
    if (!firebaseApp) {
        logger.debug('Firebase not initialized - skipping push notification');
        return false;
    }

    try {
        const message: admin.messaging.Message = {
            notification: {
                title,
                body,
                ...(imageUrl && { imageUrl }),
            },
            data: data || {},
            token,
            webpush: {
                notification: {
                    icon: '/logo192.png',
                    badge: '/badge.png',
                    vibrate: [200, 100, 200],
                },
                fcmOptions: {
                    link: data?.link || '/',
                },
            },
        };

        const response = await admin.messaging().send(message);
        logger.info(`Push notification sent: ${response}`);
        return true;
    } catch (error: any) {
        // Handle invalid tokens
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            logger.warn(`Invalid FCM token: ${token.substring(0, 20)}...`);
            // Token is invalid - should be removed from database
            return false;
        }

        logger.error('Failed to send push notification:', error);
        return false;
    }
}

export async function sendPushToMultiple(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>
): Promise<{ success: number; failure: number }> {
    if (!firebaseApp || tokens.length === 0) {
        return { success: 0, failure: 0 };
    }

    try {
        const message: admin.messaging.MulticastMessage = {
            notification: { title, body },
            data: data || {},
            tokens,
            webpush: {
                notification: {
                    icon: '/logo192.png',
                },
            },
        };

        const response = await admin.messaging().sendEachForMulticast(message);

        logger.info(`Push multicast: ${response.successCount} success, ${response.failureCount} failure`);

        return {
            success: response.successCount,
            failure: response.failureCount,
        };
    } catch (error) {
        logger.error('Failed to send multicast push:', error);
        return { success: 0, failure: tokens.length };
    }
}

export function getFirebaseApp(): admin.app.App | null {
    return firebaseApp;
}
