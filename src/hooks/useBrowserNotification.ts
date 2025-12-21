import { useCallback, useEffect, useState } from 'react';

interface CallerInfo {
    id: string;
    name: string;
    avatar?: string;
}

/**
 * Hook to manage browser notifications for incoming calls.
 * Uses the Notification API to show system-level notifications.
 */
export function useBrowserNotification() {
    const [permission, setPermission] = useState<NotificationPermission>(
        typeof window !== 'undefined' && 'Notification' in window
            ? Notification.permission
            : 'default'
    );

    /**
     * Request notification permission from the user
     */
    const requestPermission = useCallback(async (): Promise<boolean> => {
        if (!('Notification' in window)) {
            console.warn('[Notification] Browser does not support notifications');
            return false;
        }

        if (Notification.permission === 'granted') {
            setPermission('granted');
            return true;
        }

        if (Notification.permission !== 'denied') {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        }

        return false;
    }, []);

    /**
     * Show an incoming call notification
     * Only shows when the document is hidden (user in another tab/minimized)
     */
    const showCallNotification = useCallback(
        (callerInfo: CallerInfo, callType: 'audio' | 'video'): Notification | null => {
            // Only show notification if browser is not focused
            if (!document.hidden && document.hasFocus()) {
                return null;
            }

            if (Notification.permission !== 'granted') {
                console.warn('[Notification] Permission not granted');
                return null;
            }

            try {
                const icon = callType === 'video' ? '📹' : '📞';
                const notification = new Notification(
                    `${icon} ${callerInfo.name} is calling...`,
                    {
                        body: `Incoming ${callType} call - Click to answer`,
                        icon: callerInfo.avatar || '/logo.png',
                        badge: '/badge.png',
                        tag: 'incoming-call', // Replace existing call notifications
                        requireInteraction: true, // Keep notification visible until user interacts
                        silent: false, // Allow system sound if configured
                    }
                );

                // Focus window when notification is clicked
                notification.onclick = () => {
                    window.focus();
                    notification.close();
                };

                // Auto-close after 30 seconds if not interacted
                setTimeout(() => {
                    notification.close();
                }, 30000);

                return notification;
            } catch (error) {
                console.error('[Notification] Failed to show:', error);
                return null;
            }
        },
        []
    );

    /**
     * Close any active call notification
     */
    const closeCallNotification = useCallback(() => {
        // Close by tag - browsers handle this differently
        // This is a best-effort approach
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                registration.getNotifications({ tag: 'incoming-call' }).then((notifications) => {
                    notifications.forEach((n) => n.close());
                });
            });
        }
    }, []);

    /**
     * Show a missed call notification
     */
    const showMissedCallNotification = useCallback(
        (callerInfo: CallerInfo, callType: 'audio' | 'video'): Notification | null => {
            if (Notification.permission !== 'granted') {
                return null;
            }

            try {
                return new Notification(`Missed ${callType} call`, {
                    body: `${callerInfo.name} tried to call you`,
                    icon: callerInfo.avatar || '/logo.png',
                    tag: 'missed-call',
                });
            } catch (error) {
                console.error('[Notification] Failed to show missed call:', error);
                return null;
            }
        },
        []
    );

    // Request permission on mount if not already granted/denied
    useEffect(() => {
        if (permission === 'default') {
            requestPermission();
        }
    }, [permission, requestPermission]);

    return {
        permission,
        requestPermission,
        showCallNotification,
        closeCallNotification,
        showMissedCallNotification,
        isSupported: typeof window !== 'undefined' && 'Notification' in window,
    };
}

export default useBrowserNotification;
