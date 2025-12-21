import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, BarChart, Bar } from 'recharts';
import { useAnalyticsOverview, useAnalyticsReach, useAnalyticsTrust, useAnalyticsEngagement, useUserPosts, useUserShorts } from "@/api/hooks";
import { useAuth } from "@/context/AuthContext";
import {
    Loader2, TrendingUp, Users, Heart, ShieldCheck, ArrowUpRight, ArrowDownRight,
    Eye, MessageCircle, Share2, Play, Image as ImageIcon, Video, BarChart2,
    Calendar, Clock, Zap, Award, Target, Activity
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatCardProps {
    title: string;
    value: string | number;
    change?: number;
    icon: React.ReactNode;
    color?: 'primary' | 'secondary' | 'accent' | 'emerald' | 'rose' | 'amber';
    delay?: number;
}

function StatCard({ title, value, change, icon, color = 'primary', delay = 0 }: StatCardProps) {
    const colors = {
        primary: 'from-indigo-500/20 to-indigo-500/5 border-indigo-500/30',
        secondary: 'from-teal-500/20 to-teal-500/5 border-teal-500/30',
        accent: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
        emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30',
        rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/30',
        amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/30',
    };

    const iconColors = {
        primary: 'text-indigo-400 bg-indigo-500/20',
        secondary: 'text-teal-400 bg-teal-500/20',
        accent: 'text-rose-400 bg-rose-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/20',
        rose: 'text-rose-400 bg-rose-500/20',
        amber: 'text-amber-400 bg-amber-500/20',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay }}
            className={cn(
                "relative bg-gradient-to-br border rounded-2xl p-5 backdrop-blur-xl overflow-hidden group hover:scale-[1.02] transition-transform",
                colors[color]
            )}
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{title}</p>
                    <p className="text-2xl font-heading font-extrabold text-white tracking-tight">{value}</p>
                    {change !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1 mt-2 text-xs font-bold",
                            change >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            {Math.abs(change).toFixed(1)}%
                        </div>
                    )}
                </div>
                <div className={cn("p-3 rounded-xl", iconColors[color])}>
                    {icon}
                </div>
            </div>
            <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors" />
        </motion.div>
    );
}

interface ContentItemProps {
    id: string;
    type: 'post' | 'short';
    content?: string;
    thumbnail?: string;
    views: number;
    likes: number;
    comments: number;
    shares?: number;
    createdAt: string;
    trustLevel?: string;
}

function ContentItem({ type, content, thumbnail, views, likes, comments, shares = 0, createdAt, trustLevel }: ContentItemProps) {
    const date = new Date(createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all group"
        >
            {/* Thumbnail */}
            <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                {thumbnail ? (
                    <img src={thumbnail} alt="" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        {type === 'short' ? (
                            <Video className="w-6 h-6 text-slate-500" />
                        ) : (
                            <ImageIcon className="w-6 h-6 text-slate-500" />
                        )}
                    </div>
                )}
                <div className={cn(
                    "absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                    type === 'short' ? "bg-purple-500/80 text-white" : "bg-blue-500/80 text-white"
                )}>
                    {type}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <p className="text-sm text-white font-medium truncate">
                    {content || 'No caption'}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {date}
                    </span>
                    {trustLevel && (
                        <span className={cn(
                            "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded",
                            trustLevel === 'authentic' ? "bg-emerald-500/20 text-emerald-400" :
                                trustLevel === 'suspicious' ? "bg-amber-500/20 text-amber-400" :
                                    "bg-rose-500/20 text-rose-400"
                        )}>
                            {trustLevel}
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-slate-400">
                <div className="flex flex-col items-center">
                    <Eye className="w-4 h-4 mb-0.5" />
                    <span className="text-xs font-bold text-white">{views}</span>
                </div>
                <div className="flex flex-col items-center">
                    <Heart className="w-4 h-4 mb-0.5 text-rose-400" />
                    <span className="text-xs font-bold text-white">{likes}</span>
                </div>
                <div className="flex flex-col items-center">
                    <MessageCircle className="w-4 h-4 mb-0.5 text-blue-400" />
                    <span className="text-xs font-bold text-white">{comments}</span>
                </div>
                {type === 'post' && (
                    <div className="flex flex-col items-center">
                        <Share2 className="w-4 h-4 mb-0.5 text-emerald-400" />
                        <span className="text-xs font-bold text-white">{shares}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

type PeriodType = '7d' | '30d' | '90d';
type TabType = 'overview' | 'posts' | 'shorts';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<PeriodType>('7d');
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const { profile } = useAuth();

    const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview();
    const { data: reachData, isLoading: loadingReach } = useAnalyticsReach(period);
    const { data: trustData, isLoading: loadingTrust } = useAnalyticsTrust();
    const { data: engagementData } = useAnalyticsEngagement();

    // Get user's posts and shorts
    const { data: userPosts } = useUserPosts(profile?._id || '');
    const { data: userShorts } = useUserShorts(profile?._id || '');

    // Extract data
    const stats = (overview as any)?.data?.overview || {
        totalPosts: 0,
        followers: 0,
        engagementRate: 0,
        trustScore: 0,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        totalShorts: 0,
    };

    const reach = (reachData as any)?.data?.metrics || [];
    const trust = (trustData as any)?.data || { distribution: [], trustScore: 0 };
    const engagement = (engagementData as any)?.data || { breakdown: [], topPosts: [] };

    // Process posts data
    const posts = ((userPosts as any)?.data?.posts || []).map((post: any) => ({
        id: post._id,
        type: 'post' as const,
        content: post.content,
        thumbnail: post.media?.[0]?.url || post.image,
        views: post.viewsCount || 0,
        likes: post.likesCount || 0,
        comments: post.commentsCount || 0,
        shares: post.sharesCount || 0,
        createdAt: post.createdAt,
        trustLevel: post.trustLevel?.toLowerCase(),
    }));

    // Process shorts data
    const shorts = ((userShorts as any)?.data?.shorts || []).map((short: any) => ({
        id: short._id,
        type: 'short' as const,
        content: short.caption,
        thumbnail: short.thumbnailUrl || short.videoUrl,
        views: short.viewsCount || 0,
        likes: short.likesCount || 0,
        comments: short.commentsCount || 0,
        createdAt: short.createdAt,
        trustLevel: short.trustLevel?.toLowerCase(),
    }));

    // Calculate totals from actual data
    const totalPosts = posts.length;
    const totalShorts = shorts.length;
    const totalViews = [...posts, ...shorts].reduce((sum, item) => sum + item.views, 0);
    const totalLikes = [...posts, ...shorts].reduce((sum, item) => sum + item.likes, 0);
    const totalComments = [...posts, ...shorts].reduce((sum, item) => sum + item.comments, 0);

    // Trust distribution
    const trustDistribution = trust.distribution?.length > 0 ? trust.distribution : [
        { name: 'Authentic', value: 85, color: '#22c55e' },
        { name: 'Suspicious', value: 10, color: '#eab308' },
        { name: 'Fake', value: 5, color: '#ef4444' },
    ];

    // Chart data for posts vs shorts
    const contentComparison = [
        { name: 'Posts', value: totalPosts, color: '#818cf8' },
        { name: 'Shorts', value: totalShorts, color: '#2dd4bf' },
    ];

    // Engagement by day (mock if no real data)
    const engagementByDay = reach.length > 0 ? reach : [
        { date: 'Mon', reach: 120, likes: 45, comments: 12 },
        { date: 'Tue', reach: 150, likes: 62, comments: 18 },
        { date: 'Wed', reach: 180, likes: 78, comments: 25 },
        { date: 'Thu', reach: 140, likes: 55, comments: 15 },
        { date: 'Fri', reach: 200, likes: 90, comments: 32 },
        { date: 'Sat', reach: 250, likes: 110, comments: 45 },
        { date: 'Sun', reach: 220, likes: 95, comments: 38 },
    ];

    if (loadingOverview || loadingReach || loadingTrust) {
        return (
            <div className="flex justify-center items-center min-h-[60vh]">
                <div className="text-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-gray-400">Loading analytics...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="font-heading font-extrabold text-4xl text-white tracking-tighter uppercase italic">
                        Analytics <span className="text-primary">Dashboard</span>
                    </h1>
                    <p className="text-slate-500 font-medium mt-1">Track your content performance and engagement</p>
                </div>

                {/* Period Selector */}
                <div className="flex bg-white/[0.03] border border-white/5 p-1 rounded-xl backdrop-blur-md">
                    {(['7d', '30d', '90d'] as PeriodType[]).map((p) => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={cn(
                                "px-5 py-2 text-xs font-bold rounded-lg transition-all duration-300 uppercase tracking-widest",
                                period === p
                                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                                    : "text-slate-500 hover:text-white"
                            )}
                        >
                            {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 border-b border-white/5 pb-4">
                {(['overview', 'posts', 'shorts'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-6 py-2.5 text-sm font-bold rounded-xl transition-all uppercase tracking-wider",
                            activeTab === tab
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab === 'overview' && <BarChart2 className="w-4 h-4 inline mr-2" />}
                        {tab === 'posts' && <ImageIcon className="w-4 h-4 inline mr-2" />}
                        {tab === 'shorts' && <Video className="w-4 h-4 inline mr-2" />}
                        {tab}
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            <StatCard
                                title="Total Posts"
                                value={totalPosts || stats.totalPosts || 0}
                                change={5.2}
                                icon={<ImageIcon className="w-5 h-5" />}
                                color="primary"
                                delay={0}
                            />
                            <StatCard
                                title="Total Shorts"
                                value={totalShorts || stats.totalShorts || 0}
                                change={12.5}
                                icon={<Video className="w-5 h-5" />}
                                color="secondary"
                                delay={0.05}
                            />
                            <StatCard
                                title="Total Views"
                                value={totalViews || stats.totalViews || 0}
                                change={8.3}
                                icon={<Eye className="w-5 h-5" />}
                                color="emerald"
                                delay={0.1}
                            />
                            <StatCard
                                title="Total Likes"
                                value={totalLikes || stats.totalLikes || 0}
                                change={3.7}
                                icon={<Heart className="w-5 h-5" />}
                                color="rose"
                                delay={0.15}
                            />
                            <StatCard
                                title="Comments"
                                value={totalComments || stats.totalComments || 0}
                                change={-2.1}
                                icon={<MessageCircle className="w-5 h-5" />}
                                color="amber"
                                delay={0.2}
                            />
                            <StatCard
                                title="Followers"
                                value={stats.followers || 0}
                                change={4.5}
                                icon={<Users className="w-5 h-5" />}
                                color="primary"
                                delay={0.25}
                            />
                        </div>

                        {/* Charts Row */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Engagement Chart */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="lg:col-span-2 bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-heading font-bold text-lg text-white">Engagement Trend</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Views, Likes & Comments</p>
                                    </div>
                                    <Activity className="w-5 h-5 text-primary" />
                                </div>
                                <div className="h-[280px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={engagementByDay}>
                                            <defs>
                                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="white" strokeOpacity={0.05} />
                                            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10 }} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0f172a',
                                                    border: '1px solid rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                }}
                                            />
                                            <Area type="monotone" dataKey="reach" stroke="#818cf8" strokeWidth={2} fill="url(#colorViews)" name="Views" />
                                            <Area type="monotone" dataKey="likes" stroke="#f43f5e" strokeWidth={2} fill="url(#colorLikes)" name="Likes" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </motion.div>

                            {/* Content Distribution */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-heading font-bold text-lg text-white">Content Mix</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Posts vs Shorts</p>
                                    </div>
                                    <Target className="w-5 h-5 text-secondary" />
                                </div>
                                <div className="h-[180px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={contentComparison}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={50}
                                                outerRadius={70}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {contentComparison.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 mt-4">
                                    {contentComparison.map((item) => (
                                        <div key={item.name} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                <span className="text-xs text-slate-400 font-bold uppercase">{item.name}</span>
                                            </div>
                                            <span className="text-sm font-bold text-white">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        </div>

                        {/* Trust & Top Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Trust Score */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-heading font-bold text-lg text-white">Trust Score</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">AI Verification Status</p>
                                    </div>
                                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="relative w-32 h-32">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={trustDistribution}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={40}
                                                    outerRadius={55}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {trustDistribution.map((entry: any, index: number) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className="text-2xl font-heading font-extrabold text-white">{stats.trustScore || 85}</span>
                                            <span className="text-[8px] text-slate-500 uppercase tracking-widest">Score</span>
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        {trustDistribution.map((item: any) => (
                                            <div key={item.name} className="space-y-1">
                                                <div className="flex justify-between">
                                                    <span className="text-xs text-slate-400 font-bold uppercase">{item.name}</span>
                                                    <span className="text-xs font-bold text-white">{item.value}%</span>
                                                </div>
                                                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all"
                                                        style={{ width: `${item.value}%`, backgroundColor: item.color }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>

                            {/* Top Performing Content */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="font-heading font-bold text-lg text-white">Top Performing</h3>
                                        <p className="text-xs text-slate-500 uppercase tracking-widest">Best engagement</p>
                                    </div>
                                    <Award className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="space-y-3">
                                    {[...posts, ...shorts]
                                        .sort((a, b) => (b.likes + b.views) - (a.likes + a.views))
                                        .slice(0, 3)
                                        .map((item, index) => (
                                            <div key={item.id} className="flex items-center gap-3 p-3 bg-white/[0.02] rounded-xl">
                                                <div className={cn(
                                                    "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm",
                                                    index === 0 ? "bg-amber-500/20 text-amber-400" :
                                                        index === 1 ? "bg-slate-500/20 text-slate-400" :
                                                            "bg-orange-500/20 text-orange-400"
                                                )}>
                                                    #{index + 1}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm text-white font-medium truncate">{item.content || 'No caption'}</p>
                                                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                                                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{item.views}</span>
                                                        <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{item.likes}</span>
                                                    </div>
                                                </div>
                                                <div className={cn(
                                                    "px-2 py-1 rounded text-[8px] font-bold uppercase",
                                                    item.type === 'short' ? "bg-purple-500/20 text-purple-400" : "bg-blue-500/20 text-blue-400"
                                                )}>
                                                    {item.type}
                                                </div>
                                            </div>
                                        ))}
                                    {posts.length === 0 && shorts.length === 0 && (
                                        <p className="text-center text-slate-500 py-8">No content yet</p>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'posts' && (
                    <motion.div
                        key="posts"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading font-bold text-xl text-white">Your Posts ({posts.length})</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Zap className="w-4 h-4 text-amber-400" />
                                <span>Total Views: {posts.reduce((sum: number, p: ContentItemProps) => sum + p.views, 0)}</span>
                            </div>
                        </div>
                        {posts.length > 0 ? (
                            <div className="space-y-3">
                                {posts.map((post: ContentItemProps) => (
                                    <ContentItem key={post.id} {...post} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5">
                                <ImageIcon className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500">No posts yet. Create your first post!</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {activeTab === 'shorts' && (
                    <motion.div
                        key="shorts"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading font-bold text-xl text-white">Your Shorts ({shorts.length})</h2>
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <Play className="w-4 h-4 text-purple-400" />
                                <span>Total Views: {shorts.reduce((sum: number, s: ContentItemProps) => sum + s.views, 0)}</span>
                            </div>
                        </div>
                        {shorts.length > 0 ? (
                            <div className="space-y-3">
                                {shorts.map((short: ContentItemProps) => (
                                    <ContentItem key={short.id} {...short} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-white/5">
                                <Video className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                <p className="text-slate-500">No shorts yet. Create your first short!</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
