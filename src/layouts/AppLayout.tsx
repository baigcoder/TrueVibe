import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
    Plus,
    Activity,
    X,
    Users,
    Search,
    Bell,
    Settings,
    User,
    LogOut,
    Home,
    MessageSquare,
    BarChart2,
    Film,
    ChevronRight,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { CreatePost } from "@/components/shared/CreatePost";
import { UsernameSetupModal } from "@/components/modals/UsernameSetupModal";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { useNotifications, useSuggestedUsers, useFollow, useFollowRequests, useAcceptFollowRequest, useRejectFollowRequest } from "@/api/hooks";
import { NotificationList } from "@/components/shared/NotificationList";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { toast } from "sonner";
import { SpotifyConnect } from "@/components/spotify/SpotifyConnect";
import { SpotifyPlayer } from "@/components/spotify/SpotifyPlayer";
import { useSpotify } from "@/hooks/useSpotify";

const navItems = [
    { path: "/app/feed", icon: Home, label: "Feed" },
    { path: "/app/shorts", icon: Film, label: "Shorts" },
    { path: "/app/search", icon: Search, label: "Search" },
    { path: "/app/notifications", icon: Bell, label: "Notifications" },
    { path: "/app/chat", icon: MessageSquare, label: "Chat" },
    { path: "/app/analytics", icon: BarChart2, label: "Analytics" },
];



export default function AppLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { profile, user, isLoading } = useAuth();
    const [isNewPostOpen, setIsNewPostOpen] = useState(false);
    const [followedUsers, setFollowedUsers] = useState<Set<string>>(new Set());
    const [showUsernameSetup, setShowUsernameSetup] = useState(false);
    const [isProfileDrawerOpen, setIsProfileDrawerOpen] = useState(false);

    // Check if user needs to set a custom username (handle looks auto-generated)
    // Skip if user already dismissed OR if they have a custom handle stored
    const hasCustomHandle = localStorage.getItem('customHandleSet') === profile?.handle;
    const needsUsernameSetup = profile && user && !hasCustomHandle && (
        !profile.handle ||
        profile.handle === user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') ||
        /^[a-z]+\d{3,4}$/.test(profile.handle) // Matches pattern like "john1234" (auto-generated)
    );

    const { data: notificationsData } = useNotifications();
    const { data: suggestionsData, isLoading: loadingSuggestions } = useSuggestedUsers(5);
    const { data: followRequestsData, isLoading: loadingRequests } = useFollowRequests();
    const followMutation = useFollow();
    const acceptRequestMutation = useAcceptFollowRequest();
    const rejectRequestMutation = useRejectFollowRequest();

    const queryUnreadCount = (notificationsData as any)?.pages?.[0]?.data?.notifications?.filter((n: any) => !n.isRead)?.length || 0;
    const { unreadCount: localUnreadCount } = useRealtimeNotifications();

    const suggestedUsers = (suggestionsData as any)?.data?.suggestions || [];
    const followRequests = (followRequestsData as any)?.pages?.[0]?.data?.requests || [];

    // Combine local socket-driven count with query-driven count
    const totalUnreadCount = Math.max(queryUnreadCount, localUnreadCount);
    const displayBadgeCount = totalUnreadCount > 99 ? '99+' : totalUnreadCount;

    const { status: spotifyStatus } = useSpotify();

    const isActive = (path: string) => location.pathname.startsWith(path);
    const isFeedPage = location.pathname === '/app/feed';
    const isChatPage = location.pathname.startsWith('/app/chat');

    // Computed display profile that falls back to Supabase user data if profile hasn't synced
    const displayProfile = profile || (user ? {
        _id: user.id,
        name: user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split('@')[0] ||
            'User',
        handle: user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user',
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    } : null);

    const handleLogout = () => {
        // Clear all Supabase-related localStorage items directly
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key);
            }
        });

        // Force immediate navigation - use replace to prevent back navigation
        window.location.replace('/auth/login');
    };

    const handleAcceptRequest = (requestId: string) => {
        acceptRequestMutation.mutate(requestId, {
            onSuccess: () => {
                // Show success toast
                toast.success('Follow request accepted!', {
                    description: 'They can now see your posts and message you.',
                    icon: '🎉',
                });
                // Note: Query invalidation is handled by the mutation's onSuccess in hooks.ts
            },
            onError: () => {
                toast.error('Failed to accept request');
            }
        });
    };

    const handleRejectRequest = (requestId: string) => {
        rejectRequestMutation.mutate(requestId);
    };




    if (!isLoading && !user) {
        navigate({ to: '/auth/login' });
        return null;
    }

    return (
        <div className="h-screen flex bg-[#030712] overflow-hidden font-sans text-slate-200 mesh-bg noise-bg relative">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-grid-pattern opacity-30" />
            </div>

            {/* Left Sidebar - Premium Industrial Glass */}
            <aside className="hidden lg:flex lg:flex-col w-72 flex-shrink-0 bg-white/[0.03] border border-white/10 backdrop-blur-2xl fixed left-0 top-0 bottom-0 z-40 m-3 rounded-[2rem] shadow-2xl overflow-hidden group/sidebar">
                {/* Top Accent Line (static) */}
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                {/* Subtle Scanlines Overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(255,255,255,0.02)_2px,rgba(255,255,255,0.02)_4px)]" />

                {/* Logo */}
                <div className="p-6 relative overflow-hidden group/logo">
                    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700" />
                    <Link to="/app/feed" className="flex items-center gap-3 relative z-10 group">
                        <div className="w-11 h-11 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30 group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/30 to-transparent translate-y-full group-hover:translate-y-[-100%] transition-transform duration-700" />
                            V
                        </div>
                        <div className="flex flex-col">
                            <span className="font-heading font-black text-2xl tracking-[-0.05em] leading-none bg-gradient-to-r from-white via-primary to-secondary bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(129,140,248,0.3)] group-hover:drop-shadow-[0_0_15px_rgba(129,140,248,0.5)] transition-all duration-500">TRUEVIBE</span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[7px] font-black text-primary uppercase tracking-[0.4em] leading-none opacity-80">NODE_SYNC: ACTIVE</span>
                                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(129,140,248,0.6)]" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1.5 py-4 relative">
                    <AnimatePresence>
                        {navItems.map((item) => (
                            <Link key={item.path} to={item.path} className="block relative group">
                                <Button
                                    variant="ghost"
                                    className={cn(
                                        "w-full justify-start gap-4 h-[52px] text-xs font-black rounded-2xl transition-all duration-500 relative overflow-hidden uppercase tracking-[0.15em] mb-1",
                                        isActive(item.path)
                                            ? "text-white"
                                            : "text-slate-500 hover:text-slate-300 hover:bg-white/[0.02]"
                                    )}
                                >
                                    {/* Active Background Pill */}
                                    {isActive(item.path) && (
                                        <motion.div
                                            layoutId="sidebarActivePill"
                                            className="absolute inset-0 bg-white/[0.05] border border-white/10 rounded-2xl"
                                            transition={{ type: "spring", bounce: 0.15, duration: 0.6 }}
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/5" />
                                            <div className="absolute left-0 top-3 bottom-3 w-[2px] bg-primary shadow-[0_0_10px_rgba(129,140,248,0.8)]" />
                                        </motion.div>
                                    )}

                                    {/* Shimmer on Hover */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />

                                    <item.icon className={cn(
                                        "w-5 h-5 transition-all duration-500 relative z-10",
                                        isActive(item.path)
                                            ? "text-primary scale-110 drop-shadow-[0_0_10px_rgba(129,140,248,0.8)]"
                                            : "opacity-60 grayscale group-hover:grayscale-0 group-hover:opacity-100"
                                    )} />

                                    <span className={cn(
                                        "relative z-10 font-black",
                                        isActive(item.path) && "italic tracking-[0.2em]"
                                    )}>{item.label}</span>

                                    {item.label === "Notifications" && totalUnreadCount > 0 && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute right-4 px-1.5 h-4 min-w-[16px] rounded-full bg-primary text-[8px] font-black flex items-center justify-center text-white shadow-[0_0_12px_rgba(129,140,248,0.6)] z-10"
                                        >
                                            {displayBadgeCount}
                                        </motion.div>
                                    )}
                                </Button>
                            </Link>
                        ))}
                    </AnimatePresence>
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-white/5 bg-white/[0.01] relative overflow-hidden group/footer">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />
                    <Link to="/app/profile/me">
                        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.04] border border-transparent hover:border-white/5 transition-all duration-500 group/user relative overflow-hidden">
                            <div className="relative">
                                <Avatar className="h-11 w-11 border-2 border-white/10 group-hover/user:border-primary/50 transition-all duration-300 shadow-lg">
                                    <AvatarImage src={displayProfile?.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-primary font-black">
                                        {displayProfile?.name?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[#030712] shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-[11px] truncate text-white uppercase tracking-wider mb-0.5 group-hover/user:text-primary transition-colors">{displayProfile?.name || 'User'}</p>
                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest truncate">@{displayProfile?.handle || 'user'}</p>
                            </div>
                            <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover/user:opacity-100 group-hover/user:translate-x-0 translate-x-2 transition-all duration-300">
                                <ChevronRight className="w-4 h-4 text-primary" />
                            </div>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col h-screen transition-all duration-500 w-full max-w-full overflow-hidden",
                "lg:pl-[300px]", // Offset for fixed left sidebar
                isFeedPage ? "xl:pr-[380px]" : "" // Corrected offset for fixed right sidebar
            )}>
                {/* Header - Sticky Premium Glass */}
                {!isChatPage && (
                    <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 bg-transparent backdrop-blur-3xl border-b border-white/5 sticky top-0 z-30">
                        <div className="lg:hidden">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsProfileDrawerOpen(true)}
                                className="rounded-2xl h-11 w-11 border border-white/5 hover:border-primary/30 transition-all overflow-hidden active:scale-90"
                            >
                                <Avatar className="h-9 w-9">
                                    <AvatarImage src={profile?.avatar} />
                                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                        {profile?.name?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                            </Button>
                        </div>

                        <div className="hidden lg:block">
                            {!isFeedPage && location.pathname !== '/app/search' && location.pathname !== '/app/notifications' && (
                                <h1 className="font-heading font-black text-2xl bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent tracking-[-0.05em] uppercase italic drop-shadow-lg">
                                    {(() => {
                                        const path = location.pathname;
                                        // Handle profile pages - show "Profile" instead of UUID
                                        if (path.startsWith('/app/profile')) return 'Profile';
                                        // Handle other pages - show friendly name
                                        const segment = path.split('/').pop() || '';
                                        return segment.replace(/-/g, '_');
                                    })()}
                                </h1>
                            )}
                        </div>


                        <div className="hidden md:flex flex-1" />

                        {!isFeedPage && <div className="flex-1" />}

                        <div className="flex items-center gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-white/5 rounded-2xl h-11 w-11 relative transition-all active:scale-95">
                                        <Bell className="w-5 h-5" />
                                        {totalUnreadCount > 0 && (
                                            <motion.span
                                                key={totalUnreadCount}
                                                initial={{ scale: 0, y: 5 }}
                                                animate={{ scale: 1, y: 0 }}
                                                className="absolute -top-1 -right-1 min-w-[22px] h-5.5 px-1.5 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center text-[9px] font-black text-white shadow-[0_0_15px_rgba(129,140,248,0.4)] border border-white/20 z-20"
                                            >
                                                {displayBadgeCount}
                                            </motion.span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 p-0 bg-[#0f172a]/95 backdrop-blur-3xl border-white/10 shadow-2xl rounded-2xl overflow-hidden glass-panel" align="end">
                                    <NotificationList />
                                </PopoverContent>
                            </Popover>

                            <div className="hidden lg:block">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="rounded-2xl h-11 w-11 border border-white/5 hover:border-primary/30 transition-all overflow-hidden active:scale-95">
                                            <Avatar className="h-9 w-9">
                                                <AvatarImage src={profile?.avatar} />
                                                <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                                    {profile?.name?.[0]?.toUpperCase() || '?'}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 glass-panel border-white/10 rounded-3xl p-2 shadow-2xl">
                                        <DropdownMenuLabel className="text-white p-3">
                                            <div className="flex flex-col gap-0.5">
                                                <span className="font-heading font-black text-lg tracking-tight leading-none italic uppercase">{profile?.name || 'User'}</span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">@{profile?.handle || 'user'}</span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="bg-white/5 my-2" />
                                        <DropdownMenuItem asChild className="p-3 rounded-2xl text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer transition-colors">
                                            <Link to="/app/profile/me" className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">Access profile</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild className="p-3 rounded-2xl text-slate-300 focus:text-white focus:bg-white/5 cursor-pointer transition-colors">
                                            <Link to="/app/settings" className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                                                    <Settings className="w-4 h-4 text-primary" />
                                                </div>
                                                <span className="font-bold text-sm tracking-tight">System settings</span>
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="bg-white/5 my-2" />
                                        <DropdownMenuItem onSelect={handleLogout} className="p-3 rounded-2xl text-rose-400 focus:text-rose-400 focus:bg-rose-500/10 cursor-pointer transition-colors">
                                            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center mr-3">
                                                <LogOut className="w-4 h-4" />
                                            </div>
                                            <span className="font-black uppercase text-xs tracking-widest">Terminate Session</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>
                )}

                {/* Page Content - Scrollable */}
                <main className={cn(
                    "flex-1 relative w-full max-w-full",
                    isChatPage ? "p-0 pb-0 overflow-hidden" :
                        location.pathname === '/app/shorts' ? "p-0 pb-0 overflow-hidden" :
                            location.pathname === '/app/search' ? "pt-16 pb-[72px] lg:pb-0 overflow-hidden" :
                                "p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto overflow-x-hidden scrollbar-hide"
                )}>
                    <Outlet />
                </main>
            </div>

            {/* Right Sidebar - Premium Gen Z Lifestyle Hub */}
            {isFeedPage && (
                <aside className="hidden xl:flex flex-col w-[360px] fixed right-0 top-0 bottom-0 z-20 py-6 pr-8 space-y-6 overflow-y-auto scrollbar-hide">
                    {/* Aurora Background Effects & Technical Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
                        <motion.div
                            animate={{
                                opacity: [0.05, 0.1, 0.05],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-20 -right-32 w-80 h-80 bg-primary/20 blur-[120px] rounded-full"
                        />
                        <motion.div
                            animate={{
                                opacity: [0.03, 0.08, 0.03],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute bottom-40 -right-20 w-80 h-80 bg-secondary/15 blur-[150px] rounded-full"
                        />
                    </div>

                    {/* Spotify Widget */}
                    <div className="space-y-3">
                        {!spotifyStatus?.connected ? (
                            <SpotifyConnect />
                        ) : (
                            <SpotifyPlayer />
                        )}
                    </div>

                    {/* Follow Requests - TECHNICAL GLASS REDESIGN */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl transition-all duration-700 hover:border-white/20 relative group/card"
                    >
                        {/* Static Technical Accent */}
                        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-secondary/40 to-transparent" />

                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Activity className="w-4 h-4 text-secondary drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em] italic italic">Requests</h3>
                            </div>
                            {followRequests.length > 0 && (
                                <div className="px-2.5 py-1 rounded-lg bg-secondary/20 border border-secondary/30">
                                    <span className="text-[9px] font-black text-secondary tracking-widest">{followRequests.length}</span>
                                </div>
                            )}
                        </div>

                        <div className="p-4 max-h-[220px] overflow-y-auto scrollbar-hide space-y-3">
                            {loadingRequests ? (
                                <div className="flex items-center justify-center py-10">
                                    <Loader2 className="w-5 h-5 animate-spin text-secondary" />
                                </div>
                            ) : followRequests.length > 0 ? (
                                followRequests.map((request: any, index: number) => (
                                    <motion.div
                                        key={request._id}
                                        initial={{ opacity: 0, x: 10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="rounded-2xl p-3 flex items-center gap-3 bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-all duration-300"
                                    >
                                        <Avatar
                                            className="w-10 h-10 border-2 border-white/10 rounded-xl shadow-lg cursor-pointer hover:border-secondary transition-all"
                                            onClick={() => {
                                                const requesterId = request.requester?.userId || request.requesterId;
                                                if (requesterId) navigate({ to: `/app/profile/${requesterId}` });
                                            }}
                                        >
                                            <AvatarImage src={request.requester?.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-secondary/20 text-secondary font-black text-[10px]">
                                                {request.requester?.name?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-black text-[10px] text-white uppercase tracking-tight truncate">{request.requester?.name}</p>
                                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">@{request.requester?.handle}</p>
                                        </div>

                                        <div className="flex gap-2">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleAcceptRequest(request._id)}
                                                className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                                                title="Accept"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </motion.button>

                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleRejectRequest(request._id)}
                                                className="w-8 h-8 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                                                title="Reject"
                                            >
                                                <X className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-6 text-center">
                                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">_Static.Empty</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Suggested Users - VIBE MATCH DESIGN */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl relative transition-all duration-700 hover:border-white/20 group/suggestions"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-white/[0.02]">
                            <div className="flex items-center gap-3">
                                <Users className="w-4 h-4 text-primary drop-shadow-[0_0_8px_rgba(129,140,248,0.4)]" />
                                <h3 className="text-[10px] font-black text-white uppercase tracking-[0.25em] italic">Vibe_Match</h3>
                            </div>
                            <Link to="/app/search">
                                <motion.button
                                    whileHover={{ x: 3 }}
                                    className="flex items-center gap-1.5 text-[8px] font-black text-primary/80 uppercase tracking-widest hover:text-primary transition-colors"
                                >
                                    EXPLORE <ChevronRight className="w-3 h-3" />
                                </motion.button>
                            </Link>
                        </div>

                        {/* Vertical List Area */}
                        <div className="p-4 space-y-3">
                            {loadingSuggestions ? (
                                Array(3).fill(0).map((_, i) => (
                                    <div key={i} className="w-full flex items-center gap-3 p-3 bg-white/5 rounded-2xl animate-pulse">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex-shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-2.5 bg-white/10 rounded-full w-24" />
                                            <div className="h-2 bg-white/10 rounded-full w-16" />
                                        </div>
                                    </div>
                                ))
                            ) : suggestedUsers.length > 0 ? (
                                suggestedUsers
                                    .filter((u: any) => {
                                        const suggestionUserId = u.userId || u._id;
                                        const currentUserId = profile?.userId || profile?._id || user?.id;
                                        return suggestionUserId !== currentUserId && u.handle !== profile?.handle;
                                    })
                                    .slice(0, 5) // Keep it focused
                                    .map((suggestedUser: any, index: number) => (
                                        <motion.div
                                            key={suggestedUser.userId || suggestedUser._id}
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            onClick={() => navigate({ to: `/app/profile/${suggestedUser.userId || suggestedUser._id}` })}
                                            className="w-full flex items-center gap-4 p-3.5 bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 hover:border-primary/40 rounded-[1.8rem] transition-all duration-500 cursor-pointer group relative overflow-hidden"
                                        >
                                            {/* Profile Aura */}
                                            <div className="absolute -top-4 -left-4 w-12 h-12 bg-primary/10 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                            <div className="relative flex-shrink-0">
                                                <Avatar className="w-11 h-11 border-2 border-white/10 rounded-2xl group-hover:border-primary/50 transition-all shadow-xl">
                                                    <AvatarImage src={suggestedUser.avatar} className="object-cover" />
                                                    <AvatarFallback className="bg-primary/20 text-primary font-black text-[12px]">
                                                        {suggestedUser.name?.[0] || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#030712] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-[11px] font-black text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors">
                                                    {suggestedUser.name}
                                                </p>
                                                <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest truncate">@{suggestedUser.handle || 'viber'}</p>
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const id = suggestedUser.userId || suggestedUser._id;
                                                    if (!followedUsers.has(id as any)) {
                                                        followMutation.mutate(id);
                                                        setFollowedUsers(prev => new Set([...prev, id as any]));
                                                    }
                                                }}
                                                className={cn(
                                                    "px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all",
                                                    followedUsers.has((suggestedUser.userId || suggestedUser._id) as any)
                                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                        : "bg-primary text-white shadow-lg shadow-primary/20 hover:shadow-primary/40"
                                                )}
                                            >
                                                {followedUsers.has((suggestedUser.userId || suggestedUser._id) as any) ? '✓' : 'SYNC'}
                                            </motion.button>
                                        </motion.div>
                                    ))
                            ) : (
                                <div className="w-full py-10 text-center">
                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">_Match.Zero</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Footer */}
                    <div className="px-4 pt-2 space-y-3 flex-shrink-0">
                        <div className="flex flex-wrap gap-x-5 gap-y-1">
                            <a href="#" className="text-[10px] font-medium text-slate-500 hover:text-primary transition-all">Privacy</a>
                            <a href="#" className="text-[10px] font-medium text-slate-500 hover:text-secondary transition-all">Terms</a>
                            <a href="#" className="text-[10px] font-medium text-slate-500 hover:text-accent transition-all">Help</a>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className="text-[9px] font-medium text-slate-600">© 2024 TrueVibe</p>
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 animate-pulse" />
                        </div>
                    </div>
                </aside>
            )}

            {/* Mobile Nav */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-[72px] bg-[#0f172a]/95 backdrop-blur-3xl border-t border-white/10 z-50 shadow-2xl glass-panel pb-safe">
                <div className="h-full flex items-center justify-around px-4 max-w-md mx-auto">
                    {/* Only show essential nav items on mobile: Feed, Shorts, Search, Chat */}
                    {[
                        { path: "/app/feed", icon: Home, label: "Feed" },
                        { path: "/app/shorts", icon: Film, label: "Shorts" },
                        { path: "/app/search", icon: Search, label: "Search" },
                        { path: "/app/chat", icon: MessageSquare, label: "Chat" },
                    ].map((item) => (
                        <Link key={item.path} to={item.path}>
                            <Button variant="ghost" size="icon" className={cn("h-12 w-12 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 active:scale-90", isActive(item.path) ? "text-primary bg-primary/15" : "text-slate-400 hover:text-white")}
                            >
                                <item.icon className="w-5 h-5" />
                            </Button>
                        </Link>
                    ))}
                    <Link to="/app/profile/me">
                        <Button variant="ghost" size="icon" className={cn("h-12 w-12 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5 active:scale-90", isActive("/app/profile") ? "text-primary bg-primary/15" : "text-slate-400 hover:text-white")}>
                            <User className="w-5 h-5" />
                        </Button>
                    </Link>
                </div>
            </nav>

            {/* New Post Modal */}
            <Dialog open={isNewPostOpen} onOpenChange={setIsNewPostOpen}>
                <DialogContent className="sm:max-w-xl bg-[#0f172a]/95 backdrop-blur-3xl border-white/5 p-0 rounded-3xl overflow-hidden shadow-2xl glass-panel tech-border">
                    <DialogHeader className="p-6 border-b border-white/5 bg-white/[0.02]">
                        <DialogTitle className="font-heading font-extrabold text-2xl text-white tracking-tighter uppercase italic">Create Vibe</DialogTitle>
                    </DialogHeader>
                    <div className="p-2">
                        <CreatePost onSuccess={() => setIsNewPostOpen(false)} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* Username Setup Modal for new OAuth users */}
            <UsernameSetupModal
                open={showUsernameSetup || !!(needsUsernameSetup && !localStorage.getItem('usernameSetupDismissed'))}
                onComplete={() => {
                    setShowUsernameSetup(false);
                    localStorage.setItem('usernameSetupDismissed', 'true');
                }}
            />

            {/* Mobile Profile Drawer - Sliding from Right */}
            <AnimatePresence>
                {isProfileDrawerOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsProfileDrawerOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] lg:hidden"
                        />
                        {/* Drawer Content */}
                        <motion.div
                            initial={{ x: '100%', opacity: 0.5 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: '100%', opacity: 0.5 }}
                            transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
                            className="fixed right-0 top-0 bottom-0 w-[280px] bg-[#0c0c0e]/95 backdrop-blur-3xl border-l border-white/10 z-[101] shadow-2xl lg:hidden flex flex-col pt-safe px-4"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between py-6 px-2">
                                <h3 className="text-xl font-heading font-black text-white italic uppercase bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Actions</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsProfileDrawerOpen(false)}
                                    className="rounded-xl h-10 w-10 border border-white/5 hover:bg-white/5 active:scale-95"
                                >
                                    <X className="w-5 h-5 text-white/70" />
                                </Button>
                            </div>

                            {/* Profile Info */}
                            <div className="p-4 bg-white/5 rounded-3xl border border-white/5 mb-6 group">
                                <Link
                                    to="/app/profile/me"
                                    onClick={() => setIsProfileDrawerOpen(false)}
                                    className="flex items-center gap-4"
                                >
                                    <Avatar className="h-14 w-14 border-2 border-primary/30 group-hover:border-primary transition-colors">
                                        <AvatarImage src={profile?.avatar} />
                                        <AvatarFallback className="bg-primary/20 text-primary font-bold text-lg">
                                            {profile?.name?.[0]?.toUpperCase() || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="font-heading font-black text-white uppercase italic truncate text-lg">{profile?.name || 'User'}</span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">@{profile?.handle || 'user'}</span>
                                    </div>
                                </Link>
                            </div>

                            {/* Menu Items */}
                            <div className="space-y-2 flex-1 overflow-y-auto scrollbar-hide">
                                <Link to="/app/profile/me" onClick={() => setIsProfileDrawerOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl bg-white/[0.03] hover:bg-white/10 active:scale-95 transition-all text-white border border-transparent hover:border-primary/20">
                                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                                            <User className="w-5 h-5 text-primary" />
                                        </div>
                                        <span className="font-bold tracking-tight">Access profile</span>
                                    </Button>
                                </Link>
                                <Link to="/app/settings" onClick={() => setIsProfileDrawerOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl bg-white/[0.03] hover:bg-white/10 active:scale-95 transition-all text-white border border-transparent hover:border-secondary/20">
                                        <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                                            <Settings className="w-5 h-5 text-secondary" />
                                        </div>
                                        <span className="font-bold tracking-tight">System settings</span>
                                    </Button>
                                </Link>
                                <Link to="/app/notifications" onClick={() => setIsProfileDrawerOpen(false)}>
                                    <Button variant="ghost" className="w-full justify-start gap-4 h-14 rounded-2xl bg-white/[0.03] hover:bg-white/10 active:scale-95 transition-all text-white relative">
                                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                                            <Bell className="w-5 h-5 text-orange-400" />
                                        </div>
                                        <span className="font-bold tracking-tight">Signal Feed</span>
                                        {totalUnreadCount > 0 && (
                                            <span className="absolute right-4 px-2 py-0.5 bg-primary rounded-full text-[10px] font-black">{totalUnreadCount}</span>
                                        )}
                                    </Button>
                                </Link>
                            </div>

                            {/* Footer / Logout */}
                            <div className="pb-8 pt-4">
                                <Button
                                    onClick={() => {
                                        setIsProfileDrawerOpen(false);
                                        handleLogout();
                                    }}
                                    className="w-full justify-start gap-4 h-14 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all text-rose-500 border border-rose-500/10"
                                >
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                                        <LogOut className="w-5 h-5" />
                                    </div>
                                    <span className="font-black uppercase text-xs tracking-[0.2em]">Logout_System</span>
                                </Button>
                                <p className="text-[10px] text-center text-slate-600 mt-6 font-bold uppercase tracking-widest">Version Alpha 1.0.4</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
