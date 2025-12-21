// Firebase Messaging Service Worker
// This file must be at the root of the public directory

importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase (config will be passed from client)
firebase.initializeApp({
    apiKey: self.__FIREBASE_CONFIG__?.apiKey || '',
    authDomain: self.__FIREBASE_CONFIG__?.authDomain || '',
    projectId: self.__FIREBASE_CONFIG__?.projectId || '',
    storageBucket: self.__FIREBASE_CONFIG__?.storageBucket || '',
    messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '',
    appId: self.__FIREBASE_CONFIG__?.appId || '',
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    // Handle incoming call notifications specially
    if (payload.data?.type === 'incoming_call') {
        const callType = payload.data.callType || 'audio';
        const callerName = payload.data.callerName || 'Unknown';
        const callerAvatar = payload.data.callerAvatar;
        const icon = callType === 'video' ? '📹' : '📞';

        const notificationOptions = {
            body: `${callerName} is calling you`,
            icon: callerAvatar || '/logo.png',
            badge: '/badge.png',
            tag: 'incoming-call',
            requireInteraction: true, // Keep notification until user interacts
            renotify: true,
            data: {
                url: '/app/chat',
                type: 'incoming_call',
                callId: payload.data.callId,
                callerId: payload.data.callerId,
                callType: callType,
            },
            actions: [
                { action: 'accept', title: '✅ Accept' },
                { action: 'decline', title: '❌ Decline' }
            ],
            vibrate: [200, 100, 200, 100, 200, 100, 200], // Vibration pattern for calls
        };

        self.registration.showNotification(`${icon} Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`, notificationOptions);
        return;
    }

    // Regular notification handling
    const notificationTitle = payload.notification?.title || 'TrueVibe';
    const notificationOptions = {
        body: payload.notification?.body || 'You have a new notification',
        icon: '/logo.png',
        badge: '/badge.png',
        tag: payload.data?.notificationId || 'default',
        data: {
            url: payload.data?.link || '/app/notifications',
            notificationId: payload.data?.notificationId,
        },
        actions: [
            { action: 'open', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' },
        ],
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);

    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    const urlToOpen = event.notification.data?.url || '/app/notifications';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if there's already a window open
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.focus();
                    client.postMessage({ type: 'NOTIFICATION_CLICK', url: urlToOpen });
                    return;
                }
            }
            // Open new window if none exists
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
