import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    Monitor,
    Smartphone,
    Tablet,
    MapPin,
    Clock,
    Trash2,
    LogOut,
    Shield,
    AlertTriangle
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Session {
    _id: string;
    deviceInfo: {
        browser: string;
        os: string;
        device: string;
    };
    ipAddress: string;
    location?: {
        country?: string;
        city?: string;
    };
    lastActive: string;
    createdAt: string;
    isActive: boolean;
}

export function SessionsSection() {
    const [revokeAllConfirm, setRevokeAllConfirm] = useState(false);
    const queryClient = useQueryClient();

    // Fetch sessions
    const { data: sessions, isLoading, error } = useQuery({
        queryKey: ['sessions'],
        queryFn: async () => {
            const response = await api.get('/auth/sessions') as { data: { data: { sessions: Session[] } } };
            return response.data.data.sessions;
        },
    });

    // Revoke single session mutation
    const revokeSessionMutation = useMutation({
        mutationFn: async (sessionId: string) => {
            await api.delete(`/auth/sessions/${sessionId}`);
        },
        onSuccess: () => {
            toast.success('Session revoked');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
        },
        onError: (error) => {
            const err = error as { response?: { data?: { error?: { message?: string } } } };
            toast.error(err.response?.data?.error?.message || 'Failed to revoke session');
        },
    });

    // Revoke all sessions mutation
    const revokeAllMutation = useMutation({
        mutationFn: async () => {
            await api.delete('/auth/sessions');
        },
        onSuccess: () => {
            toast.success('All other sessions revoked');
            queryClient.invalidateQueries({ queryKey: ['sessions'] });
            setRevokeAllConfirm(false);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error?.message || 'Failed to revoke sessions');
        },
    });

    const getDeviceIcon = (device: string) => {
        const lowerDevice = device.toLowerCase();
        if (lowerDevice.includes('mobile') || lowerDevice.includes('phone')) {
            return <Smartphone className="w-5 h-5" />;
        }
        if (lowerDevice.includes('tablet') || lowerDevice.includes('ipad')) {
            return <Tablet className="w-5 h-5" />;
        }
        return <Monitor className="w-5 h-5" />;
    };

    const getLocationString = (session: Session) => {
        if (session.location?.city && session.location?.country) {
            return `${session.location.city}, ${session.location.country}`;
        }
        if (session.location?.country) {
            return session.location.country;
        }
        return 'Unknown location';
    };

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
                <p className="text-neutral-400">Failed to load sessions</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-500" />
                        Active Sessions
                    </h3>
                    <p className="text-sm text-neutral-400 mt-1">
                        Manage devices where you're logged in
                    </p>
                </div>

                {sessions && sessions.length > 1 && (
                    <div>
                        {revokeAllConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-amber-400">Are you sure?</span>
                                <button
                                    onClick={() => revokeAllMutation.mutate()}
                                    disabled={revokeAllMutation.isPending}
                                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-medium text-white transition-colors"
                                >
                                    {revokeAllMutation.isPending ? 'Revoking...' : 'Yes, revoke all'}
                                </button>
                                <button
                                    onClick={() => setRevokeAllConfirm(false)}
                                    className="px-3 py-1.5 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-sm font-medium text-white transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setRevokeAllConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-medium text-red-400 transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                Log out all devices
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Sessions List */}
            <div className="space-y-3">
                {sessions?.map((session, index) => (
                    <motion.div
                        key={session._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl"
                    >
                        <div className="flex items-start gap-4">
                            {/* Device Icon */}
                            <div className="p-3 bg-neutral-700/50 rounded-xl text-purple-400">
                                {getDeviceIcon(session.deviceInfo.device)}
                            </div>

                            {/* Session Details */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">
                                        {session.deviceInfo.browser}
                                    </span>
                                    <span className="text-neutral-500">on</span>
                                    <span className="text-neutral-300">
                                        {session.deviceInfo.os}
                                    </span>
                                    {index === 0 && (
                                        <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs font-medium rounded-full">
                                            Current
                                        </span>
                                    )}
                                </div>

                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-400">
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {getLocationString(session)}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5" />
                                        Last active {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
                                    </span>
                                </div>

                                <p className="mt-1 text-xs text-neutral-500 font-mono">
                                    IP: {session.ipAddress}
                                </p>
                            </div>

                            {/* Revoke Button (not for current session) */}
                            {index !== 0 && (
                                <button
                                    onClick={() => revokeSessionMutation.mutate(session._id)}
                                    disabled={revokeSessionMutation.isPending}
                                    className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                                    title="Revoke this session"
                                >
                                    {revokeSessionMutation.isPending ? (
                                        <div className="w-5 h-5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                                    ) : (
                                        <Trash2 className="w-5 h-5" />
                                    )}
                                </button>
                            )}
                        </div>
                    </motion.div>
                ))}

                {(!sessions || sessions.length === 0) && (
                    <div className="p-8 text-center">
                        <Shield className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                        <p className="text-neutral-400">No active sessions found</p>
                    </div>
                )}
            </div>

            {/* Security Tips */}
            <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                <h4 className="text-sm font-medium text-purple-400 mb-2">Security Tips</h4>
                <ul className="text-sm text-neutral-400 space-y-1">
                    <li>• Review your sessions regularly and remove unfamiliar devices</li>
                    <li>• If you see suspicious activity, change your password immediately</li>
                    <li>• Enable two-factor authentication for extra security</li>
                </ul>
            </div>
        </div>
    );
}
