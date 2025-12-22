import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mic, Video, Link2, Loader2, Shield, ShieldCheck, Copy, Check, Fingerprint, Activity, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useVoiceRoom } from '@/context/VoiceRoomContext';
import { toast } from 'sonner';

interface CreateRoomModalProps {
    isOpen: boolean;
    onClose: () => void;
    onRoomCreated: (roomId: string) => void;
}

export function CreateRoomModal({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) {
    const { createRoom, isConnecting } = useVoiceRoom();
    const [roomName, setRoomName] = useState('');
    const [roomType, setRoomType] = useState<'voice' | 'video'>('voice');
    const [requireApproval, setRequireApproval] = useState(true);
    const [createdRoomId, setCreatedRoomId] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleCreate = async () => {
        if (!roomName.trim()) {
            toast.error('Please enter a room name');
            return;
        }

        const roomId = await createRoom(roomName.trim(), roomType, requireApproval);
        if (roomId) {
            onRoomCreated(roomId);
            onClose(); // Automatically close on success as planned
        }
    };

    const handleCopyId = () => {
        if (createdRoomId) {
            navigator.clipboard.writeText(createdRoomId);
            setCopied(true);
            toast.success('Room ID copied!');
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleCopyLink = () => {
        if (createdRoomId) {
            const link = `${window.location.origin}/chat?room=${createdRoomId}`;
            navigator.clipboard.writeText(link);
            toast.success('Invite link copied!');
        }
    };

    const handleClose = () => {
        setCreatedRoomId(null);
        setRoomName('');
        setCopied(false);
        onClose();
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
                                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between relative z-10 font-sans">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl glass-luxe-light flex items-center justify-center border border-white/10">
                                            <Sparkles className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-white">
                                                {createdRoomId ? 'Node Ready' : 'Create Room'}
                                            </h2>
                                            <p className="text-[9px] text-slate-500 font-medium uppercase tracking-wider">
                                                {createdRoomId ? 'Room created successfully' : 'Set up voice or video room'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClose}
                                        className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/10 transition-all"
                                    >
                                        <X className="w-4 h-4 text-slate-500 hover:text-white" />
                                    </button>
                                </div>

                                {/* Content */}
                                <div className="p-5 relative z-10">
                                    {createdRoomId ? (
                                        <div className="space-y-4">
                                            {/* Room ID Display */}
                                            <div className="p-4 glass-luxe-light rounded-xl border border-white/10">
                                                <div className="flex items-center justify-between mb-2">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                                        Room ID
                                                    </label>
                                                    <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[8px] text-primary font-bold">SECURE</span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <code className="flex-1 px-4 py-3 bg-black/40 rounded-lg border border-white/5 text-primary font-mono text-sm">
                                                        {createdRoomId}
                                                    </code>
                                                    <button
                                                        onClick={handleCopyId}
                                                        className="w-10 h-10 rounded-lg bg-primary text-white hover:bg-primary/90 transition-all flex items-center justify-center"
                                                    >
                                                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Invite Link */}
                                            <button
                                                onClick={handleCopyLink}
                                                className="w-full flex items-center justify-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-all font-medium text-sm"
                                            >
                                                <Link2 className="w-4 h-4 text-primary" />
                                                Copy Invite Link
                                            </button>

                                            {/* Info */}
                                            <div className="flex items-center gap-3 p-3 glass-luxe-light rounded-lg border border-white/5">
                                                <ShieldCheck className="w-4 h-4 text-primary/60 flex-shrink-0" />
                                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                                    {requireApproval ? 'Approval required for participants.' : 'Direct entry enabled.'}
                                                </p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Room Name */}
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">
                                                        Room Name
                                                    </label>
                                                    <span className="text-[8px] text-slate-700">{roomName.length}/50</span>
                                                </div>
                                                <div className="relative">
                                                    <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                                                    <input
                                                        type="text"
                                                        value={roomName}
                                                        onChange={(e) => setRoomName(e.target.value)}
                                                        placeholder="Enter room name..."
                                                        maxLength={50}
                                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/40 text-sm"
                                                    />
                                                </div>
                                            </div>

                                            {/* Room Type */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1 block">
                                                    Room Type
                                                </label>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button
                                                        onClick={() => setRoomType('voice')}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                                            roomType === 'voice'
                                                                ? "glass-luxe border-primary/40 text-primary"
                                                                : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                                                        )}
                                                    >
                                                        <Mic className="w-5 h-5" />
                                                        <span className="font-medium text-xs">Voice</span>
                                                    </button>
                                                    <button
                                                        onClick={() => setRoomType('video')}
                                                        className={cn(
                                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-all",
                                                            roomType === 'video'
                                                                ? "glass-luxe border-violet-500/40 text-violet-400"
                                                                : "bg-white/5 border-white/5 text-slate-500 hover:bg-white/10"
                                                        )}
                                                    >
                                                        <Video className="w-5 h-5" />
                                                        <span className="font-medium text-xs">Video</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Require Approval Toggle */}
                                            <div className="space-y-2">
                                                <label className="text-[9px] text-slate-500 font-bold uppercase tracking-wider px-1 block">
                                                    Security
                                                </label>
                                                <button
                                                    onClick={() => setRequireApproval(!requireApproval)}
                                                    className={cn(
                                                        "w-full flex items-center justify-between p-3 rounded-xl border transition-all",
                                                        requireApproval ? "glass-luxe border-primary/20" : "glass-luxe border-violet-500/20"
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            "w-8 h-8 rounded-lg flex items-center justify-center border",
                                                            requireApproval ? "bg-primary/10 border-primary/30 text-primary" : "bg-violet-500/10 border-violet-500/30 text-violet-400"
                                                        )}>
                                                            {requireApproval ? <Shield className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                                                        </div>
                                                        <div className="text-left">
                                                            <span className={cn(
                                                                "font-medium text-xs block",
                                                                requireApproval ? "text-primary" : "text-violet-400"
                                                            )}>
                                                                {requireApproval ? 'Require Approval' : 'Open Access'}
                                                            </span>
                                                            <span className="text-[9px] text-slate-500 block">
                                                                {requireApproval ? 'Must approve each join' : 'Anyone can join directly'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className={cn(
                                                        "w-10 h-5 rounded-full p-0.5 transition-all",
                                                        requireApproval ? "bg-primary/30" : "bg-violet-500/30"
                                                    )}>
                                                        <motion.div
                                                            animate={{ x: requireApproval ? 20 : 0 }}
                                                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                            className={cn(
                                                                "w-4 h-4 rounded-full",
                                                                requireApproval ? "bg-primary" : "bg-violet-400"
                                                            )}
                                                        />
                                                    </div>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Footer */}
                                <div className="px-5 py-4 glass-luxe-light border-t border-white/5 flex justify-end gap-3 relative z-10">
                                    {createdRoomId ? (
                                        <button
                                            onClick={handleClose}
                                            className="h-10 px-6 rounded-lg text-xs font-medium text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                                        >
                                            Close
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={handleClose}
                                                className="h-10 px-5 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleCreate}
                                                disabled={!roomName.trim() || isConnecting}
                                                className="h-10 px-6 rounded-lg text-xs font-medium text-white bg-primary hover:bg-primary/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                                            >
                                                {isConnecting ? (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Creating...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Activity className="w-3 h-3" />
                                                        Create Room
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}

export default CreateRoomModal;
