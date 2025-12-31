import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    X, Shield, TrendingDown, Minus, RefreshCw,
    CheckCircle2, Clock, User, MessageSquare, Users, FileText, Award
} from 'lucide-react';
import { api } from '@/api/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface TrustFactor {
    name: string;
    score: number;
    maxScore: number;
    description: string;
}

interface TrustBreakdown {
    totalScore: number;
    level: 'excellent' | 'good' | 'average' | 'low' | 'risky';
    factors: TrustFactor[];
    lastUpdated: string;
}

interface TrustScoreBreakdownProps {
    isOpen: boolean;
    onClose: () => void;
}

const levelConfig = {
    excellent: { color: 'emerald', label: 'Excellent', icon: Award },
    good: { color: 'green', label: 'Good', icon: CheckCircle2 },
    average: { color: 'amber', label: 'Average', icon: Minus },
    low: { color: 'orange', label: 'Low', icon: TrendingDown },
    risky: { color: 'red', label: 'Risky', icon: TrendingDown },
};

const factorIcons: Record<string, typeof Shield> = {
    'Base Score': Shield,
    'Verified Account': CheckCircle2,
    'Account Age': Clock,
    'Content Creation': FileText,
    'Community Trust': Users,
    'Following Ratio': User,
    'Profile Complete': User,
    'Engagement Quality': MessageSquare,
    'Trust Issues': TrendingDown,
};

export function TrustScoreBreakdown({ isOpen, onClose }: TrustScoreBreakdownProps) {
    const queryClient = useQueryClient();

    const { data: breakdown, isLoading, error } = useQuery({
        queryKey: ['trustScore'],
        queryFn: async () => {
            const response = await api.get('/trust/score') as { data: { data: TrustBreakdown } };
            return response.data.data;
        },
        enabled: isOpen,
    });

    const recalculateMutation = useMutation({
        mutationFn: async () => {
            const response = await api.post('/trust/recalculate') as { data: { data: TrustBreakdown } };
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trustScore'] });
            toast.success('Trust score recalculated!');
        },
        onError: () => {
            toast.error('Failed to recalculate');
        },
    });

    const config = breakdown ? levelConfig[breakdown.level] : levelConfig.average;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-xl"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-md max-h-[85vh] bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <Shield className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-white font-bold">Trust Score</h2>
                                    <p className="text-slate-500 text-xs">Detailed breakdown</p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors"
                            >
                                <X className="w-4 h-4 text-slate-400" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-5">
                            {isLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                                </div>
                            ) : error ? (
                                <div className="text-center py-12 text-red-400">
                                    Failed to load trust score
                                </div>
                            ) : breakdown && (
                                <>
                                    {/* Score Display */}
                                    <div className={cn(
                                        "p-6 rounded-2xl border text-center",
                                        `bg-${config.color}-500/10 border-${config.color}-500/20`
                                    )}>
                                        <div className="relative w-28 h-28 mx-auto mb-4">
                                            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                                                <circle
                                                    cx="50" cy="50" r="42"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="8"
                                                    className="text-white/5"
                                                />
                                                <motion.circle
                                                    cx="50" cy="50" r="42"
                                                    fill="none"
                                                    stroke={`url(#gradient-${config.color})`}
                                                    strokeWidth="8"
                                                    strokeLinecap="round"
                                                    strokeDasharray={`${breakdown.totalScore * 2.64} 264`}
                                                    initial={{ strokeDasharray: "0 264" }}
                                                    animate={{ strokeDasharray: `${breakdown.totalScore * 2.64} 264` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                />
                                                <defs>
                                                    <linearGradient id={`gradient-${config.color}`} x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#818cf8" />
                                                        <stop offset="100%" stopColor="#10b981" />
                                                    </linearGradient>
                                                </defs>
                                            </svg>
                                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                                <span className="text-4xl font-black text-white">{breakdown.totalScore}</span>
                                                <span className="text-xs text-slate-500 uppercase tracking-wider">/ 100</span>
                                            </div>
                                        </div>
                                        <div className={cn(
                                            "inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold",
                                            config.color === 'emerald' && "bg-emerald-500/20 text-emerald-400",
                                            config.color === 'green' && "bg-green-500/20 text-green-400",
                                            config.color === 'amber' && "bg-amber-500/20 text-amber-400",
                                            config.color === 'orange' && "bg-orange-500/20 text-orange-400",
                                            config.color === 'red' && "bg-red-500/20 text-red-400",
                                        )}>
                                            <config.icon className="w-4 h-4" />
                                            {config.label}
                                        </div>
                                    </div>

                                    {/* Factors */}
                                    <div className="space-y-2">
                                        <h3 className="text-white font-semibold text-sm px-1">Score Breakdown</h3>
                                        {breakdown.factors.map((factor, index) => {
                                            const Icon = factorIcons[factor.name] || Shield;
                                            const isPositive = factor.score >= 0;
                                            const percentage = factor.maxScore > 0
                                                ? Math.abs(factor.score) / factor.maxScore * 100
                                                : 0;

                                            return (
                                                <motion.div
                                                    key={factor.name}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    className="p-3 bg-white/5 rounded-xl border border-white/5"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <Icon className={cn(
                                                                "w-4 h-4",
                                                                isPositive ? "text-indigo-400" : "text-red-400"
                                                            )} />
                                                            <span className="text-white text-sm font-medium">{factor.name}</span>
                                                        </div>
                                                        <span className={cn(
                                                            "text-sm font-bold",
                                                            isPositive ? "text-emerald-400" : "text-red-400"
                                                        )}>
                                                            {isPositive ? '+' : ''}{factor.score}
                                                        </span>
                                                    </div>
                                                    {factor.maxScore > 0 && (
                                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                            <motion.div
                                                                className={cn(
                                                                    "h-full rounded-full",
                                                                    isPositive ? "bg-gradient-to-r from-indigo-500 to-emerald-500" : "bg-red-500"
                                                                )}
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${percentage}%` }}
                                                                transition={{ delay: index * 0.05 + 0.2, duration: 0.5 }}
                                                            />
                                                        </div>
                                                    )}
                                                    <p className="text-slate-500 text-xs mt-1.5">{factor.description}</p>
                                                </motion.div>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-5 py-4 border-t border-white/10">
                            <button
                                onClick={() => recalculateMutation.mutate()}
                                disabled={recalculateMutation.isPending}
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                                <RefreshCw className={cn("w-4 h-4", recalculateMutation.isPending && "animate-spin")} />
                                {recalculateMutation.isPending ? 'Recalculating...' : 'Recalculate Score'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
