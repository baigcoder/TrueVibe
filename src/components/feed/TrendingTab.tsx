import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    TrendingUp, Hash, Flame, Sparkles,
    ShieldCheck, ArrowUpRight, Zap, Star, Crown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSuggestedUsers, useFollowUser, useTrendingHashtags } from "@/api/hooks";
import { Link } from "@tanstack/react-router";
import { useState } from "react";

const TRENDING_CATEGORIES = [
    { name: "Technology", icon: Zap, color: "from-blue-500 to-primary" },
    { name: "Art & Design", icon: Sparkles, color: "from-purple-500 to-pink-500" },
    { name: "Lifestyle", icon: Star, color: "from-amber-500 to-orange-500" },
    { name: "News", icon: TrendingUp, color: "from-indigo-500 to-violet-500" },
];

export function TrendingTab() {
    const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestedUsers(10);
    const { data: hashtagsData, isLoading: loadingHashtags } = useTrendingHashtags(5);
    const followMutation = useFollowUser();
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

    const trendingCreators = (suggestionsData as any)?.data?.suggestions || [];
    const trendingHashtags = (hashtagsData as any)?.data?.hashtags || [];

    const isLoading = loadingSuggestions || loadingHashtags;

    const handleFollow = async (userId: string) => {
        try {
            await followMutation.mutateAsync(userId);
            setFollowingIds(prev => new Set(prev).add(userId));
        } catch (error) {
            console.error('Failed to follow:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                </div>
                <p className="mt-6 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">
                    Loading Trends...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Hot Right Now Banner */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-orange-500/20 via-rose-500/20 to-purple-500/20 border border-white/10 rounded-2xl p-5 overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/30 to-transparent rounded-full blur-2xl" />
                <div className="relative flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Flame className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h3 className="font-heading font-black text-xl text-white uppercase tracking-tight">
                            Hot Right Now
                        </h3>
                        <p className="text-white/60 text-sm">Discover what's trending on TrueVibe</p>
                    </div>
                </div>
            </motion.div>

            {/* Trending Categories */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 gap-3"
            >
                {TRENDING_CATEGORIES.map((category, index) => (
                    <motion.div
                        key={category.name}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-xl p-4 hover:border-white/10 transition-all cursor-pointer group"
                    >
                        <div className={cn(
                            "w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center mb-3 group-hover:scale-110 transition-transform",
                            category.color
                        )}>
                            <category.icon className="w-5 h-5 text-white" />
                        </div>
                        <h4 className="font-bold text-white text-sm">{category.name}</h4>
                        <p className="text-white/40 text-xs mt-1">Explore →</p>
                    </motion.div>
                ))}
            </motion.div>

            {/* Trending Hashtags */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5"
            >
                <div className="flex items-center gap-2 mb-4">
                    <Hash className="w-5 h-5 text-primary" />
                    <h3 className="font-heading font-black text-white uppercase tracking-tight">
                        Trending Topics
                    </h3>
                </div>
                <div className="space-y-3">
                    {trendingHashtags.length > 0 ? (
                        trendingHashtags.map((topic: any, index: number) => (
                            <motion.div
                                key={topic._id || topic.hashtag || index}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 + index * 0.05 }}
                                className="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group"
                            >
                                <div className="flex items-center gap-3">
                                    <span className="text-lg font-black text-white/30">#{index + 1}</span>
                                    <div>
                                        <p className="font-bold text-white group-hover:text-primary transition-colors">
                                            #{topic.hashtag || topic.tag}
                                        </p>
                                        <p className="text-xs text-white/40">{(topic.count || topic.posts || 0).toLocaleString()} posts</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded-lg">
                                    <ArrowUpRight className="w-3 h-3 text-primary" />
                                    <span className="text-xs font-bold text-primary">Trending</span>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <p className="text-center text-white/40 py-4">No trending topics yet. Start posting!</p>
                    )}
                </div>
            </motion.div>

            {/* Trending Creators */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-[#0c0c0e]/60 backdrop-blur-xl border border-white/5 rounded-2xl p-5"
            >
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h3 className="font-heading font-black text-white uppercase tracking-tight">
                            Rising Creators
                        </h3>
                    </div>
                    <Link to="/app/search">
                        <Button variant="ghost" size="sm" className="text-xs text-white/50 hover:text-white">
                            See All
                        </Button>
                    </Link>
                </div>

                {trendingCreators.length === 0 ? (
                    <p className="text-center text-white/40 py-8">No suggestions available</p>
                ) : (
                    <div className="space-y-3">
                        {trendingCreators.slice(0, 5).map((creator: any, index: number) => (
                            <motion.div
                                key={creator._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + index * 0.05 }}
                                className="flex items-center justify-between py-2"
                            >
                                <Link
                                    to="/app/profile/$id"
                                    params={{ id: creator._id }}
                                    className="flex items-center gap-3 flex-1"
                                >
                                    <div className="relative">
                                        <Avatar className="w-11 h-11 rounded-xl border border-white/10">
                                            <AvatarImage src={creator.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-slate-800 text-white font-bold">
                                                {creator.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {creator.isVerified && (
                                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-primary rounded-md flex items-center justify-center border-2 border-[#0c0c0e]">
                                                <ShieldCheck className="w-2.5 h-2.5 text-white" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-white text-sm truncate">{creator.name}</h4>
                                        <p className="text-white/40 text-xs">@{creator.handle}</p>
                                    </div>
                                </Link>
                                <Button
                                    size="sm"
                                    onClick={() => handleFollow(creator._id)}
                                    disabled={followingIds.has(creator._id)}
                                    className={cn(
                                        "rounded-xl h-8 px-4 font-bold text-xs transition-all",
                                        followingIds.has(creator._id)
                                            ? "bg-white/10 text-white/50"
                                            : "bg-primary hover:bg-primary/90 text-white"
                                    )}
                                >
                                    {followingIds.has(creator._id) ? "Following" : "Follow"}
                                </Button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>
        </div>
    );
}
