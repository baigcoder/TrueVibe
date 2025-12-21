import { initializeApp, getApps } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import type { Messaging } from 'firebase/messaging';

// Firebase configuration from environment variables
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

// Initialize Firebase
export function initializeFirebase(): FirebaseApp | null {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
        console.warn('Firebase config not found. Push notifications disabled.');
        return null;
    }

    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }

    return app;
}

// Get Firebase Messaging instance
export function getFirebaseMessaging(): Messaging | null {
    if (!app) {
        initializeFirebase();
    }

    if (!app) return null;

    if (!messaging && typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        try {
            messaging = getMessaging(app);
        } catch (error) {
            console.error('Failed to initialize Firebase Messaging:', error);
            return null;
        }
    }

    return messaging;
}

// Request notification permission and get FCM token
export async function requestNotificationPermission(): Promise<string | null> {
    if (!('Notification' in window)) {
        console.warn('This browser does not support notifications');
        return null;
    }

    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
        console.log('Notification permission denied');
        return null;
    }

    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) return null;

    try {
        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        // Pass config to service worker
        if (registration.active) {
            registration.active.postMessage({
                type: 'FIREBASE_CONFIG',
                config: firebaseConfig,
            });
        }

        // Get FCM token
        const token = await getToken(messagingInstance, {
            vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        console.log('FCM Token:', token);
        return token;
    } catch (error) {
        console.error('Failed to get FCM token:', error);
        return null;
    }
}

// Listen for foreground messages
export function onForegroundMessage(callback: (payload: any) => void): (() => void) | null {
    const messagingInstance = getFirebaseMessaging();
    if (!messagingInstance) return null;

    return onMessage(messagingInstance, callback);
}

export { firebaseConfig };
