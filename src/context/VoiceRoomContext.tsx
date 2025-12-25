import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useRealtime } from './RealtimeContext';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface Participant {
    id: string;
    supabaseId: string;
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
    const { profile } = useAuth();
    const { subscribeToChannel, unsubscribeFromChannel, broadcast, userId: supabaseUserId } = useRealtime();

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

    // Map of peer connections (supabaseId -> RTCPeerConnection)
    const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
    const localStreamRef = useRef<MediaStream | null>(null);
    const screenStreamRef = useRef<MediaStream | null>(null);
    const roomChannelRef = useRef<any>(null);

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

    // Broadcast to voice room channel
    const broadcastToRoom = useCallback(async (event: string, payload: unknown) => {
        if (state.roomId) {
            await broadcast(`voiceroom:${state.roomId}`, event, payload);
        }
    }, [state.roomId, broadcast]);

    // Create a peer connection for a specific user
    const createPeerConnection = useCallback((targetSupabaseId: string, _targetName?: string) => {
        const pc = new RTCPeerConnection(iceServers);

        // Add local stream tracks
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current!);
            });
        }

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate && state.roomId) {
                console.log('[VoiceRoom] Sending ICE candidate via Supabase to:', targetSupabaseId);
                broadcast(`voiceroom:${state.roomId}`, 'ice-candidate', {
                    targetSupabaseId,
                    candidate: event.candidate,
                    fromSupabaseId: supabaseUserId,
                });
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            console.log('[VoiceRoom] Received track from:', targetSupabaseId);
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === targetSupabaseId
                        ? { ...p, stream: event.streams[0] }
                        : p
                ),
            }));
        };

        pc.onconnectionstatechange = () => {
            console.log(`[VoiceRoom] Connection state with ${targetSupabaseId}:`, pc.connectionState);
        };

        peerConnections.current.set(targetSupabaseId, pc);
        return pc;
    }, [state.roomId, broadcast, supabaseUserId]);

    // Create and send offer to a user
    const sendOffer = useCallback(async (targetSupabaseId: string, targetName?: string) => {
        console.log('[VoiceRoom] Sending offer to:', targetSupabaseId);
        const pc = createPeerConnection(targetSupabaseId, targetName);

        try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            await broadcast(`voiceroom:${state.roomId}`, 'offer', {
                targetSupabaseId,
                offer,
                fromSupabaseId: supabaseUserId,
                fromName: profile?.name,
                fromAvatar: profile?.avatar,
            });
        } catch (error) {
            console.error('Failed to create offer:', error);
        }
    }, [createPeerConnection, broadcast, state.roomId, supabaseUserId, profile]);

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

                // Subscribe to room channel via Supabase
                const channelName = `voiceroom:${room.roomId}`;
                console.log('[VoiceRoom] Subscribing to room channel:', channelName);
                const channel = subscribeToChannel(channelName);
                roomChannelRef.current = channel;

                // Announce presence
                await broadcast(channelName, 'user-joined', {
                    supabaseId: supabaseUserId,
                    name: profile?.name,
                    avatar: profile?.avatar,
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
    }, [getUserMedia, subscribeToChannel, broadcast, supabaseUserId, profile]);

    // Join room
    const joinRoom = useCallback(async (roomId: string): Promise<boolean> => {
        setState(prev => ({ ...prev, isConnecting: true }));

        try {
            // Join room via API
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

            // Subscribe to room channel via Supabase
            const channelName = `voiceroom:${roomId}`;
            console.log('[VoiceRoom] Subscribing to room channel:', channelName);
            const channel = subscribeToChannel(channelName);
            roomChannelRef.current = channel;

            // Announce presence and request connections
            await broadcast(channelName, 'user-joined', {
                supabaseId: supabaseUserId,
                name: profile?.name,
                avatar: profile?.avatar,
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
    }, [getUserMedia, subscribeToChannel, broadcast, supabaseUserId, profile]);

    // Leave room
    const leaveRoom = useCallback(() => {
        // Announce leaving
        if (state.roomId) {
            broadcast(`voiceroom:${state.roomId}`, 'user-left', {
                supabaseId: supabaseUserId,
            });

            // Unsubscribe from room channel
            unsubscribeFromChannel(`voiceroom:${state.roomId}`);
            api.post(`/voice-rooms/${state.roomId}/leave`).catch(console.error);
        }

        // Close all peer connections
        peerConnections.current.forEach(pc => pc.close());
        peerConnections.current.clear();

        // Stop local stream
        localStreamRef.current?.getTracks().forEach(track => track.stop());
        screenStreamRef.current?.getTracks().forEach(track => track.stop());

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
        roomChannelRef.current = null;
    }, [state.roomId, broadcast, unsubscribeFromChannel, supabaseUserId]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStreamRef.current) {
            const audioTracks = localStreamRef.current.getAudioTracks();
            audioTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            const isMuted = !audioTracks[0]?.enabled;
            setState(prev => ({ ...prev, isMuted }));

            broadcastToRoom('mute-change', {
                supabaseId: supabaseUserId,
                isMuted,
            });
        }
    }, [broadcastToRoom, supabaseUserId]);

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStreamRef.current) {
            const videoTracks = localStreamRef.current.getVideoTracks();
            videoTracks.forEach(track => {
                track.enabled = !track.enabled;
            });

            const isVideoOff = !videoTracks[0]?.enabled;
            setState(prev => ({ ...prev, isVideoOff }));

            broadcastToRoom('video-change', {
                supabaseId: supabaseUserId,
                isVideoOff,
            });
        }
    }, [broadcastToRoom, supabaseUserId]);

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

            broadcastToRoom('screen-start', { supabaseId: supabaseUserId });

            // Handle stream end
            videoTrack.onended = () => {
                stopScreenShare();
            };

            return true;
        } catch (error) {
            console.error('Failed to start screen share:', error);
            return false;
        }
    }, [broadcastToRoom, supabaseUserId]);

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
        broadcastToRoom('screen-stop', { supabaseId: supabaseUserId });
    }, [broadcastToRoom, supabaseUserId]);

    // Request to join a room (for rooms requiring approval)
    const requestToJoin = useCallback(async (roomId: string): Promise<boolean> => {
        try {
            setState(prev => ({ ...prev, isConnecting: true, waitingForApproval: true }));

            const response = await api.post<{ success: boolean; data: { status: string; message?: string } }>(`/voice-rooms/${roomId}/request`);

            if (response.success && response.data.status === 'joined') {
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
                // Notify all participants
                await broadcastToRoom('room-deleted', { roomName: state.roomName });
                toast.success('Room deleted');
                leaveRoom();
                return true;
            }
        } catch (error: any) {
            console.error('Failed to delete room:', error);
            toast.error(error?.response?.data?.error || 'Failed to delete room');
        }
        return false;
    }, [state.roomId, state.isAdmin, state.roomName, broadcastToRoom, leaveRoom]);

    // Copy invite link
    const copyInviteLink = useCallback(() => {
        if (state.roomId) {
            const inviteLink = `${window.location.origin}/chat?room=${state.roomId}`;
            navigator.clipboard.writeText(inviteLink);
            toast.success(`Invite link copied! Room ID: ${state.roomId}`);
        }
    }, [state.roomId]);

    // Supabase Realtime event handlers for room
    useEffect(() => {
        if (!state.roomId || !roomChannelRef.current) return;

        const channel = roomChannelRef.current;

        // Handle new user joining
        channel.on('broadcast', { event: 'user-joined' }, async ({ payload }: { payload: any }) => {
            console.log('[VoiceRoom] User joined:', payload);
            const { supabaseId: joinedSupabaseId, name, avatar } = payload;

            // Don't process our own join
            if (joinedSupabaseId === supabaseUserId) return;

            // Add to participants
            setState(prev => {
                if (prev.participants.some(p => p.supabaseId === joinedSupabaseId)) {
                    return prev;
                }
                return {
                    ...prev,
                    participants: [...prev.participants, {
                        id: joinedSupabaseId,
                        supabaseId: joinedSupabaseId,
                        name: name || 'Participant',
                        avatar,
                        isMuted: false,
                        isVideoOff: false,
                        isScreenSharing: false,
                    }],
                };
            });

            toast.success(`${name || 'Someone'} joined the room`);

            // Send offer to new user
            await sendOffer(joinedSupabaseId, name);
        });

        // Handle user leaving
        channel.on('broadcast', { event: 'user-left' }, ({ payload }: { payload: any }) => {
            console.log('[VoiceRoom] User left:', payload);
            const { supabaseId: leftSupabaseId } = payload;

            const pc = peerConnections.current.get(leftSupabaseId);
            if (pc) {
                pc.close();
                peerConnections.current.delete(leftSupabaseId);
            }

            setState(prev => ({
                ...prev,
                participants: prev.participants.filter(p => p.supabaseId !== leftSupabaseId),
            }));
        });

        // Handle incoming offer
        channel.on('broadcast', { event: 'offer' }, async ({ payload }: { payload: any }) => {
            const { fromSupabaseId, targetSupabaseId, offer, fromName, fromAvatar } = payload;

            // Only process if this offer is for us
            if (targetSupabaseId !== supabaseUserId) return;

            console.log('[VoiceRoom] Received offer from:', fromSupabaseId);

            const pc = createPeerConnection(fromSupabaseId, fromName);

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            await broadcast(`voiceroom:${state.roomId}`, 'answer', {
                targetSupabaseId: fromSupabaseId,
                answer,
                fromSupabaseId: supabaseUserId,
            });

            // Update participant info
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === fromSupabaseId
                        ? { ...p, name: fromName || p.name, avatar: fromAvatar || p.avatar }
                        : p
                ),
            }));
        });

        // Handle incoming answer
        channel.on('broadcast', { event: 'answer' }, async ({ payload }: { payload: any }) => {
            const { fromSupabaseId, targetSupabaseId, answer } = payload;

            // Only process if this answer is for us
            if (targetSupabaseId !== supabaseUserId) return;

            console.log('[VoiceRoom] Received answer from:', fromSupabaseId);

            const pc = peerConnections.current.get(fromSupabaseId);
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            }
        });

        // Handle ICE candidate
        channel.on('broadcast', { event: 'ice-candidate' }, async ({ payload }: { payload: any }) => {
            const { fromSupabaseId, targetSupabaseId, candidate } = payload;

            // Only process if this candidate is for us
            if (targetSupabaseId !== supabaseUserId) return;

            const pc = peerConnections.current.get(fromSupabaseId);
            if (pc && candidate) {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
        });

        // Handle mute changes
        channel.on('broadcast', { event: 'mute-change' }, ({ payload }: { payload: any }) => {
            const { supabaseId: changedSupabaseId, isMuted } = payload;
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === changedSupabaseId ? { ...p, isMuted } : p
                ),
            }));
        });

        // Handle video changes
        channel.on('broadcast', { event: 'video-change' }, ({ payload }: { payload: any }) => {
            const { supabaseId: changedSupabaseId, isVideoOff } = payload;
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === changedSupabaseId ? { ...p, isVideoOff } : p
                ),
            }));
        });

        // Handle screen share
        channel.on('broadcast', { event: 'screen-start' }, ({ payload }: { payload: any }) => {
            const { supabaseId: sharingSupabaseId } = payload;
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === sharingSupabaseId ? { ...p, isScreenSharing: true } : p
                ),
            }));
        });

        channel.on('broadcast', { event: 'screen-stop' }, ({ payload }: { payload: any }) => {
            const { supabaseId: sharingSupabaseId } = payload;
            setState(prev => ({
                ...prev,
                participants: prev.participants.map(p =>
                    p.supabaseId === sharingSupabaseId ? { ...p, isScreenSharing: false } : p
                ),
            }));
        });

        // Handle room deleted
        channel.on('broadcast', { event: 'room-deleted' }, ({ payload }: { payload: any }) => {
            toast.info(`Room "${payload.roomName}" was deleted by the admin`);
            leaveRoom();
        });

    }, [state.roomId, supabaseUserId, sendOffer, createPeerConnection, broadcast, leaveRoom]);

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
