import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useRingtone } from '@/hooks/useRingtone';
import { useBrowserNotification } from '@/hooks/useBrowserNotification';
import { useRealtime } from './RealtimeContext';

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
    initiateCall: (userId: string, type: 'audio' | 'video', targetUserInfo?: { name?: string; avatar?: string }) => Promise<void>;
    acceptCall: () => Promise<void>;
    rejectCall: () => void;
    endCall: () => void;
    toggleMute: () => void;
    toggleVideo: () => void;
    localStream: MediaStream | null;
}

const CallContext = createContext<CallContextType | null>(null);

export function CallProvider({ children }: { children: React.ReactNode }) {
    const { user, profile } = useAuth();
    const { subscribeToChannel, broadcast, userId: supabaseUserId } = useRealtime();

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

    // ICE servers configuration
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
        } catch (error: any) {
            console.error('Failed to get user media:', error);
            // Show user-friendly error message
            const errorMessage = error.name === 'NotAllowedError'
                ? 'Camera/microphone access denied. Please allow permissions in your browser settings.'
                : error.name === 'NotFoundError'
                    ? 'No camera or microphone found on this device.'
                    : 'Failed to access camera/microphone. Please check your device settings.';

            // Import toast dynamically to avoid circular deps
            import('sonner').then(({ toast }) => {
                toast.error(errorMessage);
            });
            return null;
        }
    }, []);

    // End call function (defined early for use in createPeerConnection)
    const endCallCleanup = useCallback(() => {
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
    }, [localStream]);

    // Create peer connection
    const createPeerConnection = useCallback((remoteUserId: string | null, callId: string | null) => {
        const pc = new RTCPeerConnection(iceServers);

        pc.onicecandidate = (event) => {
            if (event.candidate && remoteUserId) {
                console.log('[CallContext] Sending ICE candidate via Supabase');
                // Broadcast ICE candidate to the remote user's channel
                broadcast(`user:${remoteUserId}`, 'call:ice-candidate', {
                    callId,
                    candidate: event.candidate,
                    senderId: user?.id,
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
                console.warn('[CallContext] Connection failed, ending call.');
                endCallCleanup();
            } else if (pc.connectionState === 'disconnected') {
                setTimeout(() => {
                    if (pc.connectionState === 'disconnected') endCallCleanup();
                }, 5000);
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[CallContext] ICE Connection State:', pc.iceConnectionState);
        };

        peerConnectionRef.current = pc;
        return pc;
    }, [broadcast, user?.id, endCallCleanup]);

    // Initiate a call
    const initiateCall = useCallback(async (targetUserId: string, type: 'audio' | 'video', targetUserInfo?: { name?: string; avatar?: string }) => {
        const stream = await getUserMedia(type);
        if (!stream) return;

        const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Create peer connection first to generate offer
        const pc = createPeerConnection(targetUserId, callId);
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
                { id: targetUserId, name: targetUserInfo?.name || 'Calling...', avatar: targetUserInfo?.avatar },
            ],
            isMuted: false,
            isVideoOff: type === 'audio',
            isRinging: false,
            callerInfo: null,
            remoteUserId: targetUserId,
            pendingOffer: null,
        });

        // Play dial tone for outgoing call
        playDialTone();

        // Broadcast call initiation to target user's channel via Supabase
        console.log('[CallContext] Initiating call via Supabase to user:', targetUserId);
        broadcast(`user:${targetUserId}`, 'call:incoming', {
            callId,
            callerId: user?.id,
            type,
            offer: pc.localDescription,
            callerInfo: {
                id: user?.id,
                name: profile?.name,
                avatar: profile?.avatar,
            },
        });
    }, [user, profile, getUserMedia, createPeerConnection, playDialTone, broadcast]);

    // Accept incoming call
    const acceptCall = useCallback(async () => {
        if (!callState.callId || !callState.callType || !callState.pendingOffer) {
            console.error('[CallContext] Cannot accept call: missing required data');
            return;
        }

        const stream = await getUserMedia(callState.callType);
        if (!stream) return;

        // Stop ringtone immediately
        stopRingtone();
        closeCallNotification();

        // Create peer connection with remote user ID for ICE candidate routing
        const pc = createPeerConnection(callState.remoteUserId, callState.callId);
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

        // Send answer back to caller via Supabase
        console.log('[CallContext] Sending answer via Supabase to:', callState.remoteUserId);
        if (callState.remoteUserId) {
            broadcast(`user:${callState.remoteUserId}`, 'call:answer', {
                callId: callState.callId,
                answer: pc.localDescription,
                answererId: user?.id,
                // Include answerer info so caller can update UI
                answererInfo: {
                    id: user?.id,
                    name: profile?.name,
                    avatar: profile?.avatar,
                },
            });
        }
    }, [callState.callId, callState.callType, callState.pendingOffer, callState.remoteUserId, user, profile, getUserMedia, createPeerConnection, stopRingtone, closeCallNotification, playConnectedSound, broadcast]);

    // Reject incoming call
    const rejectCall = useCallback(() => {
        // Stop ringtone and close notification
        stopRingtone();
        closeCallNotification();

        if (callState.callId && callState.remoteUserId) {
            broadcast(`user:${callState.remoteUserId}`, 'call:rejected', {
                callId: callState.callId,
                rejecterId: user?.id,
            });
        }
        endCallCleanup();
    }, [callState.callId, callState.remoteUserId, stopRingtone, closeCallNotification, broadcast, user?.id, endCallCleanup]);

    // End call
    const endCall = useCallback(() => {
        // Stop all sounds and play ended sound
        stopAll();
        playEndedSound();
        closeCallNotification();

        if (callState.callId && callState.remoteUserId) {
            broadcast(`user:${callState.remoteUserId}`, 'call:ended', {
                callId: callState.callId,
                enderId: user?.id,
            });
        }

        endCallCleanup();
    }, [callState.callId, callState.remoteUserId, stopAll, playEndedSound, closeCallNotification, broadcast, user?.id, endCallCleanup]);

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

    // Subscribe to user's channel for incoming calls via Supabase Realtime
    useEffect(() => {
        if (!supabaseUserId) return;

        const channelName = `user:${supabaseUserId}`;
        console.log('[CallContext] Subscribing to call events on channel:', channelName);

        const channel = subscribeToChannel(channelName);

        // Incoming call
        channel.on('broadcast', { event: 'call:incoming' }, ({ payload }) => {
            console.log('[CallContext] Incoming call via Supabase:', payload);
            const data = payload as any;

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
                pendingOffer: data.offer,
            });
        });

        // Call answered
        channel.on('broadcast', { event: 'call:answer' }, async ({ payload }) => {
            console.log('[CallContext] Call answered via Supabase:', payload);
            const data = payload as any;

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

                    // UPDATE CALLER STATE: Mark call as connected (no longer ringing/calling)
                    setCallState((prev) => ({
                        ...prev,
                        isInCall: true,
                        isRinging: false,
                        // Update participant name from "Calling..." to actual name if available
                        participants: prev.participants.map((p, idx) =>
                            idx === 1 && data.answererInfo
                                ? { ...p, name: data.answererInfo.name || p.name, avatar: data.answererInfo.avatar || p.avatar }
                                : p
                        ),
                    }));
                } catch (error) {
                    console.error('[CallContext] Failed to set remote description:', error);
                }
            }
        });

        // ICE candidate received
        channel.on('broadcast', { event: 'call:ice-candidate' }, async ({ payload }) => {
            const data = payload as any;
            console.log('[CallContext] ICE candidate received via Supabase');

            if (peerConnectionRef.current?.remoteDescription) {
                await peerConnectionRef.current.addIceCandidate(data.candidate);
            } else {
                pendingIceCandidates.current.push(data.candidate);
            }
        });

        // Call ended by remote
        channel.on('broadcast', { event: 'call:ended' }, () => {
            console.log('[CallContext] Call ended by remote via Supabase');
            stopAll();
            closeCallNotification();
            endCallCleanup();
        });

        // Call rejected
        channel.on('broadcast', { event: 'call:rejected' }, () => {
            console.log('[CallContext] Call rejected via Supabase');
            stopDialTone();
            endCallCleanup();
        });

        // Don't unsubscribe from user channel as it's needed for presence
        return () => {
            // Channel cleanup handled by RealtimeContext
        };
    }, [supabaseUserId, subscribeToChannel, playRingtone, showCallNotification, stopDialTone, playConnectedSound, stopAll, closeCallNotification, endCallCleanup]);

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
