import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, ShieldOff } from 'lucide-react';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface BlockUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    userName: string;
    userAvatar?: string;
    onBlocked?: () => void;
}

export function BlockUserModal({
    isOpen,
    onClose,
    userId,
    userName,
    userAvatar,
    onBlocked,
}: BlockUserModalProps) {
    const [isBlocking, setIsBlocking] = useState(false);
    const [reason, setReason] = useState('');

    const handleBlock = async () => {
        if (isBlocking) return;

        setIsBlocking(true);
        try {
            await api.post(`/users/${userId}/block`, { reason: reason.trim() || undefined });
            toast.success(`Blocked ${userName}`);
            onBlocked?.();
            onClose();
        } catch (error: any) {
            console.error('Failed to block user:', error);
            toast.error(error.response?.data?.error?.message || 'Failed to block user');
        } finally {
            setIsBlocking(false);
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
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-md overflow-hidden shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-red-500/10 rounded-full">
                                        <ShieldOff className="w-5 h-5 text-red-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Block User</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-4">
                                {/* User Info */}
                                <div className="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-xl">
                                    {userAvatar ? (
                                        <img
                                            src={userAvatar}
                                            alt={userName}
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                                            {userName.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-white">{userName}</p>
                                        <p className="text-sm text-neutral-400">@{userId}</p>
                                    </div>
                                </div>

                                {/* Warning */}
                                <div className="flex gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-amber-200/80 space-y-1">
                                        <p className="font-medium text-amber-200">This will:</p>
                                        <ul className="list-disc list-inside space-y-1 text-xs">
                                            <li>Remove them from your followers & following</li>
                                            <li>Prevent them from seeing your profile & posts</li>
                                            <li>Stop them from messaging you</li>
                                            <li>Hide their content from your feed</li>
                                        </ul>
                                    </div>
                                </div>

                                {/* Optional Reason */}
                                <div className="space-y-2">
                                    <label className="text-sm text-neutral-400">
                                        Reason (optional)
                                    </label>
                                    <textarea
                                        value={reason}
                                        onChange={(e) => setReason(e.target.value)}
                                        placeholder="Why are you blocking this user?"
                                        maxLength={500}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
                                    />
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 p-4 border-t border-neutral-800">
                                <button
                                    onClick={onClose}
                                    className="flex-1 py-3 px-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleBlock}
                                    disabled={isBlocking}
                                    className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-medium text-white transition-colors flex items-center justify-center gap-2"
                                >
                                    {isBlocking ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Blocking...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldOff className="w-4 h-4" />
                                            Block User
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
