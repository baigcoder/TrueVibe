import { useState, useEffect, useCallback } from 'react';
import { requestNotificationPermission, onForegroundMessage } from '@/lib/firebase';
import { api } from '@/api/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface PushNotificationPayload {
    notification?: {
        title?: string;
        body?: string;
    };
    data?: {
        notificationId?: string;
        link?: string;
        type?: string;
    };
}

interface UsePushNotificationsReturn {
    isSupported: boolean;
    isEnabled: boolean;
    isLoading: boolean;
    enablePushNotifications: () => Promise<boolean>;
    disablePushNotifications: () => Promise<void>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
    const { user } = useAuth();
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [fcmToken, setFcmToken] = useState<string | null>(null);

    const isSupported = typeof window !== 'undefined' &&
        'Notification' in window &&
        'serviceWorker' in navigator;

    // Check current permission status on mount
    useEffect(() => {
        if (isSupported) {
            setIsEnabled(Notification.permission === 'granted');
        }
    }, [isSupported]);

    // Set up foreground message listener
    useEffect(() => {
        if (!isEnabled) return;

        const unsubscribe = onForegroundMessage((payload: PushNotificationPayload) => {
            console.log('Foreground message received:', payload);

            // Show toast notification
            toast(payload.notification?.title || 'New Notification', {
                description: payload.notification?.body,
                action: payload.data?.link ? {
                    label: 'View',
                    onClick: () => {
                        window.location.href = payload.data!.link!;
                    },
                } : undefined,
            });
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [isEnabled]);

    // Enable push notifications
    const enablePushNotifications = useCallback(async (): Promise<boolean> => {
        if (!isSupported || !user) return false;

        setIsLoading(true);
        try {
            const token = await requestNotificationPermission();

            if (!token) {
                setIsLoading(false);
                return false;
            }

            // Register token with backend
            await api.post('/push-tokens/register', {
                token,
                platform: 'web',
                deviceInfo: {
                    userAgent: navigator.userAgent,
                    language: navigator.language,
                },
            });

            setFcmToken(token);
            setIsEnabled(true);
            setIsLoading(false);

            toast.success('Push notifications enabled!');
            return true;
        } catch (error) {
            console.error('Failed to enable push notifications:', error);
            setIsLoading(false);
            toast.error('Failed to enable notifications');
            return false;
        }
    }, [isSupported, user]);

    // Disable push notifications
    const disablePushNotifications = useCallback(async (): Promise<void> => {
        if (!fcmToken) return;

        setIsLoading(true);
        try {
            await api.delete('/push-tokens/unregister');
            setFcmToken(null);
            setIsEnabled(false);
            toast.success('Push notifications disabled');
        } catch (error) {
            console.error('Failed to disable push notifications:', error);
            toast.error('Failed to disable notifications');
        } finally {
            setIsLoading(false);
        }
    }, [fcmToken]);

    return {
        isSupported,
        isEnabled,
        isLoading,
        enablePushNotifications,
        disablePushNotifications,
    };
}
