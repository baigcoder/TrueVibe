import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/client';
import {
    Shield, AlertTriangle, Users, FileWarning, CheckCircle2,
    Ban, Loader2, RefreshCw, Eye, Trash2, MessageCircle, Image,
    TrendingUp, AlertOctagon, UserX, Activity
} from 'lucide-react';
// Avatar imports removed - not currently used
// import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type TabType = 'overview' | 'reports' | 'queue' | 'users';

export default function ModerationDashboard() {
    const [activeTab, setActiveTab] = useState<TabType>('overview');
    const queryClient = useQueryClient();

    // Queries
    const { data: statsData, isLoading: loadingStats } = useQuery({
        queryKey: ['admin', 'stats'],
        queryFn: adminApi.getStats,
        refetchInterval: 30000, // Refresh every 30s
    });

    const { data: queueData, isLoading: loadingQueue } = useQuery({
        queryKey: ['admin', 'queue'],
        queryFn: () => adminApi.getModerationQueue(50),
    });

    const { data: reportsData, isLoading: loadingReports, refetch: refetchReports } = useQuery({
        queryKey: ['admin', 'reports'],
        queryFn: () => adminApi.getReports('pending', 50),
    });

    const stats = (statsData as any)?.data as any;
    const queue = (queueData as any)?.data as any;
    const reports = ((reportsData as any)?.data?.reports as any[]) || [];

    const tabs: { id: TabType; label: string; icon: typeof Shield }[] = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'reports', label: 'Reports', icon: FileWarning },
        { id: 'queue', label: 'Mod Queue', icon: AlertTriangle },
        { id: 'users', label: 'Users', icon: Users },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-orange-500/20 border border-rose-500/20">
                            <Shield className="w-8 h-8 text-rose-400" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Content Moderation</h1>
                            <p className="text-white/50 text-sm">Review and manage flagged content</p>
                        </div>
                    </div>
                    <Button
                        onClick={() => {
                            queryClient.invalidateQueries({ queryKey: ['admin'] });
                            toast.success('Refreshed all data');
                        }}
                        variant="outline"
                        className="border-white/10 text-white hover:bg-white/5"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh
                    </Button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl w-fit">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                                activeTab === tab.id
                                    ? "bg-primary text-white shadow-lg"
                                    : "text-white/60 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <OverviewTab stats={stats} loading={loadingStats} queue={queue} />
                    )}
                    {activeTab === 'reports' && (
                        <ReportsTab
                            reports={reports}
                            loading={loadingReports}
                            onRefresh={() => refetchReports()}
                        />
                    )}
                    {activeTab === 'queue' && (
                        <QueueTab queue={queue} loading={loadingQueue} />
                    )}
                    {activeTab === 'users' && (
                        <UsersTab stats={stats} />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}

// Overview Tab
function OverviewTab({ stats, loading, queue }: { stats: any; loading: boolean; queue: any }) {
    if (loading) {
        return <LoadingSpinner />;
    }

    const statCards = [
        {
            label: 'Total Users',
            value: stats?.users?.total || 0,
            icon: Users,
            color: 'from-blue-500/20 to-cyan-500/20',
            iconColor: 'text-blue-400'
        },
        {
            label: 'Active Users',
            value: stats?.users?.active || 0,
            icon: TrendingUp,
            color: 'from-green-500/20 to-emerald-500/20',
            iconColor: 'text-green-400'
        },
        {
            label: 'Pending Reports',
            value: stats?.pendingReports || 0,
            icon: FileWarning,
            color: 'from-amber-500/20 to-orange-500/20',
            iconColor: 'text-amber-400'
        },
        {
            label: 'Suspended Users',
            value: stats?.users?.suspended || 0,
            icon: UserX,
            color: 'from-rose-500/20 to-red-500/20',
            iconColor: 'text-rose-400'
        },
    ];

    const contentStats = [
        { label: 'Total Posts', value: stats?.posts?.total || 0 },
        { label: 'Authentic', value: stats?.posts?.authentic || 0, color: 'text-green-400' },
        { label: 'Suspicious', value: stats?.posts?.suspicious || 0, color: 'text-amber-400' },
        { label: 'Likely Fake', value: stats?.posts?.fake || 0, color: 'text-rose-400' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {statCards.map((stat) => (
                    <div
                        key={stat.label}
                        className={cn(
                            "p-5 rounded-2xl bg-gradient-to-br border border-white/10",
                            stat.color
                        )}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <stat.icon className={cn("w-6 h-6", stat.iconColor)} />
                        </div>
                        <p className="text-3xl font-bold text-white">{stat.value.toLocaleString()}</p>
                        <p className="text-sm text-white/50">{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* Content Distribution */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4">Content Trust Distribution</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {contentStats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <p className={cn("text-2xl font-bold", stat.color || "text-white")}>
                                {stat.value.toLocaleString()}
                            </p>
                            <p className="text-sm text-white/50">{stat.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Queue Preview */}
            <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white">Moderation Queue Preview</h3>
                    <span className="text-sm text-white/50">
                        {(queue?.flaggedComments?.length || 0) + (queue?.suspiciousPosts?.length || 0)} items
                    </span>
                </div>
                <div className="space-y-2">
                    {queue?.flaggedComments?.slice(0, 3).map((comment: any) => (
                        <div key={comment._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <MessageCircle className="w-4 h-4 text-amber-400" />
                            <span className="text-sm text-white/70 truncate flex-1">{comment.content}</span>
                            <span className="text-xs text-white/40">Flagged comment</span>
                        </div>
                    ))}
                    {queue?.suspiciousPosts?.slice(0, 3).map((post: any) => (
                        <div key={post._id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
                            <AlertOctagon className="w-4 h-4 text-rose-400" />
                            <span className="text-sm text-white/70 truncate flex-1">{post.content || 'Media post'}</span>
                            <span className="text-xs text-white/40">{post.trustLevel}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

// Reports Tab
function ReportsTab({ reports, loading, onRefresh }: { reports: any[]; loading: boolean; onRefresh: () => void }) {
    const [selectedReport, setSelectedReport] = useState<any>(null);
    const [resolution, setResolution] = useState('');
    const queryClient = useQueryClient();

    const resolveMutation = useMutation({
        mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution: string }) =>
            adminApi.resolveReport(id, { status, resolution }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin'] });
            toast.success('Report resolved');
            setSelectedReport(null);
            setResolution('');
        },
        onError: () => toast.error('Failed to resolve report'),
    });

    if (loading) return <LoadingSpinner />;

    const reasonColors: Record<string, string> = {
        spam: 'bg-gray-500/20 text-gray-400',
        harassment: 'bg-red-500/20 text-red-400',
        hate_speech: 'bg-rose-500/20 text-rose-400',
        misinformation: 'bg-amber-500/20 text-amber-400',
        deepfake: 'bg-purple-500/20 text-purple-400',
        violence: 'bg-red-500/20 text-red-400',
        nudity: 'bg-pink-500/20 text-pink-400',
        copyright: 'bg-blue-500/20 text-blue-400',
        other: 'bg-slate-500/20 text-slate-400',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
        >
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">
                    Pending Reports ({reports.length})
                </h3>
                <Button onClick={onRefresh} size="sm" variant="ghost" className="text-white/60">
                    <RefreshCw className="w-4 h-4" />
                </Button>
            </div>

            {reports.length === 0 ? (
                <div className="text-center py-12 text-white/50">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-400" />
                    <p>No pending reports! 🎉</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {reports.map((report: any) => (
                        <div
                            key={report._id}
                            className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded-full text-xs font-medium",
                                            reasonColors[report.reason] || reasonColors.other
                                        )}>
                                            {report.reason.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-white/40">
                                            {report.targetType}
                                        </span>
                                        <span className="text-xs text-white/30">
                                            {formatDistanceToNow(new Date(report.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {report.description && (
                                        <p className="text-sm text-white/70">{report.description}</p>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSelectedReport(report)}
                                        className="text-white/60 hover:text-white"
                                    >
                                        <Eye className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => resolveMutation.mutate({
                                            id: report._id,
                                            status: 'resolved',
                                            resolution: 'Content removed'
                                        })}
                                        disabled={resolveMutation.isPending}
                                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => resolveMutation.mutate({
                                            id: report._id,
                                            status: 'dismissed',
                                            resolution: 'No violation found'
                                        })}
                                        disabled={resolveMutation.isPending}
                                        className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Report Detail Modal */}
            <AnimatePresence>
                {selectedReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                        onClick={() => setSelectedReport(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 rounded-2xl p-6 max-w-lg w-full border border-white/10"
                        >
                            <h3 className="text-lg font-semibold text-white mb-4">Review Report</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-sm text-white/50">Reason</p>
                                    <p className="text-white">{selectedReport.reason}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-white/50">Description</p>
                                    <p className="text-white/80">{selectedReport.description || 'No description'}</p>
                                </div>
                                <Textarea
                                    value={resolution}
                                    onChange={(e) => setResolution(e.target.value)}
                                    placeholder="Add resolution notes..."
                                    className="bg-white/5 border-white/10 text-white"
                                />
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        onClick={() => setSelectedReport(null)}
                                        className="text-white/60"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => resolveMutation.mutate({
                                            id: selectedReport._id,
                                            status: 'dismissed',
                                            resolution: resolution || 'No violation found',
                                        })}
                                        variant="outline"
                                        className="border-green-500/50 text-green-400 hover:bg-green-500/10"
                                    >
                                        Dismiss
                                    </Button>
                                    <Button
                                        onClick={() => resolveMutation.mutate({
                                            id: selectedReport._id,
                                            status: 'resolved',
                                            resolution: resolution || 'Content removed',
                                        })}
                                        className="bg-rose-500 hover:bg-rose-600"
                                    >
                                        Remove Content
                                    </Button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// Queue Tab
function QueueTab({ queue, loading }: { queue: any; loading: boolean }) {
    if (loading) return <LoadingSpinner />;

    const flaggedComments = queue?.flaggedComments || [];
    const suspiciousPosts = queue?.suspiciousPosts || [];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            {/* Flagged Comments */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="w-5 h-5 text-amber-400" />
                    Flagged Comments ({flaggedComments.length})
                </h3>
                {flaggedComments.length === 0 ? (
                    <p className="text-white/50 text-center py-6">No flagged comments</p>
                ) : (
                    <div className="space-y-2">
                        {flaggedComments.map((comment: any) => (
                            <div key={comment._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <p className="text-white/80 mb-2">{comment.content}</p>
                                <div className="flex items-center justify-between text-xs text-white/40">
                                    <span>Reason: {comment.flagReason || 'Not specified'}</span>
                                    <span>{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Suspicious Posts */}
            <div>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <AlertOctagon className="w-5 h-5 text-rose-400" />
                    Suspicious Posts ({suspiciousPosts.length})
                </h3>
                {suspiciousPosts.length === 0 ? (
                    <p className="text-white/50 text-center py-6">No suspicious posts</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {suspiciousPosts.map((post: any) => (
                            <div key={post._id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className={cn(
                                        "px-2 py-1 rounded-lg text-xs font-medium",
                                        post.trustLevel === 'suspicious'
                                            ? "bg-amber-500/20 text-amber-400"
                                            : "bg-rose-500/20 text-rose-400"
                                    )}>
                                        {post.trustLevel}
                                    </div>
                                    <span className="text-xs text-white/40">
                                        Score: {post.trustScore || 'N/A'}
                                    </span>
                                </div>
                                <p className="text-white/80 text-sm line-clamp-3">{post.content || 'Media post'}</p>
                                {post.media?.length > 0 && (
                                    <div className="flex items-center gap-1 mt-2 text-xs text-white/40">
                                        <Image className="w-3 h-3" />
                                        {post.media.length} media
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// Users Tab (placeholder for user management)
function UsersTab({ stats }: { stats: any }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
        >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-6 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 border border-white/10">
                    <Users className="w-8 h-8 text-green-400 mb-3" />
                    <p className="text-3xl font-bold text-white">{stats?.users?.active || 0}</p>
                    <p className="text-sm text-white/50">Active Users</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-500/20 border border-white/10">
                    <Ban className="w-8 h-8 text-rose-400 mb-3" />
                    <p className="text-3xl font-bold text-white">{stats?.users?.suspended || 0}</p>
                    <p className="text-sm text-white/50">Suspended Users</p>
                </div>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10">
                    <TrendingUp className="w-8 h-8 text-blue-400 mb-3" />
                    <p className="text-3xl font-bold text-white">{stats?.users?.total || 0}</p>
                    <p className="text-sm text-white/50">Total Users</p>
                </div>
            </div>

            <div className="p-6 rounded-2xl bg-white/5 border border-white/10 text-center">
                <UserX className="w-12 h-12 mx-auto mb-4 text-white/30" />
                <p className="text-white/50">User search and management coming soon</p>
                <p className="text-sm text-white/30 mt-1">Use the API to suspend/restore users for now</p>
            </div>
        </motion.div>
    );
}

function LoadingSpinner() {
    return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
}
