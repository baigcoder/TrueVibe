import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { setPresence, getPresence } from '../config/redis.js';
import { Profile } from '../modules/users/Profile.model.js';
import { sendCallPushNotification } from '../modules/notifications/notification.service.js';

const isProd = process.env.NODE_ENV === 'production';

// Production-safe logging
function debugLog(...args: unknown[]): void {
    if (!isProd) console.log('[Socket]', ...args);
}

let io: Server | null = null;

// User socket mapping
const userSockets = new Map<string, Set<string>>(); // supabaseId -> Set of socketIds

interface JWTPayload {
    sub: string;
    email?: string;
    aud: string;
    exp: number;
}

export const initializeSocketIO = (httpServer: HttpServer): Server => {
    io = new Server(httpServer, {
        cors: {
            origin: config.frontend.url,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        pingTimeout: 60000,
        pingInterval: 25000,
    });

    // Supabase JWT authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                return next(new Error('Authentication required'));
            }

            // Verify/decode Supabase JWT token
            let payload: JWTPayload;

            if (config.supabase?.jwtSecret) {
                payload = jwt.verify(token, config.supabase.jwtSecret) as JWTPayload;
            } else {
                // Development: decode without verification
                payload = jwt.decode(token) as JWTPayload;
            }

            if (!payload || !payload.sub) {
                return next(new Error('Invalid token'));
            }

            // Find user profile by supabaseId
            const profile = await Profile.findOne({
                $or: [
                    { supabaseId: payload.sub },
                    { clerkId: payload.sub },
                ]
            });

            socket.data.supabaseId = payload.sub;
            socket.data.userId = profile?._id?.toString() || payload.sub;
            socket.data.email = payload.email;
            next();
        } catch (error) {
            console.error('Socket auth error:', error);
            next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId;
        debugLog(`User connected: ${userId} (${socket.id})`);

        // Track user socket
        if (!userSockets.has(userId)) {
            userSockets.set(userId, new Set());
        }
        userSockets.get(userId)!.add(socket.id);

        // Set online status in Redis
        setPresence(userId, 'online', 300);

        // Broadcast online status
        socket.broadcast.emit('presence:update', { userId, status: 'online' });

        // Join personal room
        socket.join(`user:${userId}`);

        // Handle room joining
        socket.on('join:room', ({ roomId }) => {
            socket.join(roomId);
            debugLog(`User ${userId} joined room: ${roomId}`);
        });

        socket.on('leave:room', ({ roomId }) => {
            socket.leave(roomId);
            debugLog(`User ${userId} left room: ${roomId}`);
        });

        // Handle server joining
        socket.on('server:join', ({ serverId }) => {
            socket.join(`server:${serverId}`);
            socket.to(`server:${serverId}`).emit('member:online', { userId, serverId });
            debugLog(`User ${userId} joined server: ${serverId}`);
        });

        socket.on('server:leave', ({ serverId }) => {
            socket.leave(`server:${serverId}`);
            socket.to(`server:${serverId}`).emit('member:offline', { userId, serverId });
            debugLog(`User ${userId} left server: ${serverId}`);
        });

        // Handle channel joining
        socket.on('channel:join', ({ channelId }) => {
            socket.join(`channel:${channelId}`);
            debugLog(`User ${userId} joined channel: ${channelId}`);
        });

        socket.on('channel:leave', ({ channelId }) => {
            socket.leave(`channel:${channelId}`);
            debugLog(`User ${userId} left channel: ${channelId}`);
        });

        // Typing indicators for channels
        socket.on('channel:typing:start', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('channel:typing', {
                channelId,
                userId,
                isTyping: true,
            });
        });

        socket.on('channel:typing:stop', ({ channelId }) => {
            socket.to(`channel:${channelId}`).emit('channel:typing', {
                channelId,
                userId,
                isTyping: false,
            });
        });

        // Handle typing indicators
        socket.on('typing:start', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:update', {
                conversationId,
                userId,
                isTyping: true,
            });
        });

        socket.on('typing:stop', ({ conversationId }) => {
            socket.to(`conversation:${conversationId}`).emit('typing:update', {
                conversationId,
                userId,
                isTyping: false,
            });
        });

        // Handle WebRTC signaling
        socket.on('call:initiate', async ({ targetUserId, type, callerInfo }) => {
            const callId = `call_${Date.now()}_${userId}`;

            // Emit to target user if they are connected
            emitToUser(targetUserId, 'call:incoming', {
                callId,
                callerId: userId,
                type,
                callerInfo: callerInfo || {
                    id: userId,
                    name: 'Unknown',
                },
            });

            // Also send push notification for when browser is minimized/unfocused
            if (callerInfo) {
                sendCallPushNotification(targetUserId, callerInfo, type, callId).catch(err => {
                    console.warn('[Socket] Call push notification failed:', err.message);
                });
            }
        });

        socket.on('call:answer', ({ callId, targetUserId, sdp }) => {
            emitToUser(targetUserId, 'call:accepted', { callId, sdp });
        });

        socket.on('call:reject', ({ callId, targetUserId }) => {
            emitToUser(targetUserId, 'call:rejected', { callId });
        });

        socket.on('call:ice-candidate', ({ callId, targetUserId, candidate }) => {
            emitToUser(targetUserId, 'call:ice-candidate', { callId, candidate });
        });

        socket.on('call:end', ({ callId, targetUserId }) => {
            emitToUser(targetUserId, 'call:ended', { callId });
        });

        socket.on('call:offer', ({ targetUserId, sdp }) => {
            emitToUser(targetUserId, 'call:offer', { callerId: userId, sdp });
        });

        // ========================
        // Voice Room Events (Multi-party WebRTC)
        // ========================

        // Join a voice room
        socket.on('voiceroom:join', async ({ roomId, userInfo }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.join(roomSocketId);

            // Notify others in the room that a new user joined
            socket.to(roomSocketId).emit('voiceroom:user-joined', {
                roomId,
                userId,
                userInfo: userInfo || { id: userId, name: 'Unknown' },
            });

            // Get list of other users in the room to establish connections
            const usersInRoom = await io?.in(roomSocketId).fetchSockets();
            const otherUsers = usersInRoom
                ?.filter(s => s.id !== socket.id)
                .map(s => ({
                    socketId: s.id,
                    userId: s.data.userId,
                })) || [];

            // Send list of existing participants to the new user
            socket.emit('voiceroom:existing-users', { roomId, users: otherUsers });

            debugLog(`User ${userId} joined voice room: ${roomId}`);
        });

        // Leave a voice room
        socket.on('voiceroom:leave', ({ roomId }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.leave(roomSocketId);

            // Notify others that user left
            socket.to(roomSocketId).emit('voiceroom:user-left', {
                roomId,
                userId,
            });

            debugLog(`User ${userId} left voice room: ${roomId}`);
        });

        // WebRTC offer for room (to specific user)
        socket.on('voiceroom:offer', ({ roomId, targetUserId, targetSocketId, offer }) => {
            // Send offer to specific user in the room
            if (targetSocketId) {
                io?.to(targetSocketId).emit('voiceroom:offer', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    offer,
                });
            } else if (targetUserId) {
                emitToUser(targetUserId, 'voiceroom:offer', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    offer,
                });
            }
        });

        // WebRTC answer for room (to specific user)
        socket.on('voiceroom:answer', ({ roomId, targetUserId, targetSocketId, answer }) => {
            if (targetSocketId) {
                io?.to(targetSocketId).emit('voiceroom:answer', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    answer,
                });
            } else if (targetUserId) {
                emitToUser(targetUserId, 'voiceroom:answer', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    answer,
                });
            }
        });

        // ICE candidate for room (to specific user)
        socket.on('voiceroom:ice-candidate', ({ roomId, targetUserId, targetSocketId, candidate }) => {
            if (targetSocketId) {
                io?.to(targetSocketId).emit('voiceroom:ice-candidate', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    candidate,
                });
            } else if (targetUserId) {
                emitToUser(targetUserId, 'voiceroom:ice-candidate', {
                    roomId,
                    fromUserId: userId,
                    fromSocketId: socket.id,
                    candidate,
                });
            }
        });

        // Screen share started
        socket.on('voiceroom:screen-start', ({ roomId }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.to(roomSocketId).emit('voiceroom:screen-started', {
                roomId,
                userId,
            });
        });

        // Screen share stopped
        socket.on('voiceroom:screen-stop', ({ roomId }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.to(roomSocketId).emit('voiceroom:screen-stopped', {
                roomId,
                userId,
            });
        });

        // Mute/unmute notifications
        socket.on('voiceroom:mute-change', ({ roomId, isMuted }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.to(roomSocketId).emit('voiceroom:user-mute-changed', {
                roomId,
                userId,
                isMuted,
            });
        });

        // Video on/off notifications
        socket.on('voiceroom:video-change', ({ roomId, isVideoOff }) => {
            const roomSocketId = `voiceroom:${roomId}`;
            socket.to(roomSocketId).emit('voiceroom:user-video-changed', {
                roomId,
                userId,
                isVideoOff,
            });
        });

        // Handle disconnection
        socket.on('disconnect', async () => {
            debugLog(`User disconnected: ${userId} (${socket.id})`);

            const sockets = userSockets.get(userId);
            if (sockets) {
                sockets.delete(socket.id);
                if (sockets.size === 0) {
                    userSockets.delete(userId);

                    // Set offline in Redis
                    await setPresence(userId, 'offline');

                    // Broadcast offline status
                    socket.broadcast.emit('presence:update', { userId, status: 'offline' });
                }
            }
        });
    });

    debugLog('Socket.IO initialized');
    return io;
};

export const getIO = (): Server => {
    if (!io) {
        throw new Error('Socket.IO not initialized');
    }
    return io;
};

// Utility functions for emitting events
export const emitToUser = (userId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`user:${userId}`).emit(event, data);
    }
};

export const emitToRoom = (roomId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(roomId).emit(event, data);
    }
};

export const emitToPost = (postId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`post:${postId}`).emit(event, data);
    }
};

export const emitToShort = (shortId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`short:${shortId}`).emit(event, data);
    }
};

export const emitToConversation = (conversationId: string, event: string, data: unknown): void => {
    if (io) {
        io.to(`conversation:${conversationId}`).emit(event, data);
    }
};

// Get online users
export const getOnlineUsers = async (userIds: string[]): Promise<Map<string, boolean>> => {
    const result = new Map<string, boolean>();

    for (const userId of userIds) {
        const status = await getPresence(userId);
        result.set(userId, status === 'online');
    }

    return result;
};
