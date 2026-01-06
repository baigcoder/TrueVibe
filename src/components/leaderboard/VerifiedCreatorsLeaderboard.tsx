import { useState, useEffect } from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Trophy, Medal, Crown, Sparkles, Shield, TrendingUp,
    ChevronRight, Star, Loader2
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { api } from '@/api/client';

interface LeaderboardUser {
    _id: string;
    name: string;
    handle: string;
    avatar?: string;
    trustScore: number;
    verificationBadge?: 'bronze' | 'silver' | 'gold' | 'verified_creator';
    authenticPosts: number;
    totalPosts: number;
}

const badgeConfig = {
    bronze: { icon: Medal, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Bronze' },
    silver: { icon: Medal, color: 'text-slate-300', bg: 'bg-slate-400/10', border: 'border-slate-400/20', label: 'Silver' },
    gold: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Gold' },
    verified_creator: { icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'Verified' },
};

export function VerifiedCreatorsLeaderboard() {
    const navigate = useNavigate();
    const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchLeaderboard() {
            try {
                setIsLoading(true);
                const response = await api.get('/users/leaderboard') as any;
                if (response.data?.users) {
                    setLeaders(response.data.users);
                }
            } catch (error) {
                console.error('Failed to fetch leaderboard:', error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchLeaderboard();
    }, []);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-yellow-400" />;
        if (rank === 2) return <Trophy className="w-5 h-5 text-slate-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="text-sm font-bold text-slate-500">#{rank}</span>;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
        );
    }

    if (leaders.length === 0) {
        return (
            <div className="text-center p-8 text-slate-500">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No verified creators yet</p>
                <p className="text-sm">Be the first to earn a verification badge!</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 rounded-xl bg-primary/20 border border-primary/30">
                        <Trophy className="w-4 h-4 text-primary" />
                    </div>
                    <h3 className="font-heading font-bold text-white uppercase tracking-wide text-sm">
                        Verified Creators
                    </h3>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500">
                    <TrendingUp className="w-3 h-3" />
                    <span>Top 10</span>
                </div>
            </div>

            {/* Leaderboard List */}
            <div className="space-y-2">
                {leaders.slice(0, 10).map((user, index) => {
                    const badge = user.verificationBadge ? badgeConfig[user.verificationBadge] : null;
                    const BadgeIcon = badge?.icon || Star;

                    return (
                        <m.div
                            key={user._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate({ to: `/app/profile/${user._id}` })}
                            className={cn(
                                "flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all",
                                "bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-white/10",
                                index === 0 && "bg-gradient-to-r from-yellow-500/10 to-transparent border-yellow-500/20"
                            )}
                        >
                            {/* Rank */}
                            <div className="w-8 flex items-center justify-center">
                                {getRankIcon(index + 1)}
                            </div>

                            {/* Avatar */}
                            <Avatar className="w-10 h-10 border-2 border-white/10">
                                <AvatarImage src={user.avatar} />
                                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                    {user.name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>

                            {/* User Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-white truncate text-sm">
                                        {user.name}
                                    </span>
                                    {badge && (
                                        <div className={cn(
                                            "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold uppercase",
                                            badge.bg, badge.border, badge.color
                                        )}>
                                            <BadgeIcon className="w-3 h-3" />
                                            <span className="hidden sm:inline">{badge.label}</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <span>@{user.handle}</span>
                                    <span>•</span>
                                    <span>{user.authenticPosts} authentic posts</span>
                                </div>
                            </div>

                            {/* Trust Score */}
                            <div className="text-right">
                                <div className="flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-primary" />
                                    <span className="font-bold text-white">{user.trustScore}</span>
                                </div>
                                <span className="text-[10px] text-slate-500 uppercase">Trust</span>
                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-600" />
                        </m.div>
                    );
                })}
            </div>
        </div>
    );
}
