import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface Participant {
    id: string;
    socketId: string;
    name: string;
    avatar?: string;
    stream?: MediaStream;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
}

interface PendingRequest {
    userId: string;
    name: string;
    avatar?: string;
    requestedAt: Date;
}

interface RaisedHand {
    userId: string;
    name: string;
    avatar?: string;
    raisedAt: Date;
}

interface VoiceRoomState {
    isInRoom: boolean;
    roomId: string | null;
    roomName: string;
    roomType: 'voice' | 'video' | 'live';
    participants: Participant[];
    speakers: string[]; // List of user IDs on stage
    listeners: string[]; // List of audience member IDs
    raisedHands: RaisedHand[];
    pendingRequests: PendingRequest[];
    localStream: MediaStream | null;
    screenStream: MediaStream | null;
    isMuted: boolean;
    isVideoOff: boolean;
    isScreenSharing: boolean;
    isConnecting: boolean;
    isAdmin: boolean;
    creatorId: string | null;
    requireApproval: boolean;
    waitingForApproval: boolean;
}

interface VoiceRoomContextType extends VoiceRoomState {
    createRoom: (name: string, type?: 'voice' | 'video' | 'live', requireApproval?: boolean) => Promise<string | null>;
    joinRoom: (roomId: string) => Promise<boolean>;
    requestToJoin: (roomId: string) => Promise<boolean>;
    approveRequest: (userId: string) => Promise<boolean>;
    rejectRequest: (userId: string) => Promise<boolean>;
    toggleHand: () => Promise<boolean>;
    promoteToSpeaker: (userId: string) => Promise<boolean>;
    demoteToListener: (userId: string) => Promise<boolean>;
    deleteRoom: () => Promise<boolean>;
    leaveRoom: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    startScreenShare: () => Promise<boolean>;
    stopScreenShare: () => void;
    copyInviteLink: () => void;
}

const VoiceRoomContext = createContext<VoiceRoomContextType | null>(null);

// ICE servers configuration
const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
};

export function VoiceRoomProvider({ children }: { children: React.ReactNode }) {
    const { socket } = useSocket();
    const { profile } = useAuth();

    const [state, setState] = useState<VoiceRoomState>({
        isInRoom: false,
        roomId: null,
        roomName: '',
        roomType: 'voice',
        participants: [],
        pendingRequests: [],
        localStream: null,
        screenStream: null,
        isMuted: false,
        isVideoOff: true,
        isScreenSharing: false,
        isConnecting: false,
        isAdmin: false,
        creatorId: null,
        requireApproval: true,
        waitingForApproval: false,
        speakers: [],
        listeners: [],
        raisedHands: [],
    });


    // Map of peer connections (userId -> RTCPeerConnection)
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);

    // Get user media
    const getUserMedia = useCallback(async (type: 'voice' | 'video') => {
        try {
            const constraints = {
                audio: true,
                video: type === 'video',
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            localStreamRef.current = stream;
            setState(prev => ({ ...prev, localStream: stream }));
            return stream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            toast.error('Failed to access microphone/camera');
            return null;
        }
    }, []);

    // Create a peer connection for a specific user
    const createPeerConnection = useCallback((targetSocketId: string, targetUserId: string) => {
        const pc = new RTCPeerConnection(iceServers);

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && socket) {
                socket.emit('voiceroom:ice-candidate', {
                    roomId: state.roomId,
                    targetSocketId,
                    targetUserId,
                    candidate: event.candidate,
                });
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.socketId === targetSocketId
                        ? { ...p, stream: event.streams[0] }
                        : p
                ),
            }));
        };

        pc.onconnectionstatechange = () => {
            console.log(`Connection state with ${targetUserId}:`, pc.connectionState);
        };

        peerConnections.current.set(targetSocketId, pc);
        return pc;
    }, [socket, state.roomId]);

    // Create and send offer to a user
    const sendOffer = useCallback(async (targetSocketId: string, targetUserId: string) => {
        const pc = createPeerConnection(targetSocketId, targetUserId);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket?.emit('voiceroom:offer', {
                roomId: state.roomId,
                targetSocketId,
                targetUserId,
                offer,
            });
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }, [createPeerConnection, socket, state.roomId]);

    // Create room
    const createRoom = useCallback(async (name: string, type: 'voice' | 'video' | 'live' = 'voice', requireApproval: boolean = true): Promise<string | null> => {
        setState(prev => ({ ...prev, isConnecting: true }));

        try {
            const response = await api.post<{ success: boolean; data: { room: any } }>('/voice-rooms', {
                name,
                type,
                requireApproval,
            });

            if (response.success && response.data.room) {
                const room = response.data.room;

                // Get media
                const getUserMediaMode = type === 'live' ? 'voice' : type;
                const stream = await getUserMedia(getUserMediaMode as 'voice' | 'video');
                if (!stream) {
                    setState(prev => ({ ...prev, isConnecting: false }));
                    return null;
                }

                // Join socket room
                socket?.emit('voiceroom:join', {
                    roomId: room.roomId,
                    userInfo: {
                        id: profile?._id,
                        name: profile?.name,
                        avatar: profile?.avatar,
                    },
                });

                // Copy invite link to clipboard
                const inviteLink = `${window.location.origin}/chat?room=${room.roomId}`;
                navigator.clipboard.writeText(inviteLink);

                setState(prev => ({
                    ...prev,
                    isInRoom: true,
                    roomId: room.roomId,
                    roomName: room.name,
                    roomType: type,
                    isConnecting: false,
                    isVideoOff: type === 'voice',
                    isAdmin: true,
                    creatorId: profile?._id || null,
                    requireApproval,
                    pendingRequests: [],
                    speakers: [profile?._id || ''],
                    listeners: [],
                    raisedHands: [],
                }));

                toast.success(`Room created! Invite link copied. ID: ${room.roomId}`);
                return room.roomId;
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            toast.error('Failed to create room');
        }

        setState(prev => ({ ...prev, isConnecting: false }));
        return null;
    }, [getUserMedia, socket, profile]);

    // Join room
    const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isConnecting: true }));

        try {
            // Join room via API - this will create the room if it's a voice channel
            const response = await api.post<{ success: boolean; data: { room: any } }>(`/voice-rooms/${roomId}/join`);

            if (!response.success || !response.data.room) {
                toast.error('Failed to join room');
                setState(prev => ({ ...prev, isConnecting: false }));
                return false;
            }

            const room = response.data.room;

            // Get media
            const getUserMediaMode = room.type === 'live' ? 'voice' : room.type;
            const stream = await getUserMedia(getUserMediaMode);
            if (!stream) {
                setState(prev => ({ ...prev, isConnecting: false }));
                return false;
            }

            // Join socket room
            socket?.emit('voiceroom:join', {
                roomId,
                userInfo: {
                    id: profile?._id,
                    name: profile?.name,
                    avatar: profile?.avatar,
                },
            });

            setState(prev => ({
                ...prev,
                isInRoom: true,
                roomId,
                roomName: room.name,
                roomType: room.type,
                isConnecting: false,
                isVideoOff: room.type === 'voice' || room.type === 'live',
                speakers: room.speakers || [],
                listeners: room.listeners || [],
                raisedHands: room.raisedHands || [],
            }));

            toast.success(`Joined room: ${room.name}`);
            return true;
        } catch (error: any) {
            console.error('Failed to join room:', error);
            const errorMessage = error.message || 'Failed to join room';
            toast.error(errorMessage);
        }

        setState(prev => ({ ...prev, isConnecting: false }));
        return false;
    }, [getUserMedia, socket, profile]);

    // Leave room
    const leaveRoom = useCallback(() => {
        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();

        // Stop local stream
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());

        // Leave socket room
        if (state.roomId) {
            socket?.emit('voiceroom:leave', { roomId: state.roomId });
            api.post(`/voice-rooms/${state.roomId}/leave`).catch(console.error);
        }

        setState({
            isInRoom: false,
            roomId: null,
            roomName: '',
            roomType: 'voice',
            participants: [],
            pendingRequests: [],
            localStream: null,
            screenStream: null,
            isMuted: false,
            isVideoOff: true,
            isScreenSharing: false,
            isConnecting: false,
            isAdmin: false,
            creatorId: null,
            requireApproval: true,
            waitingForApproval: false,
            speakers: [],
            listeners: [],
            raisedHands: [],
        });

        localStreamRef.current = null;
        screenStreamRef.current = null;
    }, [socket, state.roomId]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            const isMuted = !audioTracks[0]?.enabled;
            setState(prev => ({ ...prev, isMuted }));

            socket?.emit('voiceroom:mute-change', {
                roomId: state.roomId,
                isMuted,
            });
        }
    }, [socket, state.roomId]);

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            const isVideoOff = !videoTracks[0]?.enabled;
            setState(prev => ({ ...prev, isVideoOff }));

            socket?.emit('voiceroom:video-change', {
                roomId: state.roomId,
                isVideoOff,
            });
        }
    }, [socket, state.roomId]);

    // Start screen share
    const startScreenShare = useCallback(async (): Promise<boolean> => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: true,
                audio: true,
            });

            screenStreamRef.current = stream;
            setState(prev => ({ ...prev, screenStream: stream, isScreenSharing: true }));

            // Replace video track in all peer connections
            const videoTrack = stream.getVideoTracks()[0];
            peerConnections.current.forEach(pc => {
                const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                if (sender) {
                    sender.replaceTrack(videoTrack);
                }
            });

            socket?.emit('voiceroom:screen-start', { roomId: state.roomId });

            // Handle stream end
            videoTrack.onended = () => {
                stopScreenShare();
            };

            return true;
        } catch (error) {
            console.error('Failed to start screen share:', error);
            return false;
        }
    }, [socket, state.roomId]);

    // Stop screen share
    const stopScreenShare = useCallback(() => {
        screenStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current = null;

        // Restore camera video track
        if (localStreamRef.current) {
            const videoTrack = localStreamRef.current.getVideoTracks()[0];
            if (videoTrack) {
                peerConnections.current.forEach(pc => {
                    const sender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (sender) {
                        sender.replaceTrack(videoTrack);
                    }
                });
            }
        }

        setState(prev => ({ ...prev, screenStream: null, isScreenSharing: false }));
        socket?.emit('voiceroom:screen-stop', { roomId: state.roomId });
    }, [socket, state.roomId]);

    // Request to join a room (for rooms requiring approval)
    const requestToJoin = useCallback(async (roomId: string): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isConnecting: true, waitingForApproval: true }));

            const response = await api.post<{ success: boolean; data: { status: string; message?: string } }>(`/voice-rooms/${roomId}/request`);

            if (response.success && response.data.status === 'joined') {
                // Room doesn't require approval, we're in
                const roomResponse = await api.get<{ success: boolean; data: { room: any } }>(`/voice-rooms/${roomId}`);
                if (roomResponse.success && roomResponse.data.room) {
                    const room = roomResponse.data.room;
                    setState(prev => ({
                        ...prev,
                        isInRoom: true,
                        roomId: room.roomId || roomId,
                        roomName: room.name,
                        isConnecting: false,
                        waitingForApproval: false,
                    }));
                    return true;
                }
            }

            // Waiting for approval
            toast.info('Join request sent. Waiting for admin approval...');
            setState(prev => ({ ...prev, isConnecting: false }));
            return true;
        } catch (error: any) {
            console.error('Failed to request join:', error);
            toast.error(error?.response?.data?.error || 'Failed to send join request');
            setState(prev => ({ ...prev, isConnecting: false, waitingForApproval: false }));
            return false;
        }
    }, []);

    // Approve a join request (admin only)
    const approveRequest = useCallback(async (userId: string): Promise<boolean> => {
        if (!state.roomId) return false;

        try {
            const response = await api.post<{ success: boolean; data: { room: any } }>(`/voice-rooms/${state.roomId}/approve/${userId}`);

            if (response.success) {
                toast.success('User approved and added to room');
                // Remove from pending requests
                setState(prev => ({
                    ...prev,
                    pendingRequests: prev.pendingRequests.filter(r => r.userId !== userId),
                }));
                return true;
            }
        } catch (error: any) {
            console.error('Failed to approve request:', error);
            toast.error(error?.response?.data?.error || 'Failed to approve request');
        }
        return false;
    }, [state.roomId]);

    // Reject a join request (admin only)
    const rejectRequest = useCallback(async (userId: string): Promise<boolean> => {
        if (!state.roomId) return false;

        try {
            const response = await api.post<{ success: boolean }>(`/voice-rooms/${state.roomId}/reject/${userId}`);

            if (response.success) {
                toast.info('Join request rejected');
                // Remove from pending requests
                setState(prev => ({
                    ...prev,
                    pendingRequests: prev.pendingRequests.filter(r => r.userId !== userId),
                }));
                return true;
            }
        } catch (error: any) {
            console.error('Failed to reject request:', error);
            toast.error(error?.response?.data?.error || 'Failed to reject request');
        }
        return false;
    }, [state.roomId]);

    // Toggle hand to speak
    const toggleHand = useCallback(async (): Promise<boolean> => {
        if (!state.roomId) return false;

        try {
            const response = await api.post<{ success: boolean; data: { isRaised: boolean } }>(`/voice-rooms/${state.roomId}/toggle-hand`);
            if (response.success) {
                return true;
            }
        } catch (error: any) {
            console.error('Failed to toggle hand:', error);
            toast.error('Failed to toggle hand');
        }
        return false;
    }, [state.roomId]);

    // Promote to speaker (admin only)
    const promoteToSpeaker = useCallback(async (userId: string): Promise<boolean> => {
        if (!state.roomId || !state.isAdmin) return false;

        try {
            const response = await api.post<{ success: boolean }>(`/voice-rooms/${state.roomId}/promote/${userId}`);
            if (response.success) {
                toast.success('User promoted to stage');
                return true;
            }
        } catch (error: any) {
            console.error('Failed to promote user:', error);
            toast.error('Failed to promote user');
        }
        return false;
    }, [state.roomId, state.isAdmin]);

    // Demote to listener (admin only)
    const demoteToListener = useCallback(async (userId: string): Promise<boolean> => {
        if (!state.roomId || !state.isAdmin) return false;

        try {
            const response = await api.post<{ success: boolean }>(`/voice-rooms/${state.roomId}/demote/${userId}`);
            if (response.success) {
                toast.info('User demoted to audience');
                return true;
            }
        } catch (error: any) {
            console.error('Failed to demote user:', error);
            toast.error('Failed to demote user');
        }
        return false;
    }, [state.roomId, state.isAdmin]);

    // Delete room (admin only)
    const deleteRoom = useCallback(async (): Promise<boolean> => {
        if (!state.roomId || !state.isAdmin) return false;

        try {
            const response = await api.delete<{ success: boolean }>(`/voice-rooms/${state.roomId}`);

            if (response.success) {
                toast.success('Room deleted');
                leaveRoom();
                return true;
            }
        } catch (error: any) {
            console.error('Failed to delete room:', error);
            toast.error(error?.response?.data?.error || 'Failed to delete room');
        }
        return false;
    }, [state.roomId, state.isAdmin, leaveRoom]);

    // Copy invite link
    const copyInviteLink = useCallback(() => {
        if (state.roomId) {
            const inviteLink = `${window.location.origin}/chat?room=${state.roomId}`;
            navigator.clipboard.writeText(inviteLink);
            toast.success(`Invite link copied! Room ID: ${state.roomId}`);
        }
    }, [state.roomId]);

    // Socket event handlers
    useEffect(() => {
        if (!socket) return;

        // Handle existing users when joining a room
        socket.on('voiceroom:existing-users', async ({ users }) => {
            for (const user of users) {
                // Add participant
                setState(prev => ({
                    ...prev,
                    participants: [...prev.participants, {
                        id: user.userId,
                        socketId: user.socketId,
                        name: 'Participant',
                        isMuted: false,
                        isVideoOff: false,
                        isScreenSharing: false,
                    }],
                }));

                // Send offer to each existing user
                await sendOffer(user.socketId, user.userId);
            }
        });

        // Handle new user joining
        socket.on('voiceroom:user-joined', ({ userId, userInfo }) => {
            setState(prev => ({
                ...prev,
                participants: [...prev.participants, {
                    id: userId,
                    socketId: '',
                    name: userInfo?.name || 'Participant',
                    avatar: userInfo?.avatar,
                    isMuted: false,
                    isVideoOff: false,
                    isScreenSharing: false,
                }],
            }));
            toast.success(`${userInfo?.name || 'Someone'} joined the room`);
        });

        // Handle user leaving
        socket.on('voiceroom:user-left', ({ userId }) => {
            const pc = peerConnections.current.get(userId);
            if (pc) {
                pc.close();
                peerConnections.current.delete(userId);
            }

            setState(prev => ({
                ...prev,
                participants: prev.participants.filter(p => p.id !== userId),
            }));
        });

        // Handle incoming offer
        socket.on('voiceroom:offer', async ({ fromUserId, fromSocketId, offer }) => {
            const pc = createPeerConnection(fromSocketId, fromUserId);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('voiceroom:answer', {
                roomId: state.roomId,
                targetSocketId: fromSocketId,
                targetUserId: fromUserId,
                answer,
            });

            // Update participant with socket ID
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === fromUserId ? { ...p, socketId: fromSocketId } : p
                ),
            }));
        });

        // Handle incoming answer
        socket.on('voiceroom:answer', async ({ fromSocketId, answer }) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        // Handle ICE candidate
        socket.on('voiceroom:ice-candidate', async ({ fromSocketId, candidate }) => {
            const pc = peerConnections.current.get(fromSocketId);
            if (pc && candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // Handle mute changes
        socket.on('voiceroom:user-mute-changed', ({ userId, isMuted }) => {
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === userId ? { ...p, isMuted } : p
                ),
            }));
        });

        // Handle video changes
        socket.on('voiceroom:user-video-changed', ({ userId, isVideoOff }) => {
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === userId ? { ...p, isVideoOff } : p
                ),
            }));
        });

        // Handle screen share
        socket.on('voiceroom:screen-started', ({ userId }) => {
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === userId ? { ...p, isScreenSharing: true } : p
                ),
            }));
        });

        socket.on('voiceroom:screen-stopped', ({ userId }) => {
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.id === userId ? { ...p, isScreenSharing: false } : p
                ),
            }));
        });

        // Handle join request (for admins)
        socket.on('voiceroom:join-request', ({ roomId, user }: { roomId: string; user: { id: string; name: string; avatar?: string } }) => {
            if (state.roomId === roomId && state.isAdmin) {
                setState(prev => ({
                    ...prev,
                    pendingRequests: [...prev.pendingRequests, {
                        userId: user.id,
                        name: user.name,
                        avatar: user.avatar,
                        requestedAt: new Date(),
                    }],
                }));
                toast.info(`${user.name} wants to join the room`);
            }
        });

        // Handle request approved (for users)
        socket.on('voiceroom:request-approved', async ({ roomId, roomName }: { roomId: string; roomName: string }) => {
            toast.success(`You've been approved to join ${roomName}!`);
            setState(prev => ({ ...prev, waitingForApproval: false }));
            // Now actually join the room
            await joinRoom(roomId);
        });

        // Handle request rejected (for users)
        socket.on('voiceroom:request-rejected', () => {
            toast.error('Your join request was rejected');
            setState(prev => ({ ...prev, waitingForApproval: false, isConnecting: false }));
        });

        // Handle room deleted
        socket.on('voiceroom:room-deleted', ({ roomName }: { roomName: string }) => {
            toast.info(`Room "${roomName}" was deleted by the admin`);
            leaveRoom();
        });

        // Handle hand toggled
        socket.on('voiceroom:hand-toggled', ({ userId, name, isRaised }: { userId: string, name: string, isRaised: boolean }) => {
            setState(prev => {
                if (isRaised) {
                    return {
                        ...prev,
                        raisedHands: [...prev.raisedHands, {
                            userId,
                            name,
                            raisedAt: new Date()
                        }]
                    };
                } else {
                    return {
                        ...prev,
                        raisedHands: prev.raisedHands.filter(h => h.userId !== userId)
                    };
                }
            });
            if (isRaised && state.isAdmin) {
                toast.info(`${name} raised their hand!`);
            }
        });

        // Handle user promoted
        socket.on('voiceroom:user-promoted', ({ userId }: { userId: string }) => {
            setState(prev => ({
                ...prev,
                speakers: [...prev.speakers, userId],
                listeners: prev.listeners.filter(l => l !== userId),
                raisedHands: prev.raisedHands.filter(h => h.userId !== userId)
            }));

            if (userId === profile?._id) {
                toast.success('You have been promoted to the stage!');
                // Automatically unmute when promoted to stage? Or let user decide
                // For now just notify
            }
        });

        // Handle user demoted
        socket.on('voiceroom:user-demoted', ({ userId }: { userId: string }) => {
            setState(prev => ({
                ...prev,
                speakers: prev.speakers.filter(s => s !== userId),
                listeners: [...prev.listeners, userId]
            }));

            if (userId === profile?._id) {
                toast.info('You have been moved back to the audience');
                // Ensure muted when moved to audience
                if (!state.isMuted) {
                    toggleMute();
                }
            }
        });

        return () => {
            socket.off('voiceroom:existing-users');
            socket.off('voiceroom:user-joined');
            socket.off('voiceroom:user-left');
            socket.off('voiceroom:offer');
            socket.off('voiceroom:answer');
            socket.off('voiceroom:ice-candidate');
            socket.off('voiceroom:user-mute-changed');
            socket.off('voiceroom:user-video-changed');
            socket.off('voiceroom:screen-started');
            socket.off('voiceroom:screen-stopped');
            socket.off('voiceroom:join-request');
            socket.off('voiceroom:request-approved');
            socket.off('voiceroom:request-rejected');
            socket.off('voiceroom:room-deleted');
            socket.off('voiceroom:hand-toggled');
            socket.off('voiceroom:user-promoted');
            socket.off('voiceroom:user-demoted');
        };
    }, [socket, state.roomId, sendOffer, createPeerConnection, state.isAdmin, joinRoom, leaveRoom]);

    const value: VoiceRoomContextType = {
        ...state,
        createRoom,
        joinRoom,
        leaveRoom,
        toggleMute,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        requestToJoin,
        approveRequest,
        rejectRequest,
        toggleHand,
        promoteToSpeaker,
        demoteToListener,
        deleteRoom,
        copyInviteLink,
    };

    return (
        <VoiceRoomContext.Provider value={value}>
            {children}
        </VoiceRoomContext.Provider>
    );
}

export function useVoiceRoom() {
    const context = useContext(VoiceRoomContext);
    if (!context) {
        throw new Error('useVoiceRoom must be used within a VoiceRoomProvider');
    }
    return context;
}
