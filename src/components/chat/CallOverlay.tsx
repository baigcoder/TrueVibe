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
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        className="relative z-10 glass-premium p-10 md:p-14 rounded-[3rem] border border-white/10 text-center max-w-md w-full shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] overflow-hidden"
                    >
                        <div className="relative mb-10 flex justify-center">
                            {/* Organic Pulse Layers */}
                            {[1, 2].map((i) => (
                                <motion.div
                                    key={i}
                                    initial={{ scale: 1, opacity: 0.4 }}
                                    animate={{ scale: 2, opacity: 0 }}
                                    transition={{ repeat: Infinity, duration: 3, delay: i * 1, ease: "easeOut" }}
                                    className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                                />
                            ))}

                            <motion.div
                                animate={{ y: [0, -6, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="relative z-10 p-1 bg-gradient-to-br from-primary/30 to-accent/30 rounded-[2.5rem] shadow-2xl"
                            >
                                <Avatar className="w-28 h-28 border-2 border-white/10 rounded-[2.2rem]">
                                    <AvatarImage src={remoteParticipant?.avatar} className="object-cover" />
                                    <AvatarFallback className="text-3xl font-bold bg-slate-900 text-primary premium-font">
                                        {remoteParticipant?.name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-[#030712] shadow-lg shadow-emerald-500/20" />
                            </motion.div>
                        </div>

                        <div className="space-y-2 mb-12">
                            <h2 className="text-3xl font-bold text-white tracking-tight premium-font">
                                {callType === 'video' ? 'Video Call' : 'Voice Call'}
                            </h2>
                            <p className="text-slate-400 font-medium text-sm tracking-wide">
                                {remoteParticipant?.name || 'Incoming Call'} is calling you
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <Button
                                onClick={rejectCall}
                                className="flex-1 h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white font-bold transition-all shadow-lg shadow-rose-500/5 premium-font"
                            >
                                <PhoneOff className="w-5 h-5 mr-2" />
                                Reject
                            </Button>
                            <Button
                                onClick={acceptCall}
                                className="flex-1 h-14 rounded-2xl bg-emerald-500 hover:bg-emerald-600 font-bold text-white shadow-xl shadow-emerald-500/20 premium-font"
                            >
                                {callType === 'video' ? <Video className="w-5 h-5 mr-2" /> : <Phone className="w-5 h-5 mr-2" />}
                                Accept
                            </Button>
                        </div>
                    </motion.div>
                )}

                {/* Active Call State */}
                {isInCall && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative w-full h-full max-w-6xl aspect-video bg-black/60 rounded-[3rem] border border-white/10 overflow-hidden shadow-[0_48px_100px_-24px_rgba(0,0,0,0.8)] group"
                    >
                        <div className="absolute top-8 left-8 right-8 flex items-center justify-between z-20 pointer-events-none">
                            <div className="flex items-center gap-3 bg-black/50 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-white/10 shadow-xl">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                                <span className="text-[11px] font-bold text-white tracking-wider uppercase premium-font">
                                    Live Session • Secure Connection
                                </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-2 bg-primary/10 backdrop-blur-xl px-4 py-2.5 rounded-2xl border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest premium-font shadow-xl">
                                <Sparkles className="w-3.5 h-3.5" />
                                Premium Link
                            </div>
                        </div>

                        {/* Video Streams */}
                        <div className="absolute inset-0 z-0 bg-slate-900/40">
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
                                    {/* Premium Dynamic Aura for Audio Call */}
                                    <div className="absolute inset-0 opacity-20 blur-[120px] scale-150 pointer-events-none">
                                        <div className="absolute inset-0 bg-gradient-to-tr from-primary to-accent opacity-30" />
                                    </div>

                                    <div className="relative z-10 text-center mt-[-2rem]">
                                        <div className="relative mb-10 flex justify-center">
                                            <motion.div
                                                animate={{
                                                    scale: [1, 1.2, 1],
                                                    opacity: [0.1, 0.3, 0.1]
                                                }}
                                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
                                                className="absolute inset-[-40px] bg-primary/20 blur-3xl rounded-full"
                                            />
                                            <Avatar className="w-44 h-44 border-4 border-white/10 rounded-[4rem] shadow-3xl relative transition-transform hover:scale-105 duration-700">
                                                <AvatarImage src={remoteParticipant?.avatar} className="object-cover" />
                                                <AvatarFallback className="text-6xl font-black bg-slate-900 text-primary premium-font">
                                                    {remoteParticipant?.name?.charAt(0)}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                        <h3 className="text-4xl font-bold text-white tracking-tight mb-6 premium-font">
                                            {remoteParticipant?.name}
                                        </h3>
                                        <div className="flex gap-2 justify-center items-center h-12">
                                            {[1, 2, 3, 4, 5, 6, 7].map(i => (
                                                <motion.div
                                                    key={i}
                                                    animate={{ height: [12, 40, 12] }}
                                                    transition={{
                                                        repeat: Infinity,
                                                        duration: 1.2,
                                                        delay: i * 0.1,
                                                        ease: "easeInOut"
                                                    }}
                                                    className="w-1.5 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]"
                                                />
                                            ))}
                                        </div>
                                        <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-[10px] mt-8 premium-font">
                                            Voice Broadcast Active
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Local Video (PiP) */}
                            {callType === 'video' && (
                                <motion.div
                                    drag
                                    dragConstraints={{ left: 20, right: 20, top: 20, bottom: 20 }}
                                    className="absolute bottom-8 right-8 w-48 sm:w-64 aspect-video bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl cursor-move active:scale-95 transition-all hover:border-primary/50 group/pip"
                                >
                                    <video
                                        ref={localVideoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className={cn("w-full h-full object-cover", isVideoOff && "hidden")}
                                    />
                                    {isVideoOff && (
                                        <div className="w-full h-full flex items-center justify-center bg-slate-900/40">
                                            <Avatar className="w-12 h-12 border border-white/10">
                                                <AvatarFallback className="bg-primary/20 text-primary font-bold premium-font">You</AvatarFallback>
                                            </Avatar>
                                        </div>
                                    )}
                                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 backdrop-blur-lg px-2 py-1 rounded-lg border border-white/5 opacity-0 group-hover/pip:opacity-100 transition-opacity">
                                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                        <span className="text-[9px] font-bold text-white uppercase tracking-wider premium-font">Me</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* Controls Panel */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-6 sm:gap-10 bg-black/40 backdrop-blur-3xl px-10 py-5 rounded-[2.5rem] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all hover:bg-black/50 hover:border-white/20">
                            <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/5 backdrop-blur-2xl">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={toggleMute}
                                        className={cn(
                                            "w-12 h-12 rounded-xl transition-all duration-300",
                                            isMuted
                                                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                                : "glass-premium text-slate-300 hover:text-white"
                                        )}
                                    >
                                        {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                                    </Button>
                                </motion.div>

                                {callType === 'video' && (
                                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={toggleVideo}
                                            className={cn(
                                                "w-12 h-12 rounded-xl transition-all duration-300",
                                                isVideoOff
                                                    ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                                                    : "glass-premium text-slate-300 hover:text-white"
                                            )}
                                        >
                                            {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                                        </Button>
                                    </motion.div>
                                )}
                            </div>

                            <motion.div
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.9 }}
                            >
                                <Button
                                    onClick={endCall}
                                    className="w-20 h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white shadow-xl shadow-rose-500/30 transition-all flex items-center justify-center"
                                >
                                    <PhoneOff className="w-7 h-7" />
                                </Button>
                            </motion.div>

                            <div className="hidden sm:flex items-center gap-4">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-12 h-12 rounded-xl glass-premium text-slate-400 hover:text-white transition-all"
                                >
                                    <Settings className="w-5 h-5" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="w-12 h-12 rounded-xl glass-premium text-slate-400 hover:text-white transition-all"
                                >
                                    <Share2 className="w-5 h-5" />
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
