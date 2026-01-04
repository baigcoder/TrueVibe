import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Bell, Heart, MessageCircle, UserPlus, AtSign,
    Check, CheckCheck, Loader2, RefreshCw, ChevronRight,
    Users, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead,
    useFollowRequests,
    useSuggestedUsers,
    useAcceptFollowRequest,
    useRejectFollowRequest,
    useFollow
} from "@/api/hooks";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";

type NotificationType = "all" | "mentions" | "likes" | "follows" | "messages";

const notificationIcons: Record<string, React.ElementType> = {
    like: Heart,
    mention: AtSign,
    follow: UserPlus,
    message: MessageCircle,
    comment: MessageCircle,
};

const notificationColors: Record<string, { icon: string; bg: string; glow: string }> = {
    like: { icon: "text-rose-400", bg: "bg-rose-500/10", glow: "shadow-rose-500/20" },
    mention: { icon: "text-sky-400", bg: "bg-sky-500/10", glow: "shadow-sky-500/20" },
    follow: { icon: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
    message: { icon: "text-violet-400", bg: "bg-violet-500/10", glow: "shadow-violet-500/20" },
    comment: { icon: "text-amber-400", bg: "bg-amber-500/10", glow: "shadow-amber-500/20" },
};

const filterTabs = [
    { id: "all", label: "All", icon: Bell },
    { id: "likes", label: "Likes", icon: Heart },
    { id: "mentions", label: "Mentions", icon: AtSign },
    { id: "follows", label: "Follows", icon: UserPlus },
    { id: "messages", label: "Messages", icon: MessageCircle },
];

export default function NotificationsPage() {
    const navigate = useNavigate();
    const [mainTab, setMainTab] = useState<'alerts' | 'requests' | 'suggestions'>('alerts');
    const [filter, setFilter] = useState<NotificationType>("all");

    const {
        data: notificationsData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useNotifications();

    const { data: requestsData, isLoading: isLoadingRequests } = useFollowRequests();
    const { data: suggestionsData, isLoading: isLoadingSuggestions } = useSuggestedUsers(20);

    const markAsRead = useMarkNotificationRead();
    const markAllAsRead = useMarkAllNotificationsRead();
    const acceptMutation = useAcceptFollowRequest();
    const rejectMutation = useRejectFollowRequest();
    const followMutation = useFollow();

    const allNotifications = (notificationsData as any)?.pages?.flatMap(
        (page: any) => page.data?.notifications || []
    ) || [];

    const requests = (requestsData as any)?.pages?.[0]?.data?.requests || [];
    const suggestions = (suggestionsData as any)?.data?.suggestions || [];

    const filteredNotifications = filter === "all"
        ? allNotifications
        : allNotifications.filter((n: any) => {
            if (filter === "likes") return n.type === "like";
            if (filter === "mentions") return n.type === "mention";
            if (filter === "follows") return n.type === "follow";
            if (filter === "messages") return n.type === "message";
            return true;
        });

    const unreadCount = allNotifications.filter((n: any) => !n.isRead).length;

    const handleMarkAsRead = (id: string) => {
        markAsRead.mutate(id);
    };

    const handleMarkAllAsRead = () => {
        markAllAsRead.mutate();
    };

    return (
        <div className="max-w-4xl mx-auto pb-24 lg:pb-6 relative z-10 px-3 sm:px-4">
            {/* Main Tabs - Social Hub Nav */}
            <div className="mb-8 flex bg-white/5 p-1.5 rounded-2xl sm:rounded-3xl border border-white/10 gap-1.5 shadow-2xl overflow-hidden glass-panel">
                <button
                    onClick={() => setMainTab('alerts')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
                        mainTab === 'alerts' ? "bg-primary text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Bell className={cn("w-4 h-4 transition-transform duration-500 group-hover:rotate-12", mainTab === 'alerts' ? "text-white" : "text-primary/60")} />
                    <span>Alerts</span>
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]" />
                    )}
                </button>
                <button
                    onClick={() => setMainTab('requests')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
                        mainTab === 'requests' ? "bg-secondary text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <UserPlus className={cn("w-4 h-4 transition-transform duration-500 group-hover:scale-110", mainTab === 'requests' ? "text-white" : "text-secondary/60")} />
                    <span>Requests</span>
                    {requests.length > 0 && (
                        <span className="ml-1 px-1.5 py-0.5 bg-rose-500 rounded-md text-[8px] font-black text-white">
                            {requests.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setMainTab('suggestions')}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-3 sm:py-4 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group",
                        mainTab === 'suggestions' ? "bg-indigo-500 text-white shadow-lg" : "text-slate-500 hover:text-white hover:bg-white/5"
                    )}
                >
                    <Users className={cn("w-4 h-4 transition-transform duration-500 group-hover:-rotate-12", mainTab === 'suggestions' ? "text-white" : "text-indigo-400/60")} />
                    <span>Matched</span>
                </button>
            </div>

            <AnimatePresence mode="wait">
                {mainTab === 'alerts' && (
                    <m.div
                        key="alerts"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        {/* Header Row - Stacks on mobile */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                            <div className="min-w-0">
                                <h1 className="text-lg sm:text-3xl font-black text-white uppercase tracking-tight italic aether-font truncate">
                                    Notifications
                                </h1>
                                <p className="text-[9px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest tech-font mt-0.5 sm:mt-1">
                                    {unreadCount} unread
                                </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => refetch()}
                                    className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </Button>
                                {unreadCount > 0 && (
                                    <Button
                                        onClick={handleMarkAllAsRead}
                                        disabled={markAllAsRead.isPending}
                                        className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl bg-primary hover:bg-primary/90 font-black text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest"
                                    >
                                        <CheckCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                                        <span className="hidden xs:inline">Clear</span> All
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Sub-Filters for Alerts - Scrollable on mobile */}
                        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 sm:pb-4 scrollbar-hide -mx-1 px-1">
                            {filterTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilter(tab.id as NotificationType)}
                                    className={cn(
                                        "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest transition-all whitespace-nowrap border",
                                        filter === tab.id
                                            ? "bg-white/10 text-white border-white/20 shadow-lg"
                                            : "bg-transparent text-slate-500 border-white/5 hover:border-white/10 hover:text-slate-300"
                                    )}
                                >
                                    <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span className="hidden xs:inline">{tab.label}</span>
                                    <span className="xs:hidden">{tab.label.slice(0, 3)}</span>
                                </button>
                            ))}
                        </div>

                        {/* Notifications List */}
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-4">
                                    <div className="relative">
                                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                        <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                                    </div>
                                    <span className="text-xs sm:text-sm text-slate-400 font-medium">Loading notifications...</span>
                                </div>
                            ) : filteredNotifications.length === 0 ? (
                                <m.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center py-16 sm:py-24 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[2.5rem] backdrop-blur-xl"
                                >
                                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-[1.5rem] bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4 sm:mb-6">
                                        <Bell className="w-7 h-7 sm:w-10 sm:h-10 text-slate-500" />
                                    </div>
                                    <h3 className="font-bold text-lg sm:text-xl text-white">No notifications yet</h3>
                                    <p className="text-slate-400 text-xs sm:text-sm mt-2 max-w-[260px] sm:max-w-[280px] mx-auto px-4">
                                        When you get likes, comments, or new followers, they'll show up here.
                                    </p>
                                </m.div>
                            ) : (
                                <AnimatePresence mode="popLayout">
                                    {filteredNotifications.map((notification: any, index: number) => {
                                        const Icon = notificationIcons[notification.type] || Bell;
                                        const colors = notificationColors[notification.type] || {
                                            icon: "text-slate-400",
                                            bg: "bg-white/10",
                                            glow: ""
                                        };

                                        // Get sender info
                                        const senderName = notification.sender?.name || "Someone";
                                        const senderAvatar = notification.sender?.avatar;
                                        const senderInitial = senderName.charAt(0).toUpperCase();

                                        return (
                                            <m.div
                                                key={notification._id}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, x: -50 }}
                                                transition={{ delay: index * 0.02 }}
                                                className={cn(
                                                    "group flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all relative overflow-hidden",
                                                    "bg-white/[0.02] border border-white/10 hover:border-white/20 hover:bg-white/[0.04]",
                                                    !notification.isRead && "border-l-2 sm:border-l-4 border-l-primary bg-primary/[0.02]"
                                                )}
                                            >
                                                {/* Notification Type Icon */}
                                                <div className={cn(
                                                    "shrink-0 w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center",
                                                    colors.bg
                                                )}>
                                                    <Icon className={cn("w-4 h-4 sm:w-5 sm:h-5", colors.icon)} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-start gap-2 sm:gap-3">
                                                        {/* Sender Avatar */}
                                                        {notification.sender && (
                                                            <Link
                                                                to="/app/profile/$id"
                                                                params={{ id: notification.sender._id }}
                                                                className="shrink-0"
                                                            >
                                                                <Avatar className="w-8 h-8 sm:w-10 sm:h-10 border border-white/20 rounded-lg sm:rounded-xl hover:scale-105 transition-transform">
                                                                    <AvatarImage src={senderAvatar} />
                                                                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-purple-500/30 text-white font-bold text-xs sm:text-sm rounded-lg sm:rounded-xl">
                                                                        {senderInitial}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                            </Link>
                                                        )}

                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-xs sm:text-sm text-white leading-relaxed">
                                                                {notification.sender && (
                                                                    <Link
                                                                        to="/app/profile/$id"
                                                                        params={{ id: notification.sender._id }}
                                                                        className="font-bold hover:text-primary transition-colors"
                                                                    >
                                                                        {senderName}
                                                                    </Link>
                                                                )}{" "}
                                                                <span className="text-slate-300">{notification.body}</span>
                                                            </p>
                                                            <span className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 block">
                                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Mark as Read Button */}
                                                {!notification.isRead && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleMarkAsRead(notification._id)}
                                                        className="shrink-0 h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                                    >
                                                        <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                                                    </Button>
                                                )}

                                                {/* Unread Indicator Dot */}
                                                {!notification.isRead && (
                                                    <div className="absolute top-2 right-2 sm:hidden w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                )}
                                            </m.div>
                                        );
                                    })}
                                </AnimatePresence>
                            )}

                            {/* Load More */}
                            {hasNextPage && (
                                <div className="flex justify-center pt-6 sm:pt-8">
                                    <Button
                                        variant="outline"
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                        className="h-10 sm:h-12 px-6 sm:px-8 rounded-xl sm:rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-xs sm:text-sm"
                                    >
                                        {isFetchingNextPage ? (
                                            <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin mr-2 sm:mr-3" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4 mr-2" />
                                        )}
                                        Load more
                                    </Button>
                                </div>
                            )}
                        </div>
                    </m.div>
                )}

                {mainTab === 'requests' && (
                    <m.div
                        key="requests"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight italic aether-font">
                                Connection_Requests
                            </h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest tech-font mt-1">
                                {requests.length} pending secure connections
                            </p>
                        </div>

                        {isLoadingRequests ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-secondary" /></div>
                        ) : requests.length === 0 ? (
                            <div className="text-center py-20 bg-white/[0.03] border border-white/10 rounded-[2.5rem] backdrop-blur-xl">
                                <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6">
                                    <UserPlus className="w-10 h-10 text-slate-500" />
                                </div>
                                <h3 className="font-bold text-xl text-white">Inbox Cleared</h3>
                                <p className="text-slate-400 text-sm mt-2 max-w-[280px] mx-auto">No pending follow requests at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {requests.map((request: any) => (
                                    <div key={request._id} className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 flex items-center gap-4 group hover:bg-white/[0.05] transition-all">
                                        <Avatar className="w-12 h-12 border-2 border-white/10 rounded-xl">
                                            <AvatarImage src={request.requester?.avatar} />
                                            <AvatarFallback className="bg-secondary/20 text-secondary font-black">{request.requester?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-black text-white uppercase truncate">{request.requester?.name}</p>
                                            <p className="text-[10px] text-slate-500 font-bold tracking-widest truncate">@{request.requester?.handle}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                onClick={() => acceptMutation.mutate(request._id, { onSuccess: () => toast.success("Connected!") })}
                                                className="h-10 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest"
                                            >
                                                Accept
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={() => rejectMutation.mutate(request._id)}
                                                className="h-10 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 font-black text-[10px] uppercase tracking-widest"
                                            >
                                                <X className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </m.div>
                )}

                {mainTab === 'suggestions' && (
                    <m.div
                        key="suggestions"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-6"
                    >
                        <div>
                            <h1 className="text-xl sm:text-3xl font-black text-white uppercase tracking-tight italic aether-font">
                                Vibe_Match_Discovery
                            </h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest tech-font mt-1">
                                High compatibility nodes discovered
                            </p>
                        </div>

                        {isLoadingSuggestions ? (
                            <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {suggestions.map((user: any) => (
                                    <div
                                        key={user._id}
                                        className="bg-white/[0.03] border border-white/10 rounded-[2rem] p-5 flex flex-col items-center text-center gap-4 relative overflow-hidden group hover:bg-white/[0.05] transition-all cursor-pointer"
                                        onClick={() => navigate({ to: `/app/profile/${user.userId || user._id}` as any })}
                                    >
                                        <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <Avatar className="w-20 h-20 border-4 border-white/10 rounded-[1.5rem] shadow-2xl relative mb-2">
                                            <AvatarImage src={user.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-indigo-500/20 text-indigo-400 font-black text-xl">{user.name?.[0]}</AvatarFallback>
                                        </Avatar>

                                        <div className="space-y-1">
                                            <h4 className="text-base font-black text-white uppercase tracking-tight aether-font italic truncate max-w-[150px]">{user.name}</h4>
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-[9px] text-slate-500 font-bold tracking-widest tech-font uppercase">@{user.handle}</span>
                                            </div>
                                        </div>

                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                followMutation.mutate(user.userId || user._id, {
                                                    onSuccess: () => toast.success("Sync request sent!")
                                                });
                                            }}
                                            className="w-full h-11 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95"
                                        >
                                            SYNC_VIBE
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
