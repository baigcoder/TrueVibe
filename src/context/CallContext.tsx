import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';
import { useRingtone } from '@/hooks/useRingtone';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';

interface CallParticipant {
    id: string;
    name: string;
    avatar?: string;
    stream?: MediaStream;
}

interface CallState {
    isInCall: boolean;
    callType: 'audio' | 'video' | null;
    callId: string | null;
    caller: CallParticipant | null;
    participants: CallParticipant[];
    isMuted: boolean;
    isVideoOff: boolean;
    isRinging: boolean;
    callerInfo: CallParticipant | null;
    remoteUserId: string | null;
    pendingOffer: RTCSessionDescriptionInit | null;
}

interface CallContextType extends CallState {
    initiateCall: (userId: string, type: 'audio' | 'video') => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    localStream: MediaStream | null;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { socket } = useSocket();
    const { user, profile } = useAuth();

    // Ringtone and notification hooks
    const { playRingtone, stopRingtone, playDialTone, stopDialTone, playConnectedSound, playEndedSound, stopAll } = useRingtone();
    const { showCallNotification, closeCallNotification, showMissedCallNotification: _showMissedCallNotification } = useBrowserNotification();

    const [callState, setCallState] = useState<CallState>({
        isInCall: false,
        callType: null,
        callId: null,
        caller: null,
        participants: [],
        isMuted: false,
        isVideoOff: false,
        isRinging: false,
        callerInfo: null,
        remoteUserId: null,
        pendingOffer: null,
    });

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
    const pendingIceCandidates = useRef<RTCIceCandidate[]>([]);

    // ICE servers configuration - Added more robust public STUN servers
    const iceServers = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' },
            { urls: 'stun:stun3.l.google.com:19302' },
            { urls: 'stun:stun4.l.google.com:19302' },
            { urls: 'stun:stun.services.mozilla.com' }
        ],
    };

    // Get user media
    const getUserMedia = useCallback(async (type: 'audio' | 'video') => {
        try {
            const constraints = {
                audio: true,
                video: type === 'video',
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            setLocalStream(stream);
            return stream;
        } catch (error) {
            console.error('Failed to get user media:', error);
            return null;
        }
    }, []);

    // Create peer connection
    const createPeerConnection = useCallback((remoteUserId: string | null) => {
        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket && remoteUserId) {
                socket.emit('call:ice-candidate', {
                    callId: callState.callId,
                    candidate: event.candidate,
                    targetUserId: remoteUserId,
                });
            }
        };

        pc.ontrack = (event) => {
            setCallState((prev) => ({
                ...prev,
                participants: prev.participants.map((p) =>
                    p.id !== user?.id ? { ...p, stream: event.streams[0] } : p
                ),
            }));
        };

        pc.onconnectionstatechange = () => {
            console.log('[CallContext] PC Connection State:', pc.connectionState);
            if (pc.connectionState === 'failed') {
                // Attempt to restart ICE if possible, or end call
                console.warn('[CallContext] Connection failed, ending call.');
                endCall();
            } else if (pc.connectionState === 'disconnected') {
                // Might be temporary
                setTimeout(() => {
                    if (pc.connectionState === 'disconnected') endCall();
                }, 5000);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[CallContext] ICE Connection State:', pc.iceConnectionState);
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [socket, callState.callId, user?.id]);

    // Initiate a call
    const initiateCall = useCallback(async (userId: string, type: 'audio' | 'video') => {
        const stream = await getUserMedia(type);
        if (!stream || !socket) return;

        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create peer connection first to generate offer
        const pc = createPeerConnection(userId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        setCallState({
            isInCall: true,
            callType: type,
            callId,
            caller: {
                id: user?.id || '',
                name: profile?.name || 'You',
                avatar: profile?.avatar,
            },
            participants: [
                { id: user?.id || '', name: profile?.name || 'You', avatar: profile?.avatar, stream },
                { id: userId, name: 'Calling...', avatar: undefined },
            ],
            isMuted: false,
            isVideoOff: type === 'audio',
            isRinging: false,
            callerInfo: null,
            remoteUserId: userId,
            pendingOffer: null,
        });

        // Play dial tone for outgoing call
        playDialTone();

        // Send offer with call initiation
        socket.emit('call:initiate', {
            callId,
            targetUserId: userId,
            type,
            offer: pc.localDescription,
            callerInfo: {
                id: user?.id,
                name: profile?.name,
                avatar: profile?.avatar,
            },
        });
    }, [socket, user, profile, getUserMedia, createPeerConnection, playDialTone]);

    // Accept incoming call
    const acceptCall = useCallback(async () => {
        if (!callState.callId || !callState.callType || !socket || !callState.pendingOffer) {
            console.error('[CallContext] Cannot accept call: missing required data');
            return;
        }

        const stream = await getUserMedia(callState.callType);
        if (!stream) return;

        // Stop ringtone immediately
        stopRingtone();
        closeCallNotification();

        // Create peer connection with remote user ID for ICE candidate routing
        const pc = createPeerConnection(callState.remoteUserId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Set remote description from the offer we received
        await pc.setRemoteDescription(new RTCSessionDescription(callState.pendingOffer));

        // Apply any pending ICE candidates that arrived before remote description was set
        pendingIceCandidates.current.forEach((candidate) => {
            pc.addIceCandidate(candidate).catch(console.error);
        });
        pendingIceCandidates.current = [];

        // Create and set local answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        setCallState((prev) => ({
            ...prev,
            isInCall: true,
            isRinging: false,
            pendingOffer: null,
            participants: [
                { id: user?.id || '', name: profile?.name || 'You', avatar: profile?.avatar, stream },
                ...(prev.callerInfo ? [prev.callerInfo] : []),
            ],
        }));

        // Play connected sound
        playConnectedSound();

        // Send answer back to caller
        socket.emit('call:answer', {
            callId: callState.callId,
            answer: pc.localDescription,
            targetUserId: callState.remoteUserId,
        });
    }, [callState.callId, callState.callType, callState.pendingOffer, callState.remoteUserId, socket, user, profile, getUserMedia, createPeerConnection, stopRingtone, closeCallNotification, playConnectedSound]);

    // Reject incoming call
    const rejectCall = useCallback(() => {
        // Stop ringtone and close notification
        stopRingtone();
        closeCallNotification();

        if (socket && callState.callId) {
            socket.emit('call:reject', {
                callId: callState.callId,
                targetUserId: callState.remoteUserId,
            });
        }
        setCallState({
            isInCall: false,
            callType: null,
            callId: null,
            caller: null,
            participants: [],
            isMuted: false,
            isVideoOff: false,
            isRinging: false,
            callerInfo: null,
            remoteUserId: null,
            pendingOffer: null,
        });
    }, [socket, callState.callId, callState.remoteUserId, stopRingtone, closeCallNotification]);

    // End call
    const endCall = useCallback(() => {
        // Stop all sounds and play ended sound
        stopAll();
        playEndedSound();
        closeCallNotification();

        if (socket && callState.callId) {
            socket.emit('call:end', {
                callId: callState.callId,
                targetUserId: callState.remoteUserId,
            });
        }

        // Clean up
        localStream?.getTracks().forEach((track) => track.stop());
        peerConnectionRef.current?.close();
        peerConnectionRef.current = null;

        setLocalStream(null);
        setCallState({
            isInCall: false,
            callType: null,
            callId: null,
            caller: null,
            participants: [],
            isMuted: false,
            isVideoOff: false,
            isRinging: false,
            callerInfo: null,
            remoteUserId: null,
            pendingOffer: null,
        });
    }, [socket, callState.callId, callState.remoteUserId, localStream, stopAll, playEndedSound, closeCallNotification]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (localStream) {
            localStream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setCallState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
        }
    }, [localStream]);

    // Toggle video
    const toggleVideo = useCallback(() => {
        if (localStream) {
            localStream.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setCallState((prev) => ({ ...prev, isVideoOff: !prev.isVideoOff }));
        }
    }, [localStream]);

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('call:incoming', (data) => {
            console.log('[CallContext] Incoming call:', data);

            // Play ringtone for incoming call
            playRingtone();

            // Show browser notification if tab is not focused
            if (data.callerInfo) {
                showCallNotification(data.callerInfo, data.type);
            }

            setCallState({
                isInCall: false,
                callType: data.type,
                callId: data.callId,
                caller: null,
                participants: [],
                isMuted: false,
                isVideoOff: false,
                isRinging: true,
                callerInfo: data.callerInfo,
                remoteUserId: data.callerId,
                pendingOffer: data.offer, // Store the SDP offer for later use
            });
        });

        socket.on('call:answer', async (data) => {
            console.log('[CallContext] Call answered, received answer SDP');

            // Stop dial tone and play connected sound when call is answered
            stopDialTone();
            playConnectedSound();

            // Set remote description from the answer
            if (peerConnectionRef.current && data.answer) {
                try {
                    await peerConnectionRef.current.setRemoteDescription(
                        new RTCSessionDescription(data.answer)
                    );
                    console.log('[CallContext] Remote description set successfully');
                } catch (error) {
                    console.error('[CallContext] Failed to set remote description:', error);
                }
            }
        });

        socket.on('call:ice-candidate', async (data) => {
            if (peerConnectionRef.current?.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(data.candidate);
            } else {
                pendingIceCandidates.current.push(data.candidate);
            }
        });

        socket.on('call:ended', () => {
            stopAll();
            closeCallNotification();
            endCall();
        });
        socket.on('call:rejected', () => {
            stopDialTone();
            endCall();
        });

        return () => {
            socket.off('call:incoming');
            socket.off('call:answer');
            socket.off('call:ice-candidate');
            socket.off('call:ended');
            socket.off('call:rejected');
        };
    }, [socket, endCall]);

    return (
        <CallContext.Provider
            value={{
                ...callState,
                initiateCall,
                acceptCall,
                rejectCall,
                endCall,
                toggleMute,
                toggleVideo,
                localStream,
            }}
        >
            {children}
        </CallContext.Provider>
    );
}

export function useCall() {
    const context = useContext(CallContext);
    if (!context) {
        throw new Error('useCall must be used within a CallProvider');
    }
    return context;
}
