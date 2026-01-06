import { useState } from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { useAnalyticsOverview, useAnalyticsReach, useAnalyticsTrust, useAnalyticsEngagement, useUserPosts, useUserShorts, useUserReports, useDeleteReport } from "@/api/hooks";
import { useAuth } from "@/context/AuthContext";
import {
    Loader2, Users, Heart, ShieldCheck, ArrowUpRight, ArrowDownRight,
    Eye, MessageCircle, Share2, Play, Image as ImageIcon, Video, BarChart2,
    Calendar, Zap, Award, Target, Activity, FileText, Download, CheckCircle, AlertTriangle, XCircle, Trash2
} from "lucide-react";
import { m, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api } from "@/api/client";

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
        primary: 'from-indigo-500/20 via-indigo-500/10 to-transparent border-indigo-500/30 hover:border-indigo-500/50',
        secondary: 'from-teal-500/20 via-teal-500/10 to-transparent border-teal-500/30 hover:border-teal-500/50',
        accent: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/50',
        emerald: 'from-emerald-500/20 via-emerald-500/10 to-transparent border-emerald-500/30 hover:border-emerald-500/50',
        rose: 'from-rose-500/20 via-rose-500/10 to-transparent border-rose-500/30 hover:border-rose-500/50',
        amber: 'from-amber-500/20 via-amber-500/10 to-transparent border-amber-500/30 hover:border-amber-500/50',
    };

    const iconColors = {
        primary: 'text-indigo-400 bg-indigo-500/20 shadow-lg shadow-indigo-500/20',
        secondary: 'text-teal-400 bg-teal-500/20 shadow-lg shadow-teal-500/20',
        accent: 'text-rose-400 bg-rose-500/20 shadow-lg shadow-rose-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/20 shadow-lg shadow-emerald-500/20',
        rose: 'text-rose-400 bg-rose-500/20 shadow-lg shadow-rose-500/20',
        amber: 'text-amber-400 bg-amber-500/20 shadow-lg shadow-amber-500/20',
    };

    const glowColors = {
        primary: 'group-hover:shadow-[0_0_30px_rgba(99,102,241,0.3)]',
        secondary: 'group-hover:shadow-[0_0_30px_rgba(20,184,166,0.3)]',
        accent: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]',
        emerald: 'group-hover:shadow-[0_0_30px_rgba(16,185,129,0.3)]',
        rose: 'group-hover:shadow-[0_0_30px_rgba(244,63,94,0.3)]',
        amber: 'group-hover:shadow-[0_0_30px_rgba(245,158,11,0.3)]',
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay, type: "spring", damping: 20 }}
            className={cn(
                "relative bg-gradient-to-br border rounded-2xl sm:rounded-3xl p-4 sm:p-5 backdrop-blur-xl overflow-hidden group",
                "hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-default",
                colors[color],
                glowColors[color]
            )}
        >
            {/* Background glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="flex items-start justify-between relative z-10">
                <div className="flex-1 min-w-0">
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 sm:mb-2 truncate">{title}</p>
                    <p className="text-xl sm:text-2xl font-heading font-extrabold text-white tracking-tight">{value}</p>
                    {change !== undefined && (
                        <div className={cn(
                            "flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-bold",
                            change >= 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                            {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{Math.abs(change).toFixed(1)}%</span>
                        </div>
                    )}
                </div>
                <div className={cn("p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-transform group-hover:scale-110 duration-300", iconColors[color])}>
                    {icon}
                </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors duration-500" />
            <div className="absolute top-0 right-0 w-20 h-[1px] bg-gradient-to-l from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </m.div>
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
        <m.div
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
        </m.div>
    );
}

type PeriodType = '7d' | '30d' | '90d';
type TabType = 'overview' | 'posts' | 'shorts' | 'reports';

export default function AnalyticsPage() {
    const [period, setPeriod] = useState<PeriodType>('7d');
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const { profile } = useAuth();

    const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview();
    const { data: reachData, isLoading: loadingReach } = useAnalyticsReach(period);
    const { data: trustData, isLoading: loadingTrust } = useAnalyticsTrust();
    useAnalyticsEngagement(); // hook called for side-effects

    // Get user's posts and shorts
    const { data: userPosts } = useUserPosts(profile?._id || '');
    const { data: userShorts } = useUserShorts(profile?._id || '');

    // Get user's AI reports
    const { data: reportsData, isLoading: loadingReports } = useUserReports();
    const deleteReport = useDeleteReport();
    const [deletingReportId, setDeletingReportId] = useState<string | null>(null);

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
    // engagementData is available for future use

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
        <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-24 md:pb-10 px-2 xs:px-3 md:px-0">
            {/* Premium Header Banner */}
            <m.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-gradient-to-r from-primary/10 via-purple-500/5 to-secondary/10 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 overflow-hidden"
            >
                {/* Background effects */}
                <div className="absolute inset-0 bg-grid-pattern opacity-5" />
                <div className="absolute -right-20 -top-20 w-60 h-60 bg-primary/20 rounded-full blur-[80px]" />
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-secondary/20 rounded-full blur-[60px]" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 sm:gap-3 mb-2">
                            <div className="p-2 sm:p-2.5 rounded-xl bg-primary/20 border border-primary/30">
                                <BarChart2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                            </div>
                            <h1 className="font-heading font-extrabold text-xl sm:text-2xl md:text-3xl text-white tracking-tighter uppercase italic">
                                Analytics
                            </h1>
                        </div>
                        <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-md">
                            Track your content performance, engagement metrics, and audience insights
                        </p>
                    </div>

                    {/* Period Selector */}
                    <div className="flex bg-white/[0.05] border border-white/10 p-1 rounded-xl sm:rounded-2xl backdrop-blur-md self-start sm:self-auto">
                        {(['7d', '30d', '90d'] as PeriodType[]).map((p) => (
                            <m.button
                                key={p}
                                onClick={() => setPeriod(p)}
                                whileTap={{ scale: 0.95 }}
                                className={cn(
                                    "px-3 sm:px-5 py-1.5 sm:py-2 text-[10px] sm:text-xs font-black rounded-lg sm:rounded-xl transition-all duration-300 uppercase tracking-widest relative",
                                    period === p
                                        ? "text-white"
                                        : "text-slate-500 hover:text-white"
                                )}
                            >
                                {period === p && (
                                    <m.div
                                        layoutId="periodPill"
                                        className="absolute inset-0 bg-primary rounded-lg sm:rounded-xl shadow-lg shadow-primary/30"
                                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                    />
                                )}
                                <span className="relative z-10">{p === '7d' ? '7D' : p === '30d' ? '30D' : '90D'}</span>
                            </m.button>
                        ))}
                    </div>
                </div>
            </m.div>

            {/* Tab Navigation */}
            <div className="flex gap-1.5 md:gap-2 border-b border-white/5 pb-3 md:pb-4 overflow-x-auto scrollbar-hide -mx-3 px-3 md:mx-0 md:px-0">
                {(['overview', 'posts', 'shorts', 'reports'] as TabType[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={cn(
                            "px-3 md:px-6 py-2 md:py-2.5 text-xs md:text-sm font-bold rounded-xl transition-all uppercase tracking-wider whitespace-nowrap flex-shrink-0",
                            activeTab === tab
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "text-slate-500 hover:text-white hover:bg-white/5"
                        )}
                    >
                        {tab === 'overview' && <BarChart2 className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />}
                        {tab === 'posts' && <ImageIcon className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />}
                        {tab === 'shorts' && <Video className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />}
                        {tab === 'reports' && <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 inline mr-1.5 md:mr-2" />}
                        <span className="hidden sm:inline">{tab}</span>
                    </button>
                ))}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'overview' && (
                    <m.div
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
                            <m.div
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
                            </m.div>

                            {/* Content Distribution */}
                            <m.div
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
                            </m.div>
                        </div>

                        {/* Trust & Top Content */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Trust Score */}
                            <m.div
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
                            </m.div>

                            {/* Top Performing Content */}
                            <m.div
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
                            </m.div>
                        </div>
                    </m.div>
                )}

                {activeTab === 'posts' && (
                    <m.div
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
                    </m.div>
                )}

                {activeTab === 'shorts' && (
                    <m.div
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
                    </m.div>
                )}

                {activeTab === 'reports' && (
                    <m.div
                        key="reports"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-4 md:space-y-6"
                    >
                        {/* Reports Summary Stats */}
                        <div className="grid grid-cols-3 gap-2 md:gap-4">
                            <m.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6"
                            >
                                <div className="flex items-center justify-between mb-2 md:mb-4">
                                    <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total</span>
                                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                </div>
                                <p className="text-xl md:text-3xl font-heading font-extrabold text-white">
                                    {(reportsData as any)?.data?.summary?.totalReports || 0}
                                </p>
                            </m.div>

                            <m.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.05 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6"
                            >
                                <div className="flex items-center justify-between mb-2 md:mb-4">
                                    <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Confidence</span>
                                    <ShieldCheck className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                                </div>
                                <p className="text-xl md:text-3xl font-heading font-extrabold text-white">
                                    {(reportsData as any)?.data?.summary?.avgConfidence || 0}%
                                </p>
                            </m.div>

                            <m.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl md:rounded-2xl p-3 md:p-6"
                            >
                                <div className="flex items-center justify-between mb-2 md:mb-4">
                                    <span className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase tracking-widest">Authentic</span>
                                    <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                                </div>
                                <div className="flex items-baseline gap-1 md:gap-2">
                                    <p className="text-xl md:text-3xl font-heading font-extrabold text-emerald-400">
                                        {(reportsData as any)?.data?.summary?.verdictCounts?.authentic || 0}
                                    </p>
                                    <span className="text-sm text-slate-500">
                                        / {(reportsData as any)?.data?.summary?.totalReports || 0}
                                    </span>
                                </div>
                            </m.div>
                        </div>

                        {/* Reports List */}
                        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-xl md:rounded-2xl p-4 md:p-6">
                            <div className="flex items-center justify-between mb-4 md:mb-6">
                                <div>
                                    <h3 className="font-heading font-bold text-base md:text-lg text-white">AI Authenticity Reports</h3>
                                    <p className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest">Your generated PDF reports</p>
                                </div>
                                <FileText className="w-5 h-5 text-primary" />
                            </div>

                            {loadingReports ? (
                                <div className="flex justify-center py-16">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                </div>
                            ) : ((reportsData as any)?.data?.reports?.length || 0) > 0 ? (
                                <div className="space-y-3 md:space-y-4">
                                    {((reportsData as any)?.data?.reports || []).map((report: any, index: number) => (
                                        <m.div
                                            key={report._id}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="flex items-center gap-2.5 md:gap-4 p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:bg-white/[0.05] transition-all group"
                                        >
                                            {/* Thumbnail */}
                                            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
                                                {(() => {
                                                    // Try to get thumbnail from various sources
                                                    const mediaUrl = report.post?.media?.[0]?.url ||
                                                        report.post?.media?.[0]?.optimizedUrl ||
                                                        report.post?.thumbnail ||
                                                        report.post?.image;
                                                    const videoUrl = report.post?.video ||
                                                        (report.post?.media?.[0]?.type === 'video' ? report.post?.media?.[0]?.url : null);

                                                    // For video, generate thumbnail from Cloudinary
                                                    const thumbnailUrl = videoUrl && videoUrl.includes('cloudinary')
                                                        ? videoUrl.replace('/upload/', '/upload/so_0,f_jpg,w_100,h_100,c_fill/')
                                                        : mediaUrl;

                                                    if (thumbnailUrl) {
                                                        return <img src={thumbnailUrl} alt="" className="w-full h-full object-cover" />;
                                                    }

                                                    // Fallback icon
                                                    return (
                                                        <div className="w-full h-full flex items-center justify-center">
                                                            {report.post?.mediaType === 'video' ? (
                                                                <Video className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
                                                            ) : (
                                                                <ImageIcon className="w-5 h-5 md:w-6 md:h-6 text-slate-500" />
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                <div className={cn(
                                                    "absolute top-0.5 left-0.5 md:top-1 md:left-1 px-1 md:px-1.5 py-0.5 rounded text-[6px] md:text-[8px] font-bold uppercase",
                                                    report.post?.mediaType === 'video' ? "bg-purple-500/80 text-white" : "bg-blue-500/80 text-white"
                                                )}>
                                                    {report.post?.mediaType || 'post'}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs md:text-sm text-white font-medium truncate">
                                                    {report.post?.content || 'No caption'}
                                                </p>
                                                <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-1.5 flex-wrap">
                                                    <span className="text-[9px] md:text-[10px] text-slate-500 font-bold flex items-center gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                                                    </span>
                                                    <span className={cn(
                                                        "text-[8px] font-bold uppercase px-1.5 py-0.5 rounded flex items-center gap-1",
                                                        report.report?.verdict === 'authentic' ? "bg-emerald-500/20 text-emerald-400" :
                                                            report.report?.verdict === 'suspicious' ? "bg-amber-500/20 text-amber-400" :
                                                                "bg-rose-500/20 text-rose-400"
                                                    )}>
                                                        {report.report?.verdict === 'authentic' && <CheckCircle className="w-3 h-3" />}
                                                        {report.report?.verdict === 'suspicious' && <AlertTriangle className="w-3 h-3" />}
                                                        {report.report?.verdict === 'fake' && <XCircle className="w-3 h-3" />}
                                                        {report.report?.verdict || 'unknown'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 font-bold">
                                                        {Math.round((report.report?.confidence || 0) * 100)}% confidence
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Download Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={async () => {
                                                    try {
                                                        toast.loading('Generating PDF...', { id: 'pdf-download' });
                                                        const response = await api.post(`/posts/${report.postId}/download-pdf-report`, {});
                                                        const data = response as any;
                                                        if (data?.data?.pdf_base64) {
                                                            // Convert base64 to blob and download
                                                            const byteCharacters = atob(data.data.pdf_base64);
                                                            const byteNumbers = new Array(byteCharacters.length);
                                                            for (let i = 0; i < byteCharacters.length; i++) {
                                                                byteNumbers[i] = byteCharacters.charCodeAt(i);
                                                            }
                                                            const byteArray = new Uint8Array(byteNumbers);
                                                            const blob = new Blob([byteArray], { type: 'application/pdf' });
                                                            const url = window.URL.createObjectURL(blob);
                                                            const a = document.createElement('a');
                                                            a.href = url;
                                                            // Generate filename with content type
                                                            const contentType = report.post?.mediaType === 'video' ? 'short' : 'feed';
                                                            const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '');
                                                            a.download = `truevibe-${contentType}-report-${date}.pdf`;
                                                            document.body.appendChild(a);
                                                            a.click();
                                                            document.body.removeChild(a);
                                                            window.URL.revokeObjectURL(url);
                                                            toast.success('PDF downloaded!', { id: 'pdf-download' });
                                                        } else {
                                                            throw new Error('No PDF data received');
                                                        }
                                                    } catch (error) {
                                                        console.error('Download error:', error);
                                                        toast.error('Failed to download PDF', { id: 'pdf-download' });
                                                    }
                                                }}
                                                className="text-primary hover:text-white hover:bg-primary/20 gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                <span className="hidden sm:inline text-xs font-bold">PDF</span>
                                            </Button>

                                            {/* Delete Button */}
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                disabled={deleteReport.isPending}
                                                onClick={async () => {
                                                    if (deletingReportId === report._id) {
                                                        // Confirm delete
                                                        try {
                                                            await deleteReport.mutateAsync(report.postId);
                                                            toast.success('Report deleted successfully');
                                                            setDeletingReportId(null);
                                                        } catch (error) {
                                                            console.error('Delete error:', error);
                                                            toast.error('Failed to delete report');
                                                            setDeletingReportId(null);
                                                        }
                                                    } else {
                                                        // First click - show confirmation
                                                        setDeletingReportId(report._id);
                                                        // Auto-reset after 3 seconds if not confirmed
                                                        setTimeout(() => setDeletingReportId((prev) => prev === report._id ? null : prev), 3000);
                                                    }
                                                }}
                                                className={cn(
                                                    "gap-1.5 transition-all",
                                                    deletingReportId === report._id
                                                        ? "text-white bg-rose-500 hover:bg-rose-600"
                                                        : "text-rose-400 hover:text-white hover:bg-rose-500/20"
                                                )}
                                            >
                                                {deleteReport.isPending && deletingReportId === report._id ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-4 h-4" />
                                                )}
                                                <span className="hidden sm:inline text-xs font-bold">
                                                    {deletingReportId === report._id ? 'Confirm?' : ''}
                                                </span>
                                            </Button>
                                        </m.div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <FileText className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                                    <h3 className="font-bold text-lg text-white mb-2">No Reports Yet</h3>
                                    <p className="text-slate-500 text-sm max-w-xs mx-auto">
                                        Generate AI authenticity reports for your posts by clicking "View Report" on any post with media.
                                    </p>
                                </div>
                            )}
                        </div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
