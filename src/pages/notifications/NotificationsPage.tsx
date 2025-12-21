import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
    Bell, Heart, MessageCircle, UserPlus, AtSign,
    Check, CheckCheck, Loader2, RefreshCw, ChevronRight
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
    useNotifications,
    useMarkNotificationRead,
    useMarkAllNotificationsRead
} from "@/api/hooks";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";

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
    const [filter, setFilter] = useState<NotificationType>("all");

    const {
        data: notificationsData,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch
    } = useNotifications();

    const markAsRead = useMarkNotificationRead();
    const markAllAsRead = useMarkAllNotificationsRead();

    const allNotifications = (notificationsData as any)?.pages?.flatMap(
        (page: any) => page.data?.notifications || []
    ) || [];

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
            {/* Header */}
            <div className="mb-6 sm:mb-10">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 sm:gap-4">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 relative"
                        >
                            <Bell className="w-5 h-5 sm:w-7 sm:h-7 text-primary" />
                            {unreadCount > 0 && (
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-rose-500 flex items-center justify-center text-[9px] sm:text-[10px] font-black text-white shadow-lg"
                                >
                                    {unreadCount > 99 ? "99+" : unreadCount}
                                </motion.div>
                            )}
                        </motion.div>
                        <div>
                            <h1 className="text-xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                                Notifications
                            </h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                {unreadCount > 0 ? (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                        <span className="text-rose-400">{unreadCount} new</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-emerald-400">All caught up!</span>
                                    </>
                                )}
                            </p>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => refetch()}
                            className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10"
                        >
                            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" />
                        </Button>
                        {unreadCount > 0 && (
                            <Button
                                onClick={handleMarkAllAsRead}
                                disabled={markAllAsRead.isPending}
                                className="h-9 sm:h-11 px-3 sm:px-5 rounded-xl bg-primary hover:bg-primary/90 font-medium text-[10px] sm:text-xs"
                            >
                                {markAllAsRead.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCheck className="w-4 h-4 sm:mr-2" />
                                        <span className="hidden sm:inline">Mark all read</span>
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Filter Tabs - Horizontal scrollable on mobile */}
            <div className="mb-6 sm:mb-8 -mx-3 sm:mx-0 px-3 sm:px-0">
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {filterTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setFilter(tab.id as NotificationType)}
                            className={cn(
                                "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-[10px] sm:text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap",
                                filter === tab.id
                                    ? "bg-primary/20 text-primary border border-primary/30"
                                    : "bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <tab.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
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
                    <motion.div
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
                    </motion.div>
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
                                <motion.div
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
                                </motion.div>
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
        </div>
    );
}
