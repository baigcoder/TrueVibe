import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

// Types for realtime events
interface RealtimeContextType {
    isConnected: boolean;
    userId: string | null;
    subscribeToChannel: (channelName: string) => RealtimeChannel;
    unsubscribeFromChannel: (channelName: string) => void;
    broadcast: (channelName: string, event: string, payload: unknown) => Promise<void>;
    getChannel: (channelName: string) => RealtimeChannel | undefined;
}

const RealtimeContext = createContext<RealtimeContextType>({
    isConnected: false,
    userId: null,
    subscribeToChannel: () => { throw new Error('RealtimeContext not initialized'); },
    unsubscribeFromChannel: () => { },
    broadcast: async () => { },
    getChannel: () => undefined,
});

export function RealtimeProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const channelsRef = useRef<Map<string, RealtimeChannel>>(new Map());
    const userChannelRef = useRef<RealtimeChannel | null>(null);

    // Initialize user channel on auth change
    useEffect(() => {
        const initUserChannel = async () => {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                setUserId(user.id);
                console.log('[Realtime] User authenticated:', user.id);

                // Subscribe to personal user channel for incoming calls and DMs
                const userChannel = supabase.channel(`user:${user.id}`, {
                    config: {
                        broadcast: { self: false },
                        presence: { key: user.id },
                    },
                });

                userChannel
                    .on('broadcast', { event: '*' }, (payload) => {
                        console.log('[Realtime] Received broadcast on user channel:', payload);
                    })
                    .subscribe((status) => {
                        console.log('[Realtime] User channel status:', status);
                        if (status === 'SUBSCRIBED') {
                            setIsConnected(true);
                        }
                    });

                userChannelRef.current = userChannel;
                channelsRef.current.set(`user:${user.id}`, userChannel);
            }
        };

        initUserChannel();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session?.user) {
                initUserChannel();
            } else if (event === 'SIGNED_OUT') {
                // Cleanup all channels
                channelsRef.current.forEach((channel) => {
                    supabase.removeChannel(channel);
                });
                channelsRef.current.clear();
                userChannelRef.current = null;
                setUserId(null);
                setIsConnected(false);
            }
        });

        return () => {
            subscription.unsubscribe();
            // Cleanup channels on unmount
            channelsRef.current.forEach((channel) => {
                supabase.removeChannel(channel);
            });
        };
    }, []);

    const subscribeToChannel = useCallback((channelName: string): RealtimeChannel => {
        // Return existing channel if already subscribed
        const existing = channelsRef.current.get(channelName);
        if (existing) {
            console.log('[Realtime] Returning existing channel:', channelName);
            return existing;
        }

        console.log('[Realtime] Creating new channel:', channelName);
        const channel = supabase.channel(channelName, {
            config: {
                broadcast: { self: false },
            },
        });

        // Store immediately so broadcast can find it
        channelsRef.current.set(channelName, channel);

        channel.subscribe((status) => {
            console.log(`[Realtime] Channel ${channelName} status:`, status);
        });

        return channel;
    }, []);

    const unsubscribeFromChannel = useCallback((channelName: string) => {
        const channel = channelsRef.current.get(channelName);
        if (channel) {
            console.log('[Realtime] Unsubscribing from channel:', channelName);
            supabase.removeChannel(channel);
            channelsRef.current.delete(channelName);
        }
    }, []);

    const broadcast = useCallback(async (channelName: string, event: string, payload: unknown) => {
        let channel = channelsRef.current.get(channelName);

        if (!channel) {
            // Create channel if it doesn't exist
            channel = subscribeToChannel(channelName);
        }

        // Wait for subscription to be ready (increased delay)
        await new Promise(resolve => setTimeout(resolve, 500));

        console.log('[Realtime] Broadcasting to', channelName, ':', event, payload);

        await channel.send({
            type: 'broadcast',
            event,
            payload,
        });
    }, [subscribeToChannel]);

    const getChannel = useCallback((channelName: string): RealtimeChannel | undefined => {
        return channelsRef.current.get(channelName);
    }, []);

    return (
        <RealtimeContext.Provider value={{
            isConnected,
            userId,
            subscribeToChannel,
            unsubscribeFromChannel,
            broadcast,
            getChannel,
        }}>
            {children}
        </RealtimeContext.Provider>
    );
}

export function useRealtime() {
    const context = useContext(RealtimeContext);
    if (!context) {
        throw new Error('useRealtime must be used within RealtimeProvider');
    }
    return context;
}

// Hook for subscribing to a specific channel with event handlers
export function useChannel(
    channelName: string | null,
    handlers?: Record<string, (payload: any) => void>
) {
    const { subscribeToChannel, unsubscribeFromChannel } = useRealtime();
    const [channel, setChannel] = useState<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!channelName) return;

        const ch = subscribeToChannel(channelName);

        // Attach event handlers
        if (handlers) {
            Object.entries(handlers).forEach(([event, handler]) => {
                ch.on('broadcast', { event }, ({ payload }) => {
                    console.log(`[Realtime] Received ${event} on ${channelName}:`, payload);
                    handler(payload);
                });
            });
        }

        setChannel(ch);

        return () => {
            // Only unsubscribe if this is not the user's personal channel
            if (!channelName.startsWith('user:')) {
                unsubscribeFromChannel(channelName);
            }
        };
    }, [channelName, subscribeToChannel, unsubscribeFromChannel]); // intentionally excluding handlers to prevent re-subscriptions

    return channel;
}

// Typing indicator hook using Supabase Realtime
export function useTypingIndicator(conversationId: string | null) {
    const { broadcast, userId } = useRealtime();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    // Subscribe to typing events
    useChannel(conversationId ? `conversation:${conversationId}` : null, {
        'typing:update': (data: { userId: string; isTyping: boolean }) => {
            if (data.userId === userId) return; // Ignore own typing

            setTypingUsers((prev) => {
                if (data.isTyping) {
                    return prev.includes(data.userId) ? prev : [...prev, data.userId];
                }
                return prev.filter((id) => id !== data.userId);
            });
        },
    });

    const startTyping = useCallback(() => {
        if (conversationId && userId) {
            broadcast(`conversation:${conversationId}`, 'typing:update', {
                userId,
                isTyping: true,
            });
        }
    }, [conversationId, userId, broadcast]);

    const stopTyping = useCallback(() => {
        if (conversationId && userId) {
            broadcast(`conversation:${conversationId}`, 'typing:update', {
                userId,
                isTyping: false,
            });
        }
    }, [conversationId, userId, broadcast]);

    return { typingUsers, startTyping, stopTyping };
}

// Presence hook for online status
export function usePresence() {
    const { userId } = useRealtime();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!userId) return;

        // Create a presence channel
        const presenceChannel = supabase.channel('presence:global', {
            config: {
                presence: { key: userId },
            },
        });

        presenceChannel
            .on('presence', { event: 'sync' }, () => {
                const state = presenceChannel.presenceState();
                const users = new Set(Object.keys(state));
                setOnlineUsers(users);
            })
            .on('presence', { event: 'join' }, ({ key }) => {
                setOnlineUsers((prev) => new Set([...prev, key]));
            })
            .on('presence', { event: 'leave' }, ({ key }) => {
                setOnlineUsers((prev) => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await presenceChannel.track({ online_at: new Date().toISOString() });
                }
            });

        return () => {
            supabase.removeChannel(presenceChannel);
        };
    }, [userId]);

    const isOnline = useCallback((checkUserId: string) => onlineUsers.has(checkUserId), [onlineUsers]);

    return { onlineUsers, isOnline };
}
