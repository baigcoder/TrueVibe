import { motion, AnimatePresence } from 'framer-motion';
import {
    Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
    Copy, LogOut, Volume2, Shield, Trash2, Check, X, UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceRoom } from '@/context/VoiceRoomContext';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useEffect, useRef, useState } from 'react';
import { LiveStage } from './LiveStage';

export interface RoomParticipantProps {
    participant: {
        id: string;
        name: string;
        avatar?: string;
        stream?: MediaStream;
        isMuted: boolean;
        isVideoOff: boolean;
        isScreenSharing: boolean;
    };
    isLocal?: boolean;
    localStream?: MediaStream | null;
    isMuted?: boolean;
    isVideoOff?: boolean;
    onDemote?: () => void;
    isAdmin?: boolean;
    isSpeaker?: boolean;
}

export function RoomParticipant({
    participant, isLocal, localStream, isMuted, isVideoOff,
    onDemote, isAdmin, isSpeaker
}: RoomParticipantProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const stream = isLocal ? localStream : participant.stream;
    const muted = isLocal ? isMuted : participant.isMuted;
    const videoDisabled = isLocal ? isVideoOff : participant.isVideoOff;

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
                "relative rounded-2xl overflow-hidden aspect-video transition-all duration-500",
                participant.isScreenSharing
                    ? "border-primary/50 shadow-[0_0_30px_rgba(129,140,248,0.15)] bg-primary/5"
                    : !muted
                        ? "border-primary/40 bg-primary/5 shadow-[0_0_30px_rgba(129,140,248,0.1)]"
                        : "glass-luxe-light border-white/10 bg-white/5"
            )}
        >
            {stream && !videoDisabled ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 cyber-grid opacity-10" />
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-violet-500/5" />

                    {participant.avatar ? (
                        <div className="relative group/avatar">
                            <motion.div
                                animate={!muted ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute -inset-2 bg-primary/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                            />
                            <img
                                src={participant.avatar}
                                alt={participant.name}
                                className={cn(
                                    "w-20 h-20 rounded-full ring-4 transition-all duration-500 object-cover",
                                    !muted ? "ring-primary shadow-glow-primary scale-105" : "ring-white/10"
                                )}
                            />
                        </div>
                    ) : (
                        <div className={cn(
                            "w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black italic transition-all duration-500",
                            !muted
                                ? "bg-primary text-white shadow-glow-primary scale-105"
                                : "glass-luxe border border-white/10 text-white"
                        )}>
                            {participant.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    )}
                </div>
            )}

            {/* Speaking Pulse */}
            {!muted && (
                <div className="absolute top-3 right-3 z-20">
                    <div className="relative flex items-center justify-center">
                        <motion.div
                            animate={{ scale: [1, 2, 1], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute w-8 h-8 rounded-full bg-primary/30"
                        />
                        <div className="w-4 h-4 rounded-full bg-primary shadow-glow-primary flex items-center justify-center">
                            <Volume2 className="w-2.5 h-2.5 text-white" />
                        </div>
                    </div>
                </div>
            )}

            {/* Name Badge */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-20">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-luxe border border-white/10 group-hover:border-primary/30 transition-colors">
                    <span className="text-[10px] font-black text-white uppercase italic tracking-wider truncate max-w-[80px]">
                        {isLocal ? 'YOU_NODE' : participant.name}
                    </span>
                    {muted && <MicOff className="w-3 h-3 text-rose-500" />}
                </div>

                <div className="flex items-center gap-2">
                    {onDemote && isAdmin && isSpeaker && !isLocal && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDemote();
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
                            title="Demote to listener"
                        >
                            <ArrowDown className="w-3 h-3" />
                        </button>
                    )}
                    {participant.isScreenSharing && (
                        <div className="px-2 py-1 rounded-lg bg-primary/20 border border-primary/30 flex items-center gap-1.5">
                            <Monitor className="w-3 h-3 text-primary" />
                            <span className="text-[9px] font-black text-primary uppercase tracking-widest tech-font">LIVE_RELAY</span>
                        </div>
                    )}
                </div>
            </div>
        </motion.div>
    );
}

// Add ArrowDown to imports if not there
import { ArrowDown } from 'lucide-react';

export function ParticipantsGrid() {
    const { profile } = useAuth();
    const {
        participants,
        localStream,
        screenStream,
        isMuted,
        isVideoOff,
        isScreenSharing,
        isAdmin,
        demoteToListener
    } = useVoiceRoom();

    return (
        <div className="flex-1 min-h-0 flex flex-col p-4">
            {/* Screen Share View */}
            {(isScreenSharing || participants.some(p => p.isScreenSharing)) && (
                <div className="mb-4 h-[60%] min-h-[300px]">
                    <div className="w-full h-full rounded-2xl overflow-hidden bg-black border border-emerald-500/30 shadow-2xl relative">
                        {isScreenSharing && screenStream ? (
                            <video
                                autoPlay
                                playsInline
                                ref={(el) => {
                                    if (el) el.srcObject = screenStream;
                                }}
                                className="w-full h-full object-contain"
                            />
                        ) : (
                            participants.find(p => p.isScreenSharing)?.stream && (
                                <video
                                    autoPlay
                                    playsInline
                                    ref={(el) => {
                                        if (el) {
                                            const sharingParticipant = participants.find(p => p.isScreenSharing);
                                            if (sharingParticipant?.stream) {
                                                el.srcObject = sharingParticipant.stream;
                                            }
                                        }
                                    }}
                                    className="w-full h-full object-contain"
                                />
                            )
                        )}
                        <div className="absolute top-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md flex items-center gap-2 border border-white/10">
                            <Monitor className="w-4 h-4 text-primary" />
                            <span className="text-xs font-bold text-white">Live Screen</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Participant Cards */}
            <div className={cn(
                "grid gap-4 auto-rows-fr",
                participants.length === 0 ? "grid-cols-1" :
                    participants.length <= 1 ? "grid-cols-2" :
                        participants.length <= 3 ? "grid-cols-2" :
                            "grid-cols-3"
            )}>
                {/* Local User */}
                <RoomParticipant
                    participant={{
                        id: profile?._id || '',
                        name: profile?.name || 'You',
                        avatar: profile?.avatar,
                        isMuted,
                        isVideoOff,
                        isScreenSharing,
                    }}
                    isLocal
                    localStream={localStream}
                    isMuted={isMuted}
                    isVideoOff={isVideoOff}
                />

                {/* Remote Participants */}
                {participants.map(participant => (
                    <RoomParticipant
                        key={participant.id}
                        participant={participant}
                        isAdmin={isAdmin}
                        isSpeaker={true}
                        onDemote={() => demoteToListener(participant.id)}
                    />
                ))}
            </div>
        </div>
    );
}

export function VoiceRoomPanel() {
    const {
        isInRoom,
        roomId,
        roomName,
        roomType,
        participants,
        pendingRequests,
        isMuted,
        isVideoOff,
        isScreenSharing,
        isAdmin,
        toggleMute,
        toggleVideo,
        startScreenShare,
        stopScreenShare,
        leaveRoom,
        approveRequest,
        rejectRequest,
        deleteRoom,
        copyInviteLink,
    } = useVoiceRoom();

    const [showRequests, setShowRequests] = useState(false);
    const [copied, setCopied] = useState(false);

    if (!isInRoom || !roomId) return null;

    const handleCopyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        toast.success('Room ID copied!');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDeleteRoom = async () => {
        if (confirm('Are you sure you want to delete this room? All participants will be disconnected.')) {
            await deleteRoom();
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed bottom-6 right-6 w-[440px] glass-luxe border border-primary/20 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden z-50 flex flex-col max-h-[85vh] rounded-[2rem] group"
        >
            {/* Background HUD Accents */}
            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full -mr-32 -mt-32 pointer-events-none group-hover:bg-primary/15 transition-colors duration-700" />
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
            <div className="cyber-scanner opacity-30" />

            {/* Header */}
            <div className="px-6 py-5 border-b border-white/5 bg-black/40 relative z-10">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center relative border border-white/10 overflow-hidden",
                            roomType === 'voice'
                                ? "bg-primary/10 text-primary"
                                : "bg-violet-500/10 text-violet-400"
                        )}>
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                            {roomType === 'voice' ? (
                                <Mic className="w-5 h-5 relative z-10" />
                            ) : (
                                <Video className="w-5 h-5 relative z-10" />
                            )}
                            {isAdmin && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-md flex items-center justify-center border-2 border-[#0B0F17] shadow-lg">
                                    <Shield className="w-2.5 h-2.5 text-black" />
                                </div>
                            )}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-heading font-black text-white italic tracking-tight uppercase">{roomName}</h3>
                                {isAdmin && (
                                    <span className="px-2 py-0.5 text-[8px] font-black bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full tracking-widest">
                                        ADMIN_LINK
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                    <span className="text-[9px] font-black text-primary uppercase tracking-widest tech-font">
                                        {participants.length + 1} SESSIONS_ACTIVE
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {pendingRequests.length > 0 && isAdmin && (
                            <button
                                onClick={() => setShowRequests(!showRequests)}
                                className="relative p-2.5 rounded-xl glass-luxe border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-all active:scale-95"
                                title={`${pendingRequests.length} pending requests`}
                            >
                                <UserPlus className="w-4 h-4" />
                                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-md bg-amber-500 text-[9px] font-black text-black flex items-center justify-center shadow-lg border-2 border-[#0B0F17]">
                                    {pendingRequests.length}
                                </span>
                            </button>
                        )}
                        <button
                            onClick={handleCopyRoomId}
                            className="p-2.5 rounded-xl glass-luxe border border-white/5 text-slate-400 hover:text-white hover:border-white/10 transition-all active:scale-95"
                            title="Copy target ID"
                        >
                            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                {/* HUD Meta Info */}
                <div className="mt-4 flex items-center gap-2">
                    <div className="flex-1 px-4 py-2 bg-black/40 rounded-xl border border-white/5 font-mono text-[10px] text-primary/60 flex items-center gap-2 overflow-hidden">
                        <span className="text-slate-600 font-bold tracking-tight">NODEID:</span>
                        <span className="truncate tracking-widest">{roomId}</span>
                    </div>
                    <button
                        onClick={copyInviteLink}
                        className="px-4 py-2 text-[9px] font-black bg-primary text-white rounded-xl hover:bg-primary/90 transition-all active:scale-95 uppercase tracking-widest shadow-glow-primary"
                    >
                        Share Access
                    </button>
                </div>
            </div>

            {/* Join Requests Overlay */}
            <AnimatePresence>
                {showRequests && pendingRequests.length > 0 && isAdmin && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-b border-amber-500/20 bg-amber-500/5 relative z-20 overflow-hidden"
                    >
                        <div className="absolute inset-0 cyber-grid opacity-5 pointer-events-none" />
                        <div className="p-4">
                            <h4 className="text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] mb-3">
                                INCOMING_JOIN_REQUESTS
                            </h4>
                            <div className="space-y-2 max-h-[150px] overflow-y-auto scrollbar-hide">
                                {pendingRequests.map((request) => (
                                    <div
                                        key={request.userId}
                                        className="flex items-center justify-between p-3 glass-luxe border border-amber-500/10 rounded-xl hover:border-amber-500/30 transition-all"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                {request.avatar ? (
                                                    <img
                                                        src={request.avatar}
                                                        alt={request.name}
                                                        className="w-8 h-8 rounded-lg border border-white/10"
                                                    />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-lg glass-luxe flex items-center justify-center text-[10px] font-black text-amber-500 border border-amber-500/20 uppercase italic">
                                                        {request.name?.charAt(0)}
                                                    </div>
                                                )}
                                                <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border border-black animate-pulse" />
                                            </div>
                                            <span className="text-[11px] font-black text-white uppercase italic tracking-tight">{request.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => approveRequest(request.userId)}
                                                className="w-8 h-8 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 flex items-center justify-center transition-all"
                                                title="Approve Node"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => rejectRequest(request.userId)}
                                                className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 flex items-center justify-center transition-all"
                                                title="Deny Access"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Participants Grid / Live Stage */}
            <div className="p-0 flex-1 min-h-0 relative z-10 scrollbar-hide overflow-y-auto">
                {roomType === 'live' ? (
                    <LiveStage />
                ) : (
                    <ParticipantsGrid />
                )}
            </div>

            {/* HUD Status Bar */}
            <div className="px-6 py-2 bg-black/60 border-t border-white/5 flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(129,140,248,0.8)]" />
                        <span className="text-[8px] font-black text-primary/60 tech-font uppercase tracking-widest italic">STREAM_SYNC:OK</span>
                    </div>
                </div>
                <div className="text-[8px] font-black text-slate-500 tech-font tracking-tighter">
                    VIBE_OS v4.2 // SECURE_RELAY
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="px-6 py-5 bg-[#030712]/80 backdrop-blur-3xl border-t border-white/5 relative z-10">
                <div className="flex items-center justify-center gap-4">
                    {/* Mute Toggle */}
                    <button
                        onClick={toggleMute}
                        className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group overflow-hidden border",
                            isMuted
                                ? "bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"
                                : "bg-white/5 text-white border-white/10 hover:border-primary/40 hover:text-primary"
                        )}
                        title={isMuted ? 'UNMUTE_SENSOR' : 'DAMPEN_INPUT'}
                    >
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br transition-opacity",
                            isMuted ? "from-rose-500/10 to-transparent" : "from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100"
                        )} />
                        {isMuted ? <MicOff className="w-6 h-6 relative z-10" /> : <Mic className="w-6 h-6 relative z-10" />}
                    </button>

                    {/* Video Toggle */}
                    {roomType === 'video' && (
                        <button
                            onClick={toggleVideo}
                            className={cn(
                                "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group overflow-hidden border",
                                isVideoOff
                                    ? "bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20"
                                    : "bg-white/5 text-white border-white/10 hover:border-primary/40 hover:text-primary"
                            )}
                            title={isVideoOff ? 'ACTIVATE_OPTICS' : 'KILL_CAPTURE'}
                        >
                            <div className={cn(
                                "absolute inset-0 bg-gradient-to-br transition-opacity",
                                isVideoOff ? "from-rose-500/10 to-transparent" : "from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100"
                            )} />
                            {isVideoOff ? <VideoOff className="w-6 h-6 relative z-10" /> : <Video className="w-6 h-6 relative z-10" />}
                        </button>
                    )}

                    {/* Screen Share Toggle */}
                    <button
                        onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                        className={cn(
                            "w-14 h-14 rounded-2xl flex items-center justify-center transition-all relative group overflow-hidden border",
                            isScreenSharing
                                ? "bg-primary/10 text-primary border-primary/40 shadow-glow-primary"
                                : "bg-white/5 text-white border-white/10 hover:border-primary/40 hover:text-primary"
                        )}
                        title={isScreenSharing ? 'END_PROJECTION' : 'INIT_SCREEN_RELAY'}
                    >
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-br transition-opacity",
                            isScreenSharing ? "from-primary/10 to-transparent" : "from-primary/5 to-transparent opacity-0 group-hover:opacity-100"
                        )} />
                        {isScreenSharing ? <MonitorOff className="w-6 h-6 relative z-10" /> : <Monitor className="w-6 h-6 relative z-10" />}
                    </button>

                    <div className="w-[1px] h-10 bg-white/5 mx-1" />

                    {/* Delete Room (Admin Only) */}
                    {isAdmin && (
                        <button
                            onClick={handleDeleteRoom}
                            className="w-14 h-14 rounded-2xl bg-amber-500/5 text-amber-500 hover:bg-amber-500/10 border border-amber-500/20 flex items-center justify-center transition-all active:scale-95 group"
                            title="TERMINATE_NODE"
                        >
                            <Trash2 className="w-6 h-6 transition-transform group-hover:scale-110" />
                        </button>
                    )}

                    {/* Leave Room */}
                    <button
                        onClick={leaveRoom}
                        className="w-14 h-14 rounded-2xl bg-rose-500 text-white flex items-center justify-center transition-all hover:bg-rose-400 active:scale-95 shadow-glow-rose group"
                        title="DISCONNECT_LINK"
                    >
                        <LogOut className="w-6 h-6 transition-transform group-hover:translate-x-1" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
}

export default VoiceRoomPanel;

