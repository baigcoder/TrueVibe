import { useState, useEffect } from "react";
import { useSearch } from "@/api/hooks";
import { Input } from "@/components/ui/input";
import {
    Search, User, FileText, Film, Loader2, ShieldCheck,
    Heart, MessageCircle, X, Sparkles, TrendingUp, Users, ArrowUpRight, Video, Scan, Orbit, Plus
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type SearchType = 'all' | 'users' | 'posts' | 'shorts';

export default function SearchPage() {
    const [query, setQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [activeTab, setActiveTab] = useState<SearchType>('all');
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data, isLoading } = useSearch(debouncedQuery, activeTab);

    const tabs: { id: SearchType; label: string; icon: any }[] = [
        { id: 'all', label: 'All', icon: Search },
        { id: 'users', label: 'People', icon: User },
        { id: 'posts', label: 'Posts', icon: FileText },
        { id: 'shorts', label: 'Shorts', icon: Plus },
    ];

    return (
        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col overflow-hidden">
            {/* Header / Search Hero Section */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative pt-2 sm:pt-6 pb-4 sm:pb-8 flex-shrink-0"
            >
                {/* Immersive Background Effects */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none -z-10 overflow-hidden">
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            opacity: [0.2, 0.4, 0.2],
                            rotate: [0, 10, 0]
                        }}
                        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/20 rounded-full blur-[120px]"
                    />
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.15, 0.3, 0.15],
                            rotate: [0, -15, 0]
                        }}
                        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] bg-blue-500/10 rounded-full blur-[100px]"
                    />
                </div>

                <div className="flex flex-col items-center text-center space-y-1 mb-2 sm:mb-8">
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1 }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-inner"
                    >
                        <Sparkles className="w-3 h-3 text-primary animate-pulse" />
                        <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Discover the Vibe</span>
                    </motion.div>

                    <h1 className="text-xl sm:text-4xl md:text-6xl font-black text-white tracking-tighter italic uppercase">
                        Explore <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-emerald-400">Everything</span>
                    </h1>
                </div>

                {/* Aether Search Bar */}
                <div className={cn(
                    "relative max-w-3xl mx-auto transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]",
                    isFocused ? "scale-[1.03] -translate-y-1" : "scale-100"
                )}>
                    {/* Outer Glow */}
                    <div className={cn(
                        "absolute -inset-1 bg-gradient-to-r from-primary/40 via-blue-400/40 to-emerald-400/40 rounded-[2rem] blur-2xl opacity-0 transition-opacity duration-700",
                        isFocused && "opacity-100"
                    )} />

                    <div className="relative bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[2rem] p-1.5 sm:p-2.5 flex items-center gap-1 sm:gap-4 shadow-2xl transition-all duration-500 hover:border-white/20 group">
                        <div className="pl-2.5 sm:pl-4">
                            <Search className={cn(
                                "w-3.5 h-3.5 sm:w-5 sm:h-5 transition-all duration-500",
                                isFocused ? "text-primary scale-110 rotate-12" : "text-slate-500"
                            )} />
                        </div>
                        <Input
                            value={query}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search network..."
                            className="flex-1 min-w-0 bg-transparent border-none focus-visible:ring-0 text-white font-bold placeholder:text-slate-500/50 h-9 sm:h-14 text-xs sm:text-lg italic px-1"
                        />
                        <AnimatePresence>
                            {query && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="shrink-0"
                                >
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setQuery("")}
                                        className="h-6 w-6 sm:h-10 sm:w-10 text-slate-500 hover:text-white rounded-full bg-white/5"
                                    >
                                        <X className="w-3 h-3" />
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                        <Button className="bg-gradient-to-br from-primary via-blue-500 to-secondary hover:brightness-110 text-white font-black uppercase italic tracking-wider rounded-xl sm:rounded-2xl px-3 sm:px-8 h-8 sm:h-12 shadow-lg shadow-primary/20 transition-all active:scale-95 flex-shrink-0 text-[8px] sm:text-sm">
                            {isLoading ? <Loader2 className="w-3 h-3 sm:w-5 sm:h-5 animate-spin" /> : (
                                <div className="flex items-center gap-1 sm:gap-2">
                                    <span className="xs:inline">Sync</span>
                                    <TrendingUp className="w-2.5 h-2.5 sm:w-4 sm:h-4" />
                                </div>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex justify-center flex-wrap gap-1 sm:gap-1.5 mt-3 sm:mt-6">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            whileHover={{ y: -2, backgroundColor: "rgba(255,255,255,0.08)" }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setActiveTab(tab.id as SearchType)}
                            className={cn(
                                "px-3 sm:px-5 py-1.5 sm:py-2.5 rounded-xl sm:rounded-[1.2rem] flex items-center gap-1.5 sm:gap-2 transition-all duration-500 border text-[9px] sm:text-[11px] font-black uppercase tracking-[0.1em] relative overflow-hidden group/tab",
                                activeTab === tab.id
                                    ? "bg-white/10 text-white border-primary/40 shadow-[0_0_20px_rgba(129,140,248,0.2)]"
                                    : "bg-white/[0.03] border-white/5 text-slate-500 hover:text-slate-300"
                            )}
                        >
                            {activeTab === tab.id && (
                                <motion.div
                                    layoutId="search-tab-bg"
                                    className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/10 to-emerald-500/20 -z-10"
                                />
                            )}
                            <tab.icon className={cn(
                                "w-4 h-4 transition-all duration-500",
                                activeTab === tab.id ? "text-primary scale-110" : "group-hover/tab:text-primary"
                            )} />
                            {tab.label}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Results Grid - Scrollable Area */}
            <div className="relative flex-1 overflow-y-auto pr-1 pb-10 scroll-smooth custom-scrollbar">
                <AnimatePresence mode="wait">
                    {!debouncedQuery ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="flex flex-col items-center justify-center h-full text-center py-8"
                        >
                            <div className="relative mb-4 group">
                                <motion.div
                                    animate={{
                                        scale: [1, 1.15, 1],
                                        opacity: [0.3, 0.6, 0.3],
                                        rotate: [0, 5, 0]
                                    }}
                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 w-16 h-16 sm:w-28 sm:h-28 rounded-full bg-primary/30 blur-2xl opacity-50 mx-auto"
                                />
                                <div className="w-16 h-16 sm:w-28 sm:h-28 bg-white/[0.03] border border-white/10 rounded-2xl sm:rounded-[2.5rem] flex items-center justify-center relative shadow-2xl backdrop-blur-3xl group-hover:scale-110 group-hover:border-primary/40 transition-all duration-700 overflow-hidden">
                                    <motion.div
                                        animate={{
                                            rotate: 360,
                                            opacity: [0.1, 0.3, 0.1]
                                        }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-0 border-[1px] border-dashed border-primary/30 rounded-full scale-150"
                                    />
                                    <div className="relative z-10">
                                        <Scan className="w-6 h-6 sm:w-10 sm:h-10 text-white/10 group-hover:text-primary/50 transition-all duration-700" />
                                        <motion.div
                                            animate={{
                                                scale: [1, 1.2, 1],
                                                opacity: [0, 1, 0]
                                            }}
                                            transition={{ duration: 2, repeat: Infinity }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Orbit className="w-8 h-8 sm:w-14 sm:h-14 text-primary/20" />
                                        </motion.div>
                                    </div>
                                    {/* Scanning Line */}
                                    <motion.div
                                        animate={{ y: [-32, 32] }}
                                        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent z-0"
                                    />
                                </div>
                            </div>
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="space-y-1.5 mt-2"
                            >
                                <h2 className="text-base sm:text-2xl font-black text-white italic uppercase tracking-tighter">Initiate Bridge</h2>
                                <p className="text-[7px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] sm:tracking-[0.25em] max-w-[160px] sm:max-w-[280px] mx-auto leading-relaxed">Scanning network for premium vibes</p>
                            </motion.div>
                        </motion.div>
                    ) : isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20"
                        >
                            <div className="relative scale-75">
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                    className="w-14 h-14 border-t-2 border-r-2 border-primary rounded-full shadow-[0_0_20px_rgba(129,140,248,0.3)]"
                                />
                                <motion.div
                                    animate={{ rotate: -360 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute inset-2 border-b-2 border-l-2 border-blue-400 rounded-full opacity-50"
                                />
                            </div>
                            <p className="text-[8px] text-slate-500 font-black uppercase tracking-[0.4em] mt-6 animate-pulse italic">Scanning...</p>
                        </motion.div>
                    ) : (data?.data?.users?.length || data?.data?.posts?.length || data?.data?.shorts?.length) ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-16"
                        >
                            {/* People Results */}
                            {(activeTab === 'all' || activeTab === 'users') && data?.data?.users?.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                                                <Users className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Vibe Masters</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Network Connections</p>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-slate-400">
                                            {data.data.users.length} SYNCED
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                        {data.data.users.map((item: any, idx: number) => (
                                            <motion.div
                                                key={item.userId || item._id || idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                            >
                                                <Link
                                                    to="/app/profile/$id"
                                                    params={{ id: item.userId || item._id }}
                                                    className="group flex items-center gap-4 p-5 bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-3xl hover:bg-white/[0.06] hover:border-primary/30 transition-all duration-700 relative overflow-hidden shadow-xl"
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="relative">
                                                        <Avatar className="w-16 h-16 border-2 border-white/10 group-hover:border-primary/40 transition-all duration-700 rounded-2xl shadow-2xl">
                                                            <AvatarImage src={item.avatar} className="object-cover" />
                                                            <AvatarFallback className="bg-slate-900 text-white font-black italic">{item.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        {item.trustScore > 80 && (
                                                            <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary rounded-xl border-4 border-[#0c0c0e] flex items-center justify-center shadow-lg">
                                                                <ShieldCheck className="w-3.5 h-3.5 text-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 relative z-10">
                                                        <h4 className="font-black text-white text-lg tracking-tight group-hover:text-primary transition-colors truncate italic uppercase">{item.name}</h4>
                                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">@{item.handle}</p>

                                                        <div className="flex items-center gap-3">
                                                            <div className="flex -space-x-2">
                                                                {[1, 2, 3].map(i => (
                                                                    <div key={i} className="w-5 h-5 rounded-full border-2 border-[#0c0c0e] bg-white/5" />
                                                                ))}
                                                            </div>
                                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Mutuals</span>
                                                        </div>
                                                    </div>

                                                    <ArrowUpRight className="w-5 h-5 text-slate-700 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-500 self-start mr-1 mt-1" />
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Posts Results */}
                            {(activeTab === 'all' || activeTab === 'posts') && data?.data?.posts?.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                                <FileText className="w-5 h-5 text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Signal Feed</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Global Interactions</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {data.data.posts.map((post: any, idx: number) => (
                                            <motion.div
                                                key={post._id || idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.03 }}
                                            >
                                                <Link
                                                    to={`/app/feed`}
                                                    className="block p-7 bg-white/[0.03] backdrop-blur-2xl border border-white/5 rounded-3xl hover:bg-white/[0.06] hover:border-blue-500/30 transition-all duration-700 group h-full shadow-xl"
                                                >
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="w-10 h-10 border border-white/10 rounded-xl">
                                                                <AvatarImage src={post.userId?.avatar} className="object-cover" />
                                                                <AvatarFallback className="bg-slate-900 text-[10px] font-black">{post.userId?.name?.[0]}</AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="text-xs font-black text-white italic uppercase">{post.userId?.name}</p>
                                                                <p className="text-[9px] text-slate-500 font-bold tracking-widest uppercase">
                                                                    {new Date(post.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                                                            <ArrowUpRight className="w-4 h-4 text-slate-700 group-hover:text-blue-400 transition-colors" />
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-300 text-sm leading-[1.6] group-hover:text-white transition-colors line-clamp-3 mb-8 font-medium italic">
                                                        "{post.content}"
                                                    </p>

                                                    <div className="flex items-center gap-6">
                                                        <div className="flex items-center gap-2 group/stat">
                                                            <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center group-hover/stat:bg-pink-500/20 transition-colors">
                                                                <Heart className="w-3.5 h-3.5 text-pink-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-500 group-hover/stat:text-pink-400 transition-colors tracking-widest">{post.likesCount || 0}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 group/stat">
                                                            <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover/stat:bg-blue-500/20 transition-colors">
                                                                <MessageCircle className="w-3.5 h-3.5 text-blue-400" />
                                                            </div>
                                                            <span className="text-[10px] font-black text-slate-500 group-hover/stat:text-blue-400 transition-colors tracking-widest">{post.commentsCount || 0}</span>
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Shorts Results */}
                            {(activeTab === 'all' || activeTab === 'shorts') && data?.data?.shorts?.length > 0 && (
                                <section className="space-y-6">
                                    <div className="flex items-center justify-between px-2">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                                <Film className="w-5 h-5 text-orange-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-white italic uppercase tracking-tight">Rapid Stream</h3>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Instant Motion</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
                                        {data.data.shorts.map((short: any, idx: number) => (
                                            <motion.div
                                                key={short._id || idx}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: idx * 0.03 }}
                                                whileHover={{ y: -8, transition: { duration: 0.4 } }}
                                                className="group"
                                            >
                                                <Link
                                                    to="/app/shorts"
                                                    className="aspect-[9/16] relative rounded-[1.8rem] overflow-hidden block bg-[#0c0c0e] border border-white/5 shadow-2xl transition-all duration-700 group-hover:border-orange-500/40"
                                                >
                                                    {short.thumbnailUrl ? (
                                                        <img
                                                            src={short.thumbnailUrl}
                                                            alt=""
                                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-[1.5s] ease-[cubic-bezier(0.23,1,0.32,1)]"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-800 gap-3 bg-gradient-to-br from-[#0c0c0e] to-[#1a1a1e]">
                                                            <Video className="w-12 h-12 opacity-40 group-hover:scale-110 transition-transform duration-700" />
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

                                                    <div className="absolute bottom-5 left-5 right-5 z-20 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-700">
                                                        <p className="text-white text-xs font-black italic uppercase tracking-tight line-clamp-2 leading-tight mb-2 group-hover:text-orange-400 transition-colors">
                                                            {short.caption || 'No Data'}
                                                        </p>
                                                        <div className="flex items-center gap-2">
                                                            <Avatar className="w-5 h-5 border border-white/20">
                                                                <AvatarImage src={short.creator?.avatar} />
                                                                <AvatarFallback className="bg-slate-900 text-[8px] font-black">V</AvatarFallback>
                                                            </Avatar>
                                                            <span className="text-[8px] font-black text-white/50 uppercase tracking-widest group-hover:text-white transition-colors">
                                                                @{short.creator?.handle || 'user'}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Glow Overlay */}
                                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-orange-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="no-results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-32 text-center"
                        >
                            <div className="w-24 h-24 bg-white/[0.03] border border-white/10 rounded-3xl flex items-center justify-center mb-8 relative">
                                <div className="absolute inset-0 bg-rose-500/10 blur-2xl rounded-full" />
                                <Search className="w-10 h-10 text-slate-700" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-3 tracking-tighter uppercase italic">Sync Failure</h3>
                            <p className="text-sm text-slate-500 max-w-sm mx-auto font-medium uppercase tracking-wide">
                                We couldn't establish a bridge for "{debouncedQuery}". Reparameterize and try again.
                            </p>
                            <Button
                                variant="ghost"
                                onClick={() => setQuery("")}
                                className="mt-10 text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:bg-primary/5 rounded-xl px-8 h-12 border border-primary/10"
                            >
                                Force Reset
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
