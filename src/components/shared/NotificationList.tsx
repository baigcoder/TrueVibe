import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, useFollowRequests, useSuggestedUsers, useAcceptFollowRequest, useRejectFollowRequest, useFollow } from "@/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Heart, MessageSquare, UserPlus, Repeat, Loader2, ChevronRight, CheckCheck, AtSign, Users, Plus, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { m, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";

export function NotificationList() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'notifications' | 'requests' | 'suggestions'>('notifications');
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
    const { data: requestsData, isLoading: isLoadingRequests } = useFollowRequests();
    const { data: suggestionsData, isLoading: isLoadingSuggestions } = useSuggestedUsers(10);

    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();
    const acceptMutation = useAcceptFollowRequest();
    const rejectMutation = useRejectFollowRequest();
    const followMutation = useFollow();

    const notifications = (data as any)?.pages?.flatMap((page: any) => page.data.notifications) || [];
    const unreadCount = notifications.filter((n: any) => !n.isRead).length;

    const requests = (requestsData as any)?.pages?.[0]?.data?.requests || [];
    const suggestions = (suggestionsData as any)?.data?.suggestions || [];

    const getIconConfig = (type: string) => {
        switch (type) {
            case 'like': return { icon: Heart, color: "text-rose-400", bg: "bg-rose-500/10" };
            case 'message':
            case 'comment': return { icon: MessageSquare, color: "text-blue-400", bg: "bg-blue-500/10" };
            case 'follow': return { icon: UserPlus, color: "text-emerald-400", bg: "bg-emerald-500/10" };
            case 'repost': return { icon: Repeat, color: "text-purple-400", bg: "bg-purple-500/10" };
            case 'mention': return { icon: AtSign, color: "text-sky-400", bg: "bg-sky-500/10" };
            default: return { icon: Bell, color: "text-slate-400", bg: "bg-white/10" };
        }
    };

    if (isLoading && activeTab === 'notifications') {
        return (
            <div className="flex items-center justify-center py-10 bg-[#0f172a]/95 backdrop-blur-3xl rounded-2xl border border-white/10 h-[480px] w-full glass-panel">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                        <Bell className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-xs text-slate-500 font-medium">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[480px] w-full bg-[#0f172a]/95 backdrop-blur-3xl border border-white/10 rounded-2xl overflow-hidden glass-panel shadow-2xl">
            {/* Tab Header */}
            <div className="px-2 py-2 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex bg-white/5 p-1 rounded-xl gap-1 w-full mr-2">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'notifications' ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Bell className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Alerts</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative",
                            activeTab === 'requests' ? "bg-secondary text-white shadow-lg" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Requests</span>
                        {requests.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-[8px] border-2 border-[#0f172a] text-white">
                                {requests.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'suggestions' ? "bg-indigo-500 text-white shadow-lg" : "text-slate-400 hover:text-white"
                        )}
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Match</span>
                    </button>
                </div>

                {activeTab === 'notifications' && unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-primary hover:text-white hover:bg-primary/20 rounded-lg shrink-0"
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending}
                    >
                        <CheckCheck className="w-4 h-4" />
                    </Button>
                )}
            </div>

            {/* Content Area */}
            <ScrollArea className="flex-1">
                <AnimatePresence mode="wait">
                    {activeTab === 'notifications' && (
                        <m.div
                            key="notifications"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="py-1"
                        >
                            {notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 px-4">
                                    <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3 text-slate-600">
                                        <Bell className="w-6 h-6" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                                </div>
                            ) : (
                                <div className="py-1">
                                    {notifications.slice(0, 10).map((notification: any, index: number) => {
                                        const sender = notification.sender || notification.senderId;
                                        const senderName = sender?.name || "Someone";
                                        const senderAvatar = sender?.avatar;
                                        const senderInitial = senderName.charAt(0).toUpperCase();
                                        const iconConfig = getIconConfig(notification.type);
                                        const Icon = iconConfig.icon;

                                        return (
                                            <m.div
                                                key={notification._id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: index * 0.05 }}
                                                className={cn(
                                                    "px-3 py-2.5 flex gap-3 transition-all cursor-pointer relative hover:bg-white/[0.03]",
                                                    !notification.isRead && "bg-primary/[0.03]"
                                                )}
                                                onClick={() => !notification.isRead && markRead.mutate(notification._id)}
                                            >
                                                {!notification.isRead && (
                                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                                                )}
                                                <div className="relative shrink-0">
                                                    <Avatar className="w-9 h-9 border border-white/10 rounded-lg">
                                                        <AvatarImage src={senderAvatar} className="object-cover" />
                                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-purple-500/20 text-white font-bold text-xs rounded-lg">
                                                            {senderInitial}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-md flex items-center justify-center", iconConfig.bg)}>
                                                        <Icon className={cn("w-3 h-3", iconConfig.color)} />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-white leading-relaxed">
                                                        <span className="font-bold">{senderName}</span>{" "}
                                                        <span className="text-slate-400">{notification.body}</span>
                                                    </p>
                                                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                                                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                                    </span>
                                                </div>
                                            </m.div>
                                        );
                                    })}

                                    {hasNextPage && (
                                        <div className="px-3 py-2">
                                            <Button
                                                variant="ghost"
                                                className="w-full h-8 text-[10px] text-slate-500 hover:text-white rounded-lg hover:bg-white/5 font-black uppercase tracking-widest"
                                                onClick={() => fetchNextPage()}
                                                disabled={isFetchingNextPage}
                                            >
                                                {isFetchingNextPage ? <Loader2 className="w-3 h-3 animate-spin" /> : "Load_More_Logs"}
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </m.div>
                    )}

                    {activeTab === 'requests' && (
                        <m.div
                            key="requests"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-3 space-y-3"
                        >
                            {isLoadingRequests ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mb-3">
                                        <UserPlus className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <p className="text-xs text-slate-500 font-bold uppercase tracking-widest italic">_Zero.Requests</p>
                                </div>
                            ) : (
                                requests.map((request: any) => (
                                    <div key={request._id} className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                                        <Avatar className="w-10 h-10 border border-white/10 rounded-xl shrink-0">
                                            <AvatarImage src={request.requester?.avatar} />
                                            <AvatarFallback className="bg-secondary/20 text-secondary font-black text-xs">{request.requester?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-white uppercase truncate">{request.requester?.name}</p>
                                            <p className="text-[8px] text-slate-500 font-bold tracking-widest truncate">@{request.requester?.handle}</p>
                                        </div>
                                        <div className="flex gap-1.5">
                                            <button
                                                onClick={() => acceptMutation.mutate(request._id, {
                                                    onSuccess: () => toast.success("Request accepted!")
                                                })}
                                                className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => rejectMutation.mutate(request._id)}
                                                className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </m.div>
                    )}

                    {activeTab === 'suggestions' && (
                        <m.div
                            key="suggestions"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="p-3 space-y-3"
                        >
                            {isLoadingSuggestions ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                </div>
                            ) : (
                                suggestions.map((user: any) => (
                                    <div
                                        key={user._id}
                                        className="bg-white/5 border border-white/5 rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/10 transition-all group"
                                        onClick={() => navigate({ to: `/app/profile/${user.userId || user._id}` as any })}
                                    >
                                        <Avatar className="w-10 h-10 border border-white/10 rounded-xl shrink-0">
                                            <AvatarImage src={user.avatar} />
                                            <AvatarFallback className="bg-indigo-500/20 text-indigo-400 font-black text-xs">{user.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-[10px] font-black text-white uppercase truncate group-hover:text-indigo-400 transition-colors">{user.name}</p>
                                            <p className="text-[8px] text-slate-500 font-bold tracking-widest truncate">@{user.handle}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                followMutation.mutate(user.userId || user._id, {
                                                    onSuccess: () => toast.success("Follow request sent!")
                                                });
                                            }}
                                            className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                                        >
                                            SYNC
                                        </button>
                                    </div>
                                ))
                            )}
                        </m.div>
                    )}
                </AnimatePresence>
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <Link
                    to={"/app/notifications" as any}
                    className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:text-white transition-all group"
                >
                    System_Logs.View_All
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
