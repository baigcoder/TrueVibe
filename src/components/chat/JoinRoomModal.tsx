import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Clock, Key, Fingerprint, Activity, ShieldAlert, Sparkles } from 'lucide-react';
import { useVoiceRoom } from '@/context/VoiceRoomContext';
import { toast } from 'sonner';

interface JoinRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialRoomId?: string;
}

export function JoinRoomModal({ isOpen, onClose, initialRoomId = '' }: JoinRoomModalProps) {
    const { joinRoom, requestToJoin, isConnecting, waitingForApproval } = useVoiceRoom();
    const [roomId, setRoomId] = useState(initialRoomId);

    const handleJoin = async () => {
        if (!roomId.trim()) {
            toast.error('Please enter a room ID');
            return;
        }

        const joined = await joinRoom(roomId.trim());

        if (joined) {
            onClose();
            setRoomId('');
        } else {
            const requested = await requestToJoin(roomId.trim());
            if (requested) {
                // Stay in modal showing waiting state
            }
        }
    };

    const handleClose = () => {
        if (!waitingForApproval) {
            setRoomId('');
            onClose();
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[9999]"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 flex items-center justify-center z-[10000] p-4"
                    >
                        <div className="w-full max-w-lg">
                            <div className="glass-luxe border border-white/10 rounded-3xl shadow-[0_32px_128px_rgba(0,0,0,0.8)] relative overflow-hidden group">
                                {/* Decorative Aura */}
                                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full -mr-40 -mt-40 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 blur-[100px] rounded-full -ml-40 -mb-40 pointer-events-none" />

                                {/* Header */}
                                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between relative z-10 font-sans">
                                    <div className="flex items-center gap-5">
                                        <div className="w-14 h-14 rounded-2xl glass-luxe-light flex items-center justify-center border border-white/10 shadow-xl">
                                            {waitingForApproval ? (
                                                <Clock className="w-7 h-7 text-primary animate-pulse" />
                                            ) : (
                                                <Fingerprint className="w-7 h-7 text-primary animate-pulse" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-3xl font-bold text-white tracking-tight">
                                                {waitingForApproval ? 'Auth Pending' : 'Join Node'}
                                            </h2>
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">
                                                {waitingForApproval
                                                    ? 'Awaiting operator verification'
                                                    : 'Enter bridge identifier to sync'}
                                            </p>
                                        </div>
                                    </div>
                                    {!waitingForApproval && (
                                        <button
                                            onClick={handleClose}
                                            className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all group"
                                        >
                                            <X className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-10 relative z-10">
                                    {waitingForApproval ? (
                                        <div className="text-center py-12">
                                            <div className="relative w-32 h-32 mx-auto mb-10">
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-0 rounded-full border-2 border-primary/10 border-t-primary shadow-[0_0_40px_rgba(129,140,248,0.2)]"
                                                />
                                                <motion.div
                                                    animate={{ rotate: -360 }}
                                                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                                                    className="absolute inset-4 rounded-full border-2 border-white/5 border-b-primary/40"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <ShieldAlert className="w-10 h-10 text-primary animate-pulse" />
                                                </div>
                                            </div>

                                            <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">
                                                Verification in Progress
                                            </h3>
                                            <p className="text-[11px] text-slate-400 mb-10 uppercase tracking-widest leading-relaxed max-w-[280px] mx-auto">
                                                Your signal request has been encrypted and sent to the node operator.
                                            </p>

                                            <button
                                                onClick={() => {
                                                    setRoomId('');
                                                    onClose();
                                                }}
                                                className="h-16 px-10 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] text-violet-400 hover:text-white hover:bg-violet-500/10 border border-violet-500/20 transition-all"
                                            >
                                                Cancel Request
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-10">
                                            {/* Room ID Input */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-2">
                                                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em]">
                                                        Identifier
                                                    </label>
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] text-primary font-bold uppercase">REQUIRED</span>
                                                </div>
                                                <div className="relative group">
                                                    <Key className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-focus-within:text-primary transition-colors" />
                                                    <input
                                                        type="text"
                                                        value={roomId}
                                                        onChange={(e) => setRoomId(e.target.value)}
                                                        placeholder="Enter node ID..."
                                                        className="w-full pl-14 pr-8 py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-slate-700 focus:outline-none focus:border-primary/40 focus:ring-0 transition-all font-medium text-base tracking-[0.1em] uppercase shadow-inner"
                                                    />
                                                </div>
                                            </div>

                                            {/* Info */}
                                            <div className="flex items-start gap-4 p-6 glass-luxe-light rounded-2xl border border-white/5">
                                                <Activity className="w-5 h-5 text-primary/60 flex-shrink-0 mt-0.5" />
                                                <p className="text-[11px] text-slate-400 leading-relaxed uppercase tracking-tighter">
                                                    Some nodes may require a manual verification protocol before the sync can be completed.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                {!waitingForApproval && (
                                    <div className="px-10 py-8 glass-luxe-light border-t border-white/5 flex justify-end gap-5 relative z-10">
                                        <button
                                            onClick={handleClose}
                                            className="h-16 px-8 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] text-slate-500 hover:text-white hover:bg-white/5 transition-all"
                                        >
                                            Abort
                                        </button>
                                        <button
                                            onClick={handleJoin}
                                            disabled={!roomId.trim() || isConnecting}
                                            className="h-16 px-12 rounded-2xl text-xs font-bold uppercase tracking-[0.3em] text-white bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_16px_48px_rgba(129,140,248,0.3)] transition-all flex items-center gap-4 group"
                                        >
                                            {isConnecting ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Syncing...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4 group-hover:scale-110 transition-transform" />
                                                    Execute Sync
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )
            }
        </AnimatePresence >
    );
}

export default JoinRoomModal;
