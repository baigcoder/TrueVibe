import { useCall } from "@/context/CallContext";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Sparkles, Settings, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";

export function CallOverlay() {
    const {
        isInCall, callType, callerInfo, isRinging,
        acceptCall, rejectCall, endCall,
        isMuted, isVideoOff, toggleMute, toggleVideo,
        participants, localStream
    } = useCall();

    const localVideoRef = useRef<HTMLVideoElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (localVideoRef.current && localStream) {
            localVideoRef.current.srcObject = localStream;
        }
    }, [localStream]);

    useEffect(() => {
        const remoteStream = participants.find(p => p.stream && p.id !== participants[0]?.id)?.stream ||
            participants.find(p => p.stream)?.stream;
        if (remoteVideoRef.current && remoteStream) {
            remoteVideoRef.current.srcObject = remoteStream;
        }
    }, [participants]);

    if (!isInCall && !isRinging) return null;

    const remoteParticipant = participants.find(p => p.id !== participants[0]?.id) || callerInfo;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[1000] bg-black/80 backdrop-blur-2xl flex items-center justify-center p-4 md:p-8"
            >
                {/* Background Aura */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1],
                            x: [0, 50, 0],
                            y: [0, -50, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -top-1/4 -right-1/4 w-[80%] h-[80%] bg-primary/20 blur-[120px] rounded-full"
                    />
                    <motion.div
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.1, 0.15, 0.1],
                            x: [0, -30, 0],
                            y: [0, 40, 0]
                        }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute -bottom-1/4 -left-1/4 w-[70%] h-[70%] bg-secondary/20 blur-[100px] rounded-full"
                    />
                </div>

                {/* Ringing State */}
                {isRinging && !isInCall && (
                    <motion.div
                        initial={{ scale: 0.8, y: 40, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.8, y: 40, opacity: 0 }}
                        className="relative z-10 glass-panel p-10 md:p-14 rounded-[3.5rem] border border-white/10 text-center max-w-md w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden"
                    >
                        {/* Animated Glow behind Avatar */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-40 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                        <div className="relative mb-10 flex justify-center">
                            {/* Sonar Pulse Layers */}
                            {[1, 2, 3].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 1, opacity: 0.5 }}
                                    animate={{ scale: 2.2, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 2.5, delay: i * 0.6, ease: "easeOut" }}
                                    className="absolute inset-0 bg-primary/30 rounded-[2.5rem] blur-xl"
                                />
                            ))}

                            <motion.div
                                animate={{ y: [0, -8, 0] }}
                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                className="relative z-10 p-1 bg-gradient-to-br from-primary/50 to-secondary/50 rounded-[2.8rem] shadow-2xl"
                            >
                                <Avatar className="w-28 h-28 border-4 border-[#030712] rounded-[2.5rem] shadow-inner">
                                    <AvatarImage src={remoteParticipant?.avatar} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-black bg-slate-900 text-primary">
                                        {remoteParticipant?.name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 rounded-2xl border-4 border-[#030712] flex items-center justify-center shadow-lg">
                                    <motion.div
                                        animate={{ scale: [1, 1.2, 1] }}
                                        transition={{ repeat: Infinity, duration: 2 }}
                                        className="w-2 h-2 bg-white rounded-full"
                                    />
                                </div>
                            </motion.div>
                        </div>

                        <div className="space-y-1 mb-12">
                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-3xl font-black text-white italic uppercase tracking-tighter"
                            >
                                {callType === 'video' ? 'Video Invitation' : 'Voice Invitation'}
                            </motion.h2>
                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]"
                            >
                                {remoteParticipant?.name || 'Unknown User'} is calling you
                            </motion.p>
                        </div>

                        <div className="flex gap-5">
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                                <Button
                                    onClick={rejectCall}
                                    className="w-full h-16 rounded-2xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/30 text-rose-500 hover:text-white font-black uppercase italic tracking-widest transition-all duration-300 shadow-lg shadow-rose-500/10"
                                >
                                    <PhoneOff className="w-5 h-5 mr-3" />
                                    Reject
                                </Button>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="flex-1">
                                <Button
                                    onClick={acceptCall}
                                    className="w-full h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-black uppercase italic tracking-widest text-white shadow-xl shadow-emerald-500/30 border border-emerald-400/30"
                                >
                                    {callType === 'video' ? <Video className="w-5 h-5 mr-3" /> : <Phone className="w-5 h-5 mr-3" />}
                                    Accept
                                </Button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {/* Active Call State */}
                {isInCall && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full h-full max-w-6xl aspect-video bg-black/60 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_48px_100px_-24px_rgba(0,0,0,0.8)] flex flex-col group"
                    >
                        {/* Status bar */}
                        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20 pointer-events-none">
                            <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                <span className="text-[10px] font-black text-white italic tracking-widest uppercase">
                                    LIVE SESSION • {callType === 'video' ? 'ENCRYPTED_VISUAL' : 'ENCRYPTED_AUDIO'}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-primary/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-primary/20 text-primary text-[10px] font-black italic uppercase">
                                <Sparkles className="w-3 h-3" />
                                Premium Link Active
                            </div>
                        </div>

                        {/* Video Streams */}
                        <div className="flex-1 relative bg-slate-900/40">
                            {/* Remote Video (Main) */}
                            {callType === 'video' ? (
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                                    {/* Blurred Dynamic Background for Audio Call */}
                                    <div className="absolute inset-0 flex items-center justify-center opacity-30 blur-[100px] scale-150">
                                        <Avatar className="w-full h-full">
                                            <AvatarImage src={remoteParticipant?.avatar} />
                                        </Avatar>
                                    </div>

                                    <div className="relative z-10 text-center">
                                        <div className="relative mb-8">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.15, 1],
                                                    opacity: [0.2, 0.4, 0.2]
                                                }}
                                                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                                                className="absolute inset-[-20px] bg-primary/20 blur-2xl rounded-full"
                                            />
                                            <Avatar className="w-40 h-40 border-8 border-white/5 rounded-[3rem] shadow-2xl relative">
                                                <AvatarImage src={remoteParticipant?.avatar} className="object-cover" />
                                                <AvatarFallback className="text-5xl font-black bg-primary text-white">
                                                    {remoteParticipant?.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-4">{remoteParticipant?.name}</h3>
                                        <div className="flex gap-1.5 justify-center items-center">
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [8, 24, 8] }}
                                                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.15 }}
                                                    className="w-1 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Local Video (PiP) */}
                            {callType === 'video' && (
                                <motion.div
                                    drag
                                    dragConstraints={{ left: 20, right: 20, top: 20, bottom: 20 }}
                                    className="absolute bottom-8 right-8 w-56 aspect-video bg-black/40 backdrop-blur-xl rounded-[2rem] border border-white/20 overflow-hidden shadow-2xl cursor-move active:scale-95 transition-all hover:border-primary/50 group/pip"
                                >
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
                                    />
                                    {isVideoOff && (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900/60">
                                            <Avatar className="w-12 h-12">
                                                <AvatarFallback className="bg-primary/20 text-primary font-bold">You</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg border border-white/5 opacity-0 group-hover/pip:opacity-100 transition-opacity">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <span className="text-[8px] font-bold text-white uppercase tracking-tighter">ME</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Controls Panel */}
                        <div className="relative h-28 flex items-center justify-center gap-8 bg-gradient-to-t from-black/80 to-black/20 backdrop-blur-xl border-t border-white/5 px-10">
                            {/* Hover overlay hint */}
                            <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/60 backdrop-blur-md rounded-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none translate-y-2 group-hover:translate-y-0">
                                <span className="text-[10px] font-black text-white/50 italic tracking-[0.2em] uppercase">Session Control Node</span>
                            </div>

                            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-3xl border border-white/5">
                                <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleMute}
                                        className={cn(
                                            "w-14 h-14 rounded-2xl border transition-all duration-300",
                                            isMuted
                                                ? "bg-rose-500/20 border-rose-500/30 text-rose-500"
                                                : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                                        )}
                                    >
                                        {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                                    </Button>
                                </motion.div>

                                {callType === 'video' && (
                                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleVideo}
                                            className={cn(
                                                "w-14 h-14 rounded-2xl border transition-all duration-300",
                                                isVideoOff
                                                    ? "bg-rose-500/20 border-rose-500/30 text-rose-500"
                                                    : "bg-white/5 border-white/10 text-slate-300 hover:text-white"
                                            )}
                                        >
                                            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                        </Button>
                                    </motion.div>
                                )}
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.05, rotate: 10 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Button
                                    onClick={endCall}
                                    className="w-24 h-16 rounded-[1.5rem] bg-rose-500 hover:bg-rose-600 text-white shadow-[0_12px_24px_-8px_rgba(244,63,94,0.4)] border-2 border-white/20"
                                >
                                    <PhoneOff className="w-8 h-8" />
                                </Button>
                            </motion.div>

                            <div className="flex gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <Settings className="w-5 h-5" />
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.1, rotate: -5 }}
                                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                >
                                    <Share2 className="w-5 h-5" />
                                </motion.button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
