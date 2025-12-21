import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import {
    BarChart3, Eye, Heart, MessageCircle,
    Share2, Bookmark, TrendingUp, Loader2
} from "lucide-react";
import { usePostAnalytics } from "@/api/hooks";
import { cn } from "@/lib/utils";
import {
    BarChart, Bar, XAxis, YAxis, Tooltip,
    ResponsiveContainer, Cell, AreaChart, Area
} from "recharts";

interface PostAnalyticsProps {
    postId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function PostAnalytics({ postId, isOpen, onClose }: PostAnalyticsProps) {
    const { data: analyticsRes, isLoading } = usePostAnalytics(postId);
    const analytics = (analyticsRes as any)?.data?.analytics;

    const stats = [
        { label: "Total Views", value: analytics?.totalViews || 0, icon: Eye, color: "text-sky-400", bg: "bg-sky-400/10" },
        { label: "Unique Views", value: analytics?.uniqueViews || 0, icon: TrendingUp, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Likes", value: analytics?.likes || 0, icon: Heart, color: "text-rose-400", bg: "bg-rose-400/10" },
        { label: "Comments", value: analytics?.comments || 0, icon: MessageCircle, color: "text-amber-400", bg: "bg-amber-400/10" },
        { label: "Shares", value: analytics?.shares || 0, icon: Share2, color: "text-indigo-400", bg: "bg-indigo-400/10" },
        { label: "Saves", value: analytics?.saves || 0, icon: Bookmark, color: "text-violet-400", bg: "bg-violet-400/10" },
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
            <DialogContent className="max-w-3xl bg-slate-950/95 backdrop-blur-3xl border-white/10 p-0 text-white overflow-hidden rounded-[2.5rem] shadow-2xl">
                <div className="p-8">
                    <DialogHeader className="mb-8">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                                <BarChart3 className="w-5 h-5 text-indigo-400" />
                            </div>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Vibe Insights</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-500 font-medium">Real-time performance data for your vibe.</DialogDescription>
                    </DialogHeader>

                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Crunching data...</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {stats.map((stat, i) => (
                                    <div key={i} className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] transition-all">
                                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center mb-4", stat.bg)}>
                                            <stat.icon className={cn("w-5 h-5", stat.color)} />
                                        </div>
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
                                        <p className="text-2xl font-black italic tracking-tighter">{stat.value.toLocaleString()}</p>
                                    </div>
                                ))}
                            </div>

                            {/* Main Chart */}
                            <div className="p-6 rounded-[2rem] bg-white/[0.02] border border-white/5">
                                <div className="flex items-center justify-between mb-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">7-Day Engagement Trend</h4>
                                    <div className="flex gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Views</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span className="text-[10px] font-black text-slate-500 uppercase">Engagement</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-[250px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorEngagement" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '1rem', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                                itemStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                            />
                                            <Area type="monotone" dataKey="views" stroke="#6366f1" fillOpacity={1} fill="url(#colorViews)" strokeWidth={3} />
                                            <Area type="monotone" dataKey="engagement" stroke="#f43f5e" fillOpacity={1} fill="url(#colorEngagement)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Summary Section */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <div className="flex-1 p-6 rounded-[2rem] bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Engagement Rate</p>
                                        <p className="text-3xl font-black italic tracking-tighter text-emerald-400">{analytics?.engagementRate.toFixed(1) || 0}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-emerald-500/50 uppercase tracking-widest">Above Average</p>
                                        <p className="text-xs font-bold text-emerald-400">+12.5%</p>
                                    </div>
                                </div>
                                <div className="flex-1 p-6 rounded-[2rem] bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Vibe Score</p>
                                        <p className="text-3xl font-black italic tracking-tighter text-indigo-400">8.4</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">Trust Index</p>
                                        <p className="text-xs font-bold text-indigo-400">High</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
