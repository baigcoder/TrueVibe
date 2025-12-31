import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldOff, User, Search, AlertTriangle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface BlockedUser {
    _id: string;
    user: {
        userId: string;
        name: string;
        handle: string;
        avatar?: string;
    };
    reason?: string;
    blockedAt: string;
}

export function BlockedUsersSection() {
    const [searchQuery, setSearchQuery] = useState('');
    const [confirmUnblock, setConfirmUnblock] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch blocked users
    const { data: blockedData, isLoading, error } = useQuery({
        queryKey: ['blockedUsers'],
        queryFn: async () => {
            const response = await api.get('/users/blocked') as { data: { data: { blockedUsers: BlockedUser[]; total: number } } };
            return response.data.data;
        },
    });

    // Unblock mutation
    const unblockMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/users/${userId}/block`);
        },
        onSuccess: () => {
            toast.success('User unblocked');
            queryClient.invalidateQueries({ queryKey: ['blockedUsers'] });
            setConfirmUnblock(null);
        },
        onError: (error) => {
            const err = error as { response?: { data?: { error?: { message?: string } } } };
            toast.error(err.response?.data?.error?.message || 'Failed to unblock user');
        },
    });

    const blockedUsers: BlockedUser[] = blockedData?.blockedUsers || [];
    const filteredUsers = blockedUsers.filter((blocked) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();
        return (
            blocked.user.name.toLowerCase().includes(query) ||
            blocked.user.handle.toLowerCase().includes(query)
        );
    });

    if (isLoading) {
        return (
            <div className="p-8 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
                <p className="text-neutral-400">Failed to load blocked users</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <ShieldOff className="w-5 h-5 text-red-500" />
                    Blocked Users
                </h3>
                <p className="text-sm text-neutral-400 mt-1">
                    {blockedUsers.length} {blockedUsers.length === 1 ? 'user' : 'users'} blocked
                </p>
            </div>

            {/* Search */}
            {blockedUsers.length > 5 && (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search blocked users..."
                        className="w-full pl-12 pr-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    />
                </div>
            )}

            {/* Blocked Users List */}
            <div className="space-y-2">
                {filteredUsers.map((blocked, index) => (
                    <motion.div
                        key={blocked._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl"
                    >
                        <div className="flex items-center gap-4">
                            {/* Avatar */}
                            {blocked.user.avatar ? (
                                <img
                                    src={blocked.user.avatar}
                                    alt={blocked.user.name}
                                    className="w-12 h-12 rounded-full object-cover"
                                />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-neutral-700 to-neutral-600 flex items-center justify-center">
                                    <User className="w-6 h-6 text-neutral-400" />
                                </div>
                            )}

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-white truncate">{blocked.user.name}</p>
                                <p className="text-sm text-neutral-400">@{blocked.user.handle}</p>
                                <p className="text-xs text-neutral-500 mt-1">
                                    Blocked {formatDistanceToNow(new Date(blocked.blockedAt), { addSuffix: true })}
                                </p>
                            </div>

                            {/* Unblock Button */}
                            {confirmUnblock === blocked.user.userId ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => unblockMutation.mutate(blocked.user.userId)}
                                        disabled={unblockMutation.isPending}
                                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-sm font-medium text-white transition-colors"
                                    >
                                        {unblockMutation.isPending ? 'Unblocking...' : 'Confirm'}
                                    </button>
                                    <button
                                        onClick={() => setConfirmUnblock(null)}
                                        className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmUnblock(blocked.user.userId)}
                                    className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 border border-neutral-600 rounded-xl text-sm font-medium text-white transition-colors"
                                >
                                    Unblock
                                </button>
                            )}
                        </div>

                        {/* Reason if provided */}
                        {blocked.reason && (
                            <p className="mt-3 pl-16 text-sm text-neutral-500 italic">
                                Reason: {blocked.reason}
                            </p>
                        )}
                    </motion.div>
                ))}

                {filteredUsers.length === 0 && blockedUsers.length > 0 && (
                    <div className="p-8 text-center">
                        <Search className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-400">No matching users found</p>
                    </div>
                )}

                {blockedUsers.length === 0 && (
                    <div className="p-8 text-center bg-neutral-800/30 rounded-xl border border-neutral-700/30">
                        <ShieldOff className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-400">You haven't blocked anyone</p>
                        <p className="text-sm text-neutral-500 mt-1">
                            When you block someone, they won't be able to see your profile or posts
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
