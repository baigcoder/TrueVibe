import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, Heart, MessageSquare, UserPlus, Repeat, Loader2, ChevronRight, CheckCheck, AtSign } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";

export function NotificationList() {
    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications();
    const markRead = useMarkNotificationRead();
    const markAllRead = useMarkAllNotificationsRead();

    const notifications = data?.pages?.flatMap(page => page.data.notifications) || [];
    const unreadCount = notifications.filter(n => !n.isRead).length;

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

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-10 bg-white/[0.02] backdrop-blur-xl rounded-2xl border border-white/5 h-[350px] w-full">
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
        <div className="flex flex-col h-[400px] w-full bg-white/[0.02] backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <p className="text-[10px] text-rose-400 font-medium flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
                                {unreadCount} new
                            </p>
                        )}
                    </div>
                </div>
                {unreadCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[10px] font-bold text-primary hover:text-white hover:bg-primary/20 rounded-lg"
                        onClick={() => markAllRead.mutate()}
                        disabled={markAllRead.isPending}
                    >
                        <CheckCheck className="w-3.5 h-3.5" />
                    </Button>
                )}
            </div>

            {/* Notification Stream */}
            <ScrollArea className="flex-1">
                {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4">
                        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-3">
                            <Bell className="w-6 h-6 text-slate-600" />
                        </div>
                        <p className="text-xs text-slate-500 font-medium">No notifications yet</p>
                    </div>
                ) : (
                    <AnimatePresence>
                        <div className="py-2">
                            {notifications.slice(0, 5).map((notification, index) => {
                                // Support both senderId and sender field names
                                const sender = notification.sender || notification.senderId;
                                const senderName = sender?.name || "Someone";
                                const senderAvatar = sender?.avatar;
                                const senderInitial = senderName.charAt(0).toUpperCase();
                                const iconConfig = getIconConfig(notification.type);
                                const Icon = iconConfig.icon;

                                return (
                                    <motion.div
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
                                        {/* Unread Indicator */}
                                        {!notification.isRead && (
                                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r" />
                                        )}

                                        {/* Avatar */}
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

                                        {/* Content */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs text-white leading-relaxed">
                                                <span className="font-bold">{senderName}</span>{" "}
                                                <span className="text-slate-400">{notification.body}</span>
                                            </p>
                                            <span className="text-[10px] text-slate-500 mt-0.5 block">
                                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </motion.div>
                                );
                            })}

                            {hasNextPage && (
                                <div className="px-3 py-2">
                                    <Button
                                        variant="ghost"
                                        className="w-full h-8 text-xs text-slate-500 hover:text-white rounded-lg hover:bg-white/5"
                                        onClick={() => fetchNextPage()}
                                        disabled={isFetchingNextPage}
                                    >
                                        {isFetchingNextPage ? <Loader2 className="w-3 h-3 animate-spin" /> : "Load more"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    </AnimatePresence>
                )}
            </ScrollArea>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                <Link
                    to={"/app/notifications" as any}
                    className="flex items-center justify-center gap-2 text-xs font-medium text-primary hover:text-white transition-colors group"
                >
                    View all notifications
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
            </div>
        </div>
    );
}
