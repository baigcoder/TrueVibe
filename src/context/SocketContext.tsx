import { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    connect: (token: string) => void;
    disconnect: () => void;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    connect: () => { },
    disconnect: () => { },
});

export function SocketProvider({ children }: { children: ReactNode }) {
    const [isConnected, setIsConnected] = useState(false);
    const socketRef = useRef<Socket | null>(null);
    const isConnectingRef = useRef(false);

    const connect = useCallback((token: string) => {
        // Prevent multiple connection attempts
        if (isConnectingRef.current || socketRef.current?.connected) {
            return;
        }

        isConnectingRef.current = true;

        // Disconnect existing socket if any
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        const newSocket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 3,
            reconnectionDelay: 1000,
        });

        newSocket.on('connect', () => {
            console.log('Socket connected');
            setIsConnected(true);
            isConnectingRef.current = false;
        });

        newSocket.on('disconnect', () => {
            console.log('Socket disconnected');
            setIsConnected(false);
        });

        newSocket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message);
            isConnectingRef.current = false;
            // Don't spam reconnection on auth errors
            if (error.message.includes('token') || error.message.includes('Authentication')) {
                newSocket.disconnect();
            }
        });

        socketRef.current = newSocket;
    }, []);

    const disconnect = useCallback(() => {
        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        setIsConnected(false);
        isConnectingRef.current = false;
    }, []);

    // Cleanup on unmount only
    useEffect(() => {
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket: socketRef.current, isConnected, connect, disconnect }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within SocketProvider');
    }
    return context;
}

// Utility hook for subscribing to events
export function useSocketEvent<T>(event: string, callback: (data: T) => void) {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        socket.on(event, callback);
        return () => {
            socket.off(event, callback);
        };
    }, [socket, event, callback]);
}

// Typing indicator hook
export function useTypingIndicator(conversationId: string) {
    const { socket } = useSocket();
    const [typingUsers, setTypingUsers] = useState<string[]>([]);

    useEffect(() => {
        if (!socket) return;

        const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
            if (data.conversationId !== conversationId) return;

            setTypingUsers((prev) => {
                if (data.isTyping) {
                    return prev.includes(data.userId) ? prev : [...prev, data.userId];
                }
                return prev.filter((id) => id !== data.userId);
            });
        };

        socket.on('typing:update', handleTyping);
        return () => {
            socket.off('typing:update', handleTyping);
        };
    }, [socket, conversationId]);

    const startTyping = () => {
        socket?.emit('typing:start', { conversationId });
    };

    const stopTyping = () => {
        socket?.emit('typing:stop', { conversationId });
    };

    return { typingUsers, startTyping, stopTyping };
}

// Presence hook
export function usePresence() {
    const { socket } = useSocket();
    const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

    useEffect(() => {
        if (!socket) return;

        const handlePresence = (data: { userId: string; status: 'online' | 'offline' }) => {
            setOnlineUsers((prev) => {
                const next = new Set(prev);
                if (data.status === 'online') {
                    next.add(data.userId);
                } else {
                    next.delete(data.userId);
                }
                return next;
            });
        };

        socket.on('presence:update', handlePresence);
        return () => {
            socket.off('presence:update', handlePresence);
        };
    }, [socket]);

    const isOnline = (userId: string) => onlineUsers.has(userId);

    return { onlineUsers, isOnline };
}

// AI Analysis update hook - handles real-time deepfake detection results
export interface AIAnalysisUpdate {
    postId: string;
    analysis: {
        confidenceScore: number;
        classification: 'AUTHENTIC' | 'SUSPICIOUS' | 'LIKELY_FAKE';
        trustLevel: 'authentic' | 'suspicious' | 'likely_fake';
    };
}

export function useAIAnalysisUpdate(callback: (data: AIAnalysisUpdate) => void) {
    const { socket } = useSocket();

    useEffect(() => {
        if (!socket) return;

        const handleAnalysisComplete = (data: AIAnalysisUpdate) => {
            console.log('📊 AI Analysis complete:', data);
            callback(data);
        };

        socket.on('ai:analysis-complete', handleAnalysisComplete);
        return () => {
            socket.off('ai:analysis-complete', handleAnalysisComplete);
        };
    }, [socket, callback]);
}
