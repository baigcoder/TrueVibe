import { useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "@tanstack/react-router";
import {
    Plus,
    Activity,
    X,
    Users,
    ArrowRight,
    Search,
    Bell,
    Settings,
    User,
    LogOut,
    Home,
    MessageSquare,
    BarChart2,
    Film,
    ChevronRight
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
import { motion } from "framer-motion";
import { useNotifications, useSuggestedUsers, useFollow, useFollowRequests, useAcceptFollowRequest, useRejectFollowRequest } from "@/api/hooks";
import { NotificationList } from "@/components/shared/NotificationList";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { toast } from "sonner";

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
    const [searchQuery, setSearchQuery] = useState("");
    const [showUsernameSetup, setShowUsernameSetup] = useState(false);

    // Check if user needs to set a custom username (handle looks auto-generated)
    const needsUsernameSetup = profile && user && (
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
        console.log('Logging out...');

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


    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate({ to: '/app/search', search: { q: searchQuery } });
        }
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

            {/* Left Sidebar - Fixed Industrial */}
            <aside className="hidden lg:flex lg:flex-col w-72 flex-shrink-0 bg-[#0d1117] border border-white/10 backdrop-blur-xl fixed left-0 top-0 bottom-0 z-40 m-3 rounded-2xl shadow-2xl overflow-hidden group/sidebar">
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
                            <span className="font-heading font-black text-2xl text-white italic tracking-[-0.05em] leading-none group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-primary group-hover:to-secondary transition-all duration-300">TRUEVIBE</span>
                            <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[7px] font-black text-primary uppercase tracking-[0.4em] leading-none opacity-80">NODE_SYNC: ACTIVE</span>
                                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Navigation */}
                <nav className="flex-1 px-4 space-y-1">
                    {navItems.map((item) => (
                        <Link key={item.path} to={item.path}>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start gap-4 h-12 text-sm font-semibold rounded-xl transition-all duration-300 relative overflow-hidden group/nav",
                                    isActive(item.path)
                                        ? "bg-gradient-to-r from-primary/20 to-secondary/10 text-white border border-primary/30 shadow-lg px-5"
                                        : "text-slate-400 hover:text-white hover:bg-white/[0.05] px-5"
                                )}
                            >
                                {isActive(item.path) && (
                                    <div className="nav-active-indicator" />
                                )}
                                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover/nav:translate-x-[100%] transition-transform duration-700" />
                                <item.icon className={cn("w-5 h-5 transition-all duration-300 relative z-10", isActive(item.path) && "text-primary drop-shadow-[0_0_8px_rgba(129,140,248,0.6)] scale-110")} />
                                <span className="tracking-tight relative z-10">{item.label}</span>
                                {item.label === "Notifications" && totalUnreadCount > 0 && (
                                    <div className="absolute right-4 px-1.5 h-4 min-w-[16px] rounded-full bg-primary text-[8px] font-black flex items-center justify-center text-white shadow-[0_0_10px_rgba(129,140,248,0.5)] animate-pulse">
                                        {displayBadgeCount}
                                    </div>
                                )}
                                {isActive(item.path) && item.label !== "Notifications" && (
                                    <div className="absolute right-4 w-2 h-2 rounded-full bg-primary animate-pulse" />
                                )}
                            </Button>
                        </Link>
                    ))}
                </nav>

                {/* User Section */}
                <div className="p-4 border-t border-white/5 bg-gradient-to-t from-white/[0.02] to-transparent">
                    <Link to="/app/profile/me">
                        <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/[0.06] transition-all duration-300 group/user relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 translate-x-[-100%] group-hover/user:translate-x-[100%] transition-transform duration-700" />
                            <div className="relative">
                                <Avatar className="h-11 w-11 border-2 border-white/10 group-hover/user:border-primary/50 transition-colors shadow-lg ring-2 ring-transparent group-hover/user:ring-primary/20">
                                    <AvatarImage src={displayProfile?.avatar} />
                                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-secondary/30 text-primary font-bold">
                                        {displayProfile?.name?.[0]?.toUpperCase() || '?'}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0d1117] shadow-[0_0_6px_rgba(16,185,129,0.6)]" />
                            </div>
                            <div className="flex-1 min-w-0 relative z-10">
                                <p className="font-semibold text-sm truncate text-white tracking-tight leading-none mb-1 group-hover/user:text-primary transition-colors">{displayProfile?.name || 'User'}</p>
                                <p className="text-xs text-slate-500 truncate font-medium">@{displayProfile?.handle || 'user'}</p>
                            </div>
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center opacity-0 group-hover/user:opacity-100 transition-opacity">
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                            </div>
                        </div>
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={cn(
                "flex-1 flex flex-col h-screen transition-all duration-500 w-full max-w-full overflow-hidden",
                "lg:pl-[300px]", // Offset for fixed left sidebar
                isFeedPage ? "xl:pr-[340px]" : "" // Corrected offset for fixed right sidebar
            )}>
                {/* Header - Sticky with proper containment */}
                {!isChatPage && (
                    <header className="h-16 lg:h-20 flex items-center justify-between px-4 lg:px-8 bg-transparent sticky top-0 z-30">
                        <div className="lg:hidden">
                            <Link to="/app/feed" className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold shadow-glow-primary">V</div>
                            </Link>
                        </div>

                        <div className="hidden lg:block">
                            {!isFeedPage && (
                                <h1 className="font-heading font-black text-2xl text-white tracking-[-0.05em] uppercase italic drop-shadow-lg">
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


                        <div className="hidden md:flex flex-1 max-w-xl mx-8">
                            <form onSubmit={handleSearch} className="relative w-full group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-primary transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search the vibe..."
                                    className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:bg-white/10 transition-all"
                                />
                            </form>
                        </div>

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
                    </header>
                )}

                {/* Page Content - Scrollable */}
                <main className={cn(
                    "flex-1 relative w-full max-w-full",
                    isChatPage ? "p-0 pb-0 overflow-hidden" :
                        location.pathname === '/app/shorts' ? "p-0 pb-0 overflow-hidden" :
                            "p-4 lg:p-8 pb-24 lg:pb-8 overflow-y-auto overflow-x-hidden scrollbar-hide"
                )}>
                    <Outlet />
                </main>
            </div>

            {/* Right Sidebar - Premium Gen Z Lifestyle Hub */}
            {isFeedPage && (
                <aside className="hidden xl:flex flex-col w-[340px] fixed right-0 top-0 bottom-0 z-20 py-6 pr-6 space-y-5 overflow-y-auto scrollbar-hide">
                    {/* Aurora Background Effects */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        <motion.div
                            animate={{
                                opacity: [0.15, 0.25, 0.15],
                                scale: [1, 1.1, 1],
                            }}
                            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute top-20 -right-32 w-80 h-80 bg-primary/20 blur-[100px] rounded-full"
                        />
                        <motion.div
                            animate={{
                                opacity: [0.1, 0.2, 0.1],
                                scale: [1, 1.2, 1],
                            }}
                            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
                            className="absolute bottom-40 -right-20 w-60 h-60 bg-secondary/15 blur-[80px] rounded-full"
                        />
                        <motion.div
                            animate={{
                                opacity: [0.08, 0.15, 0.08],
                            }}
                            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 4 }}
                            className="absolute top-1/2 right-0 w-40 h-40 bg-accent/10 blur-[60px] rounded-full"
                        />
                    </div>

                    {/* Spotify Connect Widget */}
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.3 }}
                        className="bg-gradient-to-br from-[#1DB954]/10 via-white/5 to-white/[0.02] backdrop-blur-3xl rounded-[2rem] p-5 shadow-2xl relative overflow-hidden group/spotify"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-[#1DB954]/5 to-transparent opacity-0 group-hover/spotify:opacity-100 transition-opacity duration-500" />
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#1DB954]/10 blur-3xl rounded-full" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-11 h-11 rounded-2xl bg-[#1DB954] flex items-center justify-center shadow-lg shadow-[#1DB954]/30 group-hover/spotify:scale-110 transition-transform">
                                    <svg className="w-6 h-6 text-black" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                    </svg>
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white">Spotify</h3>
                                    <p className="text-[10px] font-medium text-slate-400">Sync your music vibe</p>
                                </div>
                            </div>

                            <button className="w-full py-3.5 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#1DB954]/20">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                                </svg>
                                Connect Spotify
                            </button>

                            <p className="text-[9px] text-center text-slate-500 mt-3 font-medium">
                                Play music while you vibe on TrueVibe
                            </p>
                        </div>
                    </motion.div>

                    {/* Follow Requests - Animated */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="bg-white/[0.03] backdrop-blur-3xl rounded-[2rem] overflow-hidden shadow-2xl"
                    >
                        <div className="flex items-center justify-between px-5 py-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-secondary/20 flex items-center justify-center">
                                    <Activity className="w-4 h-4 text-secondary" />
                                </div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Requests</h3>
                            </div>
                            {followRequests.length > 0 && (
                                <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className="bg-secondary text-white text-[10px] font-bold w-6 h-6 rounded-full flex items-center justify-center shadow-lg shadow-secondary/30"
                                >
                                    {followRequests.length}
                                </motion.span>
                            )}
                        </div>

                        <div className="p-3 max-h-[180px] overflow-y-auto custom-scrollbar space-y-2">
                            {loadingRequests ? (
                                <div className="flex items-center justify-center py-8">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                        className="w-6 h-6 border-2 border-secondary/30 border-t-secondary rounded-full"
                                    />
                                </div>
                            ) : followRequests.length > 0 ? (
                                followRequests.map((request: any, index: number) => (
                                    <motion.div
                                        key={request._id}
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        whileHover={{ scale: 1.02 }}
                                        className="bg-white/5 rounded-2xl p-3 flex items-center gap-3 group/req hover:bg-white/10 transition-all cursor-pointer"
                                    >
                                        <Avatar
                                            className="w-10 h-10 border-2 border-secondary/30 rounded-xl shadow-lg cursor-pointer hover:border-secondary/60 transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const id = request.requester?.userId || request.requesterId;
                                                console.log('[Request Click]', id, request);
                                                if (id) navigate({ to: `/app/profile/${id}` });
                                            }}
                                        >
                                            <AvatarImage src={request.requester?.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-secondary/20 text-secondary font-bold text-xs">
                                                {request.requester?.name?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div
                                            className="flex-1 min-w-0 cursor-pointer"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const id = request.requester?.userId || request.requesterId;
                                                if (id) navigate({ to: `/app/profile/${id}` });
                                            }}
                                        >
                                            <p className="font-bold text-white text-xs truncate hover:text-secondary transition-colors">{request.requester?.name}</p>
                                            <p className="text-[10px] text-slate-500 truncate">@{request.requester?.handle}</p>
                                        </div>

                                        <div className="flex gap-1.5">
                                            <motion.button
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleAcceptRequest(request._id)}
                                                disabled={acceptRequestMutation.isPending}
                                                className="w-8 h-8 rounded-xl bg-secondary text-white flex items-center justify-center shadow-lg shadow-secondary/30 disabled:opacity-50"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </motion.button>

                                            <motion.button
                                                whileHover={{ scale: 1.15 }}
                                                whileTap={{ scale: 0.9 }}
                                                onClick={() => handleRejectRequest(request._id)}
                                                disabled={rejectRequestMutation.isPending}
                                                className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center hover:bg-rose-500/30 hover:text-rose-400 transition-colors disabled:opacity-50"
                                            >
                                                <X className="w-4 h-4" />
                                            </motion.button>
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-6 text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6 text-slate-600" />
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-500">No pending requests</p>
                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Suggested Users - Horizontal Scroll Vibe Match */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-white/[0.03] backdrop-blur-3xl rounded-2xl overflow-hidden shadow-2xl relative max-w-full"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3">
                            <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center border border-white/10">
                                    <Users className="w-3.5 h-3.5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-[10px] font-bold text-white tracking-widest uppercase italic">Vibe Match</h3>
                                    <p className="text-[7px] font-bold text-slate-500 uppercase tracking-wider">Top Profiles</p>
                                </div>
                            </div>
                            <Link to="/app/search">
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-[8px] font-bold text-primary uppercase tracking-wide hover:bg-primary/20 transition-all"
                                >
                                    Explore
                                    <ArrowRight className="w-2.5 h-2.5" />
                                </motion.button>
                            </Link>
                        </div>

                        {/* Horizontal Scroll Container */}
                        <div className="overflow-x-auto custom-scrollbar-x pb-3 pt-3 px-3">
                            <div className="flex gap-2.5">
                                {loadingSuggestions ? (
                                    Array(3).fill(0).map((_, i) => (
                                        <div key={i} className="w-[110px] flex-shrink-0 p-3 bg-white/5 rounded-xl animate-pulse">
                                            <div className="w-12 h-12 rounded-xl bg-white/10 mx-auto mb-2" />

                                            <div className="h-3 bg-white/10 rounded-full w-20 mx-auto mb-2" />
                                            <div className="h-2 bg-white/10 rounded-full w-16 mx-auto" />
                                        </div>
                                    ))
                                ) : suggestedUsers.filter((u: any) => {
                                    // Filter out current user - check multiple identifiers
                                    const suggestionUserId = u.userId || u._id;
                                    const currentUserId = profile?.userId || profile?._id || user?.id;
                                    const currentHandle = profile?.handle;

                                    // Exclude if userId matches OR handle matches
                                    return suggestionUserId !== currentUserId &&
                                        u.handle?.toLowerCase() !== currentHandle?.toLowerCase();
                                }).length > 0 ? (
                                    suggestedUsers
                                        .filter((u: any) => {
                                            const suggestionUserId = u.userId || u._id;
                                            const currentUserId = profile?.userId || profile?._id || user?.id;
                                            const currentHandle = profile?.handle;

                                            return suggestionUserId !== currentUserId &&
                                                u.handle?.toLowerCase() !== currentHandle?.toLowerCase();
                                        })

                                        .map((suggestedUser: any, index: number) => (
                                            <motion.div
                                                key={suggestedUser.userId || suggestedUser._id}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: index * 0.05 }}
                                                whileHover={{ y: -2, scale: 1.02 }}
                                                onClick={() => navigate({ to: `/app/profile/${suggestedUser.userId || suggestedUser._id}` })}
                                                className="w-[100px] flex-shrink-0 p-2.5 bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-primary/30 rounded-xl transition-all duration-300 cursor-pointer group text-center"
                                            >
                                                {/* Avatar */}
                                                <div className="relative mx-auto w-11 h-11 mb-2">
                                                    <Avatar className="w-11 h-11 border border-white/10 rounded-xl relative shadow-lg group-hover:border-primary/50 transition-colors">
                                                        <AvatarImage src={suggestedUser.avatar} className="object-cover" />
                                                        <AvatarFallback className="bg-slate-900 text-white font-bold text-sm">
                                                            {suggestedUser.name?.[0] || '?'}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#030712]" />
                                                </div>

                                                {/* Name */}
                                                <p className="text-[10px] font-bold text-white truncate mb-0.5 group-hover:text-primary transition-colors">
                                                    {suggestedUser.name?.split(' ')[0]}
                                                </p>

                                                {/* Handle */}
                                                <p className="text-[8px] text-slate-500 truncate mb-2">@{(suggestedUser.handle || 'viber').slice(0, 10)}</p>

                                                {/* Follow Button */}
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
                                                        "w-full py-1.5 rounded-lg text-[8px] font-bold uppercase tracking-wide transition-all",
                                                        followedUsers.has((suggestedUser.userId || suggestedUser._id) as any)
                                                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                                            : "bg-primary text-white shadow-md shadow-primary/30"
                                                    )}
                                                >
                                                    {followedUsers.has((suggestedUser.userId || suggestedUser._id) as any) ? '✓' : 'Follow'}
                                                </motion.button>
                                            </motion.div>
                                        ))
                                ) : (
                                    <div className="w-full py-6 text-center">
                                        <Users className="w-6 h-6 text-slate-700 mx-auto mb-2" />
                                        <p className="text-[10px] font-bold text-slate-500">No suggestions yet</p>
                                    </div>
                                )}

                            </div>
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
                            <Button variant="ghost" size="icon" className={cn("h-12 w-12 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5", isActive(item.path) ? "text-primary bg-primary/15" : "text-slate-400 hover:text-white")}
                            >
                                <item.icon className="w-5 h-5" />
                            </Button>
                        </Link>
                    ))}
                    <Link to="/app/profile/me">
                        <Button variant="ghost" size="icon" className={cn("h-12 w-12 rounded-xl transition-all flex flex-col items-center justify-center gap-0.5", isActive("/app/profile") ? "text-primary bg-primary/15" : "text-slate-400 hover:text-white")}>
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
        </div>
    );
}
