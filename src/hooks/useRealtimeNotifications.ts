import { useEffect, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '@/context/SocketContext';
import { useNotificationSound } from './useNotificationSound';
import { toast } from 'sonner';

interface NotificationPayload {
    _id: string;
    type: string;
    body: string;
    senderId?: {
        name?: string;
        avatar?: string;
    };
    createdAt: string;
}

interface FollowAcceptedPayload {
    acceptedBy: string;
    acceptedByProfile?: {
        userId: string;
        name: string;
        handle: string;
        avatar?: string;
    };
}

export function useRealtimeNotifications() {
    const { socket } = useSocket();
    const queryClient = useQueryClient();
    const { playNotificationSound } = useNotificationSound();
    const [unreadCount, setUnreadCount] = useState(0);

    // Fetch initial unread count or rely on the notifications query?
    // For now, we'll sync with the notifications query data
    const handleNewNotification = useCallback((notification: NotificationPayload) => {
        console.log('🔔 New intelligence received:', notification);

        // Play high-tech notification sound
        playNotificationSound();

        // Increment unread count
        setUnreadCount(prev => prev + 1);

        // Invalidate notifications query to refresh the list
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        // Show techy toast notification
        toast.info(
            notification.body.toUpperCase() || 'NEW_INTEL_RECEIVED',
            {
                description: `SOURCE: ${notification.senderId?.name?.toUpperCase() || 'OPERATOR_UNK'}`,
                duration: 5000,
                icon: '📡',
                style: {
                    background: '#0a0a0c',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: '#fff',
                    fontFamily: 'inherit',
                    textTransform: 'uppercase',
                    fontSize: '10px',
                    letterSpacing: '0.1em',
                }
            }
        );
    }, [playNotificationSound, queryClient]);

    // Handle follow request accepted - someone accepted your request!
    const handleFollowAccepted = useCallback((payload: FollowAcceptedPayload) => {
        console.log('✅ Follow request accepted:', payload);

        // Play notification sound
        playNotificationSound();

        // Invalidate relevant queries to refresh state
        queryClient.invalidateQueries({ queryKey: ['users', 'profile', payload.acceptedBy] });
        queryClient.invalidateQueries({ queryKey: ['users', payload.acceptedBy] });
        queryClient.invalidateQueries({ queryKey: ['feed'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });

        // Show success toast
        toast.success(
            `${payload.acceptedByProfile?.name || 'Someone'} accepted your follow request!`,
            {
                description: `You can now see their content`,
                duration: 5000,
                icon: '🎉',
            }
        );
    }, [playNotificationSound, queryClient]);

    useEffect(() => {
        if (!socket) return;

        socket.on('notification:new', handleNewNotification);
        socket.on('follow:accepted', handleFollowAccepted);

        return () => {
            socket.off('notification:new', handleNewNotification);
            socket.off('follow:accepted', handleFollowAccepted);
        };
    }, [socket, handleNewNotification, handleFollowAccepted]);

    // Reset count when notifications are marked read? 
    // Usually this is handled by invalidating the query and the badge component reading from the query data.
    // But for the "dynamic" feel, we'll return the local count state.
    return { unreadCount, setUnreadCount };
}

