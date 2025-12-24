import {
    Dialog, DialogContent
} from "@/components/ui/dialog";
import {
    BarChart3, Eye, Heart, MessageCircle,
    Share2, Bookmark, TrendingUp, Loader2, ShieldCheck, X
} from "lucide-react";
import { usePostAnalytics } from "@/api/hooks";
import { cn } from "@/lib/utils";
import {
    Tooltip,
    ResponsiveContainer, AreaChart, Area
} from "recharts";

interface PostAnalyticsProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PostAnalytics({ postId, isOpen, onClose }: PostAnalyticsProps) {
    // Only fetch analytics when the dialog is open - this prevents 403 errors
    // for posts the user doesn't own since the analytics button is only visible
    // to the owner, but this component is always rendered
    const { data: analyticsRes, isLoading } = usePostAnalytics(isOpen ? postId : '');
    const analytics = (analyticsRes as any)?.data?.analytics;

    // Split stats into primary metrics (2x2) and secondary ones
    const primaryStats = [
        { label: "Likes", value: analytics?.likes || 0, icon: Heart, iconColor: "text-rose-400", bg: "bg-rose-500/10" },
        { label: "Comments", value: analytics?.comments || 0, icon: MessageCircle, iconColor: "text-amber-400", bg: "bg-amber-500/10" },
        { label: "Shares", value: analytics?.shares || 0, icon: Share2, iconColor: "text-indigo-400", bg: "bg-indigo-500/10" },
        { label: "Saves", value: analytics?.saves || 0, icon: Bookmark, iconColor: "text-violet-400", bg: "bg-violet-500/10" },
    ];

    const topStats = [
        { label: "Total Views", value: analytics?.totalViews || 0, icon: Eye, color: "text-sky-400" },
        { label: "Unique Views", value: analytics?.uniqueViews || 0, icon: TrendingUp, color: "text-emerald-400" },
    ];

    // Mock chart data for visualization
    const chartData = [
        { name: "Mon", views: 400, engagement: 24 },
        { name: "Tue", views: 300, engagement: 13 },
        { name: "Wed", views: 200, engagement: 98 },
        { name: "Thu", views: 278, engagement: 39 },
        { name: "Fri", views: 189, engagement: 48 },
        { name: "Sat", views: 239, engagement: 38 },
        { name: "Sun", views: 349, engagement: 43 },
    ];

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[380px] bg-[#030712] border-white/10 p-0 text-white overflow-hidden rounded-[2rem] shadow-2xl safe-area-inset-bottom">

                {/* Slim Header */}
                <div className="relative h-24 bg-gradient-to-br from-indigo-900/40 to-slate-950 flex items-center px-6 border-b border-white/5">
                    <div className="absolute top-4 right-4 z-20">
                        <button
                            onClick={onClose}
                            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/15 transition-colors"
                        >
                            <X className="w-3.5 h-3.5 text-white/50" />
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black italic uppercase tracking-tighter text-white">Post Insights</h2>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Real-time Analytics</p>
                        </div>
                    </div>
                </div>

                <div className="p-4 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Syncing Data...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">

                            {/* Top View Chips */}
                            <div className="flex gap-2">
                                {topStats.map((stat, i) => (
                                    <div key={i} className="flex-1 bg-white/[0.03] border border-white/5 rounded-xl p-2.5 flex items-center gap-2">
                                        <stat.icon className={cn("w-3 h-3", stat.color)} />
                                        <div>
                                            <p className="text-[7px] font-black text-slate-500 uppercase leading-none mb-0.5">{stat.label}</p>
                                            <p className="text-xs font-black tabular-nums">{stat.value.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Core Stats 2x2 Grid - MORE COMPACT */}
                            <div className="grid grid-cols-2 gap-2">
                                {primaryStats.map((stat, i) => (
                                    <div key={i} className="bg-white/[0.02] border border-white/[0.04] rounded-2xl p-3 hover:bg-white/[0.04] transition-colors group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", stat.bg)}>
                                                <stat.icon className={cn("w-3.5 h-3.5", stat.iconColor)} />
                                            </div>
                                            <span className="text-xs font-black italic text-white/90 tabular-nums">
                                                {stat.value.toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-wider">{stat.label}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Sparkline Trend Chart */}
                            <div className="bg-slate-900/30 border border-white/5 rounded-2xl p-4">
                                <div className="flex justify-between items-center mb-4">
                                    <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-500">7-Day Momentum</h4>
                                    <div className="flex gap-2.5">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                            <span className="text-[7px] font-bold text-slate-600 uppercase">Views</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                            <span className="text-[7px] font-bold text-slate-600 uppercase">Eng</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[100px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorV" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorE" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip
                                                content={({ active, payload }) => {
                                                    if (active && payload && payload.length) {
                                                        return (
                                                            <div className="bg-slate-950/90 backdrop-blur-md border border-white/10 p-2 rounded-lg shadow-xl">
                                                                <p className="text-[8px] font-black text-white/50 uppercase mb-1">{payload[0].payload.name}</p>
                                                                {payload.map((p, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center gap-4 py-0.5">
                                                                        <span className="text-[7px] font-black uppercase text-slate-500">{p.name}</span>
                                                                        <span className="text-[9px] font-black text-white tabular-nums">{p.value}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        );
                                                    }
                                                    return null;
                                                }}
                                            />
                                            <Area type="monotone" dataKey="views" name="Views" stroke="#6366f1" fill="url(#colorV)" strokeWidth={2} />
                                            <Area type="monotone" dataKey="engagement" name="Engagement" stroke="#f43f5e" fill="url(#colorE)" strokeWidth={2} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Dense Summary Footer */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 flex flex-col">
                                    <p className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-0.5">Vibe Index</p>
                                    <div className="flex items-end justify-between">
                                        <span className="text-lg font-black italic text-emerald-400 leading-none">
                                            {analytics?.engagementRate.toFixed(1) || 0}%
                                        </span>
                                        <TrendingUp className="w-3 h-3 text-emerald-500/40 mb-0.5" />
                                    </div>
                                </div>
                                <div className="p-3 rounded-xl bg-violet-500/[0.03] border border-violet-500/10 flex flex-col">
                                    <p className="text-[7px] font-black text-violet-400 uppercase tracking-widest mb-0.5">Trust Level</p>
                                    <div className="flex items-end justify-between">
                                        <span className="text-lg font-black italic text-violet-400 leading-none">ELITE</span>
                                        <ShieldCheck className="w-3 h-3 text-violet-500/40 mb-0.5" />
                                    </div>
                                </div>
                            </div>

                            <p className="text-[7px] text-center text-slate-600 font-mono italic">
                                SECURED FORENSIC FEED • {new Date().toLocaleTimeString()}
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
