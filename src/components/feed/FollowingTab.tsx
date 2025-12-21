import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Users, UserMinus, ShieldCheck, Clock, Loader2,
    MessageCircle, Sparkles, Activity, Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { useUnfollowUser, useFollowing } from "@/api/hooks";
import { Link, useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";


export function FollowingTab() {
    const { profile } = useAuth();
    const [unfollowingId, setUnfollowingId] = useState<string | null>(null);
    const navigate = useNavigate();
    const unfollowMutation = useUnfollowUser();

    // Use the optimized useFollowing hook which handles pagination
    const {
        data: infiniteData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useFollowing(profile?.userId || profile?._id || '');

    // Flatten pages to get the list of followed users
    const followingItems = (infiniteData?.pages as any[])?.flatMap(page => page?.data?.following || []) || [];

    const handleUnfollow = async (userId: string) => {
        setUnfollowingId(userId);
        try {
            await unfollowMutation.mutateAsync(userId);
        } catch (error) {
            console.error('Failed to unfollow:', error);
        } finally {
            setUnfollowingId(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Users className="w-6 h-6 text-primary" />
                    </div>
                </div>
                <p className="mt-6 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Loading Following...
                </p>
            </div>
        );
    }

    if (followingItems.length === 0) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-[#0c0c0e]/40 backdrop-blur-3xl border border-white/5 rounded-[3rem] p-16 text-center relative overflow-hidden group"
            >
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-[100px] group-hover:bg-purple-500/30 transition-colors duration-1000" />
                <div className="relative">
                    <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center shadow-inner">
                        <Users className="w-10 h-10 text-purple-400 drop-shadow-[0_0_15px_rgba(168,85,247,0.5)]" />
                    </div>
                    <h3 className="font-heading font-extrabold text-3xl text-white mb-3 tracking-tighter uppercase italic">
                        No Connections Yet
                    </h3>
                    <p className="text-slate-500 font-medium mb-8 max-w-sm mx-auto leading-relaxed">
                        Start building your network! Follow creators to see their activity here.
                    </p>
                    <Link to="/app/search">
                        <Button className="bg-gradient-to-br from-purple-500 to-pink-500 hover:from-purple-500/90 hover:to-pink-500/90 text-white font-bold rounded-2xl px-8 h-12 shadow-lg shadow-purple-500/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest border border-purple-400/20">
                            <Users className="w-4 h-4 mr-2" />
                            Discover People
                        </Button>
                    </Link>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-rose-500/10 border border-white/10 rounded-2xl p-4 flex items-center justify-between"
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-white/60 uppercase tracking-widest">Your Network</p>
                        <p className="text-lg font-black text-white">{followingItems.length} <span className="text-sm font-normal text-white/60">creators</span></p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white/80">Active</span>
                </div>
            </motion.div>

            {/* Following List */}
            <AnimatePresence mode="popLayout">
                {followingItems.map((item: any, index: number) => {
                    const user = item.user;
                    if (!user) return null;
                    return (
                        <motion.div
                            key={user._id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-4 hover:border-white/10 transition-all group"
                        >
                            <div className="flex items-center justify-between">
                                <Link
                                    to="/app/profile/$id"
                                    params={{ id: user._id }}
                                    className="flex items-center gap-4 flex-1"
                                >
                                    <div className="relative">
                                        <Avatar className="w-14 h-14 rounded-xl border-2 border-white/10 group-hover:border-primary/30 transition-colors">
                                            <AvatarImage src={user.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-slate-800 text-white font-bold">
                                                {user.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {user.verified && (
                                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-lg flex items-center justify-center border-2 border-[#0c0c0e]">
                                                <ShieldCheck className="w-3 h-3 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-heading font-black text-white text-sm truncate">
                                                {user.name}
                                            </h4>
                                            {user.trustScore && user.trustScore >= 80 && (
                                                <span className="px-2 py-0.5 bg-emerald-500/20 rounded-lg text-[9px] font-black text-emerald-400 uppercase">
                                                    Trusted
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-white/50 text-xs font-medium">@{user.handle}</p>
                                        {user.bio && (
                                            <p className="text-white/40 text-xs mt-1 truncate max-w-[200px]">
                                                {user.bio}
                                            </p>
                                        )}
                                        {user.lastActive && (
                                            <div className="flex items-center gap-1.5 mt-1.5">
                                                <Clock className="w-3 h-3 text-white/30" />
                                                <span className="text-[10px] text-white/30 font-medium">
                                                    Active {formatDistanceToNow(new Date(user.lastActive), { addSuffix: true })}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </Link>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate({ to: '/app/chat', search: { userId: user.userId || user._id } })}
                                        className="w-9 h-9 rounded-xl bg-white/5 hover:bg-primary/20 text-white/60 hover:text-primary"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleUnfollow(user._id)}
                                        disabled={unfollowingId === user._id}
                                        className={cn(
                                            "rounded-xl px-4 h-9 font-bold text-xs transition-all",
                                            "bg-white/5 hover:bg-rose-500/20 text-white/60 hover:text-rose-400 border border-transparent hover:border-rose-500/30"
                                        )}
                                    >
                                        {unfollowingId === user._id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <>
                                                <UserMinus className="w-3.5 h-3.5 mr-1.5" />
                                                Unfollow
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {/* Load More */}
            {hasNextPage && (
                <div className="flex justify-center pt-2">
                    <Button
                        variant="ghost"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="text-primary hover:text-primary/80 font-bold uppercase tracking-widest text-[10px] h-12 w-full rounded-2xl bg-white/5 border border-white/5 hover:border-white/10"
                    >
                        {isFetchingNextPage ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <Plus className="w-4 h-4 mr-2" />
                        )}
                        Load More Creators
                    </Button>
                </div>
            )}

            {/* Discover More CTA */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-center py-6"
            >
                <Link to="/app/search">
                    <Button
                        variant="outline"
                        className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-medium"
                    >
                        <Sparkles className="w-4 h-4 mr-2 text-primary" />
                        Discover More Creators
                    </Button>
                </Link>
            </motion.div>
        </div>
    );
}
