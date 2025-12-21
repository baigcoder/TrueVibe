import { useState, useEffect } from "react";
import { useSearch } from "@/api/hooks";
import { Input } from "@/components/ui/input";
import { Search, User, FileText, Film, Loader2, ShieldCheck, Heart, MessageCircle, X } from "lucide-react";
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
        { id: 'shorts', label: 'Shorts', icon: Film },
    ];

    return (
        <div className="max-w-5xl mx-auto px-4 pb-20 space-y-10">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-50 pt-8"
            >
                {/* Aurora Background */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] overflow-hidden -z-10">
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[-50%] left-[-20%] w-[80%] h-[80%] bg-primary/20 rounded-full blur-[120px]"
                    />
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
                        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[-30%] right-[-20%] w-[60%] h-[60%] bg-emerald-500/15 rounded-full blur-[100px]"
                    />
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight mb-3">
                        Discover
                    </h1>
                    <p className="text-slate-400 text-sm">Find people, posts, and videos on TrueVibe</p>
                </div>

                {/* Search Input */}
                <div className={cn(
                    "relative max-w-2xl mx-auto transition-all duration-500",
                    isFocused ? "scale-[1.02]" : "scale-100"
                )}>
                    <div className={cn(
                        "absolute -inset-0.5 bg-gradient-to-r from-primary/50 via-emerald-500/50 to-primary/50 rounded-2xl blur opacity-0 transition-opacity duration-500",
                        isFocused && "opacity-100"
                    )} />

                    <div className="relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-2 flex items-center gap-2 shadow-2xl">
                        <div className="pl-4">
                            <Search className={cn(
                                "w-5 h-5 transition-colors duration-300",
                                isFocused ? "text-primary" : "text-slate-500"
                            )} />
                        </div>
                        <Input
                            value={query}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search for people, posts, or topics..."
                            className="bg-transparent border-none focus-visible:ring-0 text-white font-medium placeholder:text-slate-500 h-12 text-base"
                        />
                        {query && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setQuery("")}
                                className="mr-2 text-slate-500 hover:text-white rounded-xl"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        )}
                        <Button className="bg-primary hover:bg-primary/90 text-white font-medium rounded-xl px-6 h-10 shadow-lg shadow-primary/20 transition-all active:scale-95 flex-shrink-0">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex justify-center flex-wrap gap-2 mt-8">
                    {tabs.map((tab) => (
                        <motion.button
                            key={tab.id}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "px-5 py-2.5 rounded-xl flex items-center gap-2.5 transition-all duration-300 border text-sm font-medium",
                                activeTab === tab.id
                                    ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                    : "bg-white/[0.03] border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </motion.button>
                    ))}
                </div>
            </motion.div>

            {/* Results */}
            <div className="relative min-h-[400px]">
                <AnimatePresence mode="sync">
                    {!debouncedQuery ? (
                        <motion.div
                            key="empty"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center justify-center py-20 text-center"
                        >
                            <motion.div
                                initial={{ scale: 0.9 }}
                                animate={{ scale: 1 }}
                                className="relative mb-8"
                            >
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 w-24 h-24 rounded-[1.5rem] bg-gradient-to-br from-primary/30 to-emerald-500/30 blur-2xl"
                                />
                                <div className="w-24 h-24 bg-white/[0.03] border border-white/10 rounded-[1.5rem] flex items-center justify-center relative shadow-2xl backdrop-blur-xl">
                                    <Search className="w-10 h-10 text-white/40" />
                                </div>
                            </motion.div>
                            <h2 className="text-2xl font-bold text-white mb-3">Start Exploring</h2>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
                                Search for people to connect with, discover trending posts, or find short videos.
                            </p>

                            <div className="mt-10 flex flex-wrap justify-center gap-3 max-w-lg">
                                {['Trending', 'Photography', 'Music', 'Art'].map((tag) => (
                                    <Button
                                        key={tag}
                                        variant="outline"
                                        onClick={() => setQuery(tag)}
                                        className="bg-white/[0.02] border-white/10 rounded-xl h-10 font-medium text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                                    >
                                        #{tag}
                                    </Button>
                                ))}
                            </div>
                        </motion.div>
                    ) : isLoading ? (
                        <motion.div
                            key="loading"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-32"
                        >
                            <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
                            <p className="text-sm text-slate-400 font-medium">Searching...</p>
                        </motion.div>
                    ) : (data?.data?.users?.length || data?.data?.posts?.length || data?.data?.shorts?.length) ? (
                        <motion.div
                            key="results"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-12"
                        >
                            {/* Users */}
                            {(activeTab === 'all' || activeTab === 'users') && data?.data?.users?.length > 0 && (
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <User className="w-4 h-4 text-primary" />
                                            People
                                        </h3>
                                        <span className="text-xs text-slate-500">{data.data.users.length} found</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {data.data.users.map((user: any, idx: number) => (
                                            <motion.div
                                                key={user.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <Link
                                                    to="/app/profile/$id"
                                                    params={{ id: user.id }}
                                                    className="flex items-center gap-4 p-5 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/[0.04] hover:border-primary/30 transition-all group"
                                                >
                                                    <div className="relative">
                                                        <Avatar className="w-14 h-14 border-2 border-white/10 group-hover:border-primary/50 transition-colors rounded-xl">
                                                            <AvatarImage src={user.avatar} />
                                                            <AvatarFallback className="bg-slate-800 text-white font-bold">{user.name[0]}</AvatarFallback>
                                                        </Avatar>
                                                        {user.trustScore > 80 && (
                                                            <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-lg border-2 border-[#020617] flex items-center justify-center">
                                                                <ShieldCheck className="w-3 h-3 text-white" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-bold text-white group-hover:text-primary transition-colors truncate">{user.name}</h4>
                                                        <p className="text-xs text-slate-500">@{user.handle}</p>
                                                        {user.trustScore && (
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                                <span className="text-[10px] text-emerald-400 font-medium">{user.trustScore}% Trust Score</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Posts */}
                            {(activeTab === 'all' || activeTab === 'posts') && data?.data?.posts?.length > 0 && (
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <FileText className="w-4 h-4 text-primary" />
                                            Posts
                                        </h3>
                                        <span className="text-xs text-slate-500">{data.data.posts.length} found</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {data.data.posts.map((post: any, idx: number) => (
                                            <motion.div
                                                key={post._id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                            >
                                                <Link
                                                    to={`/app/feed`}
                                                    className="block p-6 bg-white/[0.02] backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-white/[0.04] hover:border-white/20 transition-all group"
                                                >
                                                    <div className="flex items-center gap-3 mb-4">
                                                        <Avatar className="w-9 h-9 border border-white/10 rounded-lg">
                                                            <AvatarImage src={post.userId?.avatar} />
                                                            <AvatarFallback className="bg-slate-800 text-xs font-bold">{post.userId?.name?.[0]}</AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <span className="text-sm font-bold text-white">{post.userId?.name}</span>
                                                            <span className="text-xs text-slate-500 ml-2">
                                                                {new Date(post.createdAt).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    <p className="text-slate-300 text-sm leading-relaxed group-hover:text-white transition-colors line-clamp-3 mb-4">{post.content}</p>

                                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                                        <div className="flex items-center gap-1.5">
                                                            <Heart className="w-3.5 h-3.5" />
                                                            {post.likesCount || 0}
                                                        </div>
                                                        <div className="flex items-center gap-1.5">
                                                            <MessageCircle className="w-3.5 h-3.5" />
                                                            {post.commentsCount || 0}
                                                        </div>
                                                    </div>
                                                </Link>
                                            </motion.div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Shorts */}
                            {(activeTab === 'all' || activeTab === 'shorts') && data?.data?.shorts?.length > 0 && (
                                <section className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                            <Film className="w-4 h-4 text-rose-500" />
                                            Shorts
                                        </h3>
                                        <span className="text-xs text-slate-500">{data.data.shorts.length} found</span>
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                        {data.data.shorts.map((short: any) => (
                                            <motion.div
                                                key={short._id}
                                                whileHover={{ y: -6, scale: 1.02 }}
                                                className="group"
                                            >
                                                <Link
                                                    to={`/app/shorts`}
                                                    className="aspect-[9/16] relative rounded-2xl overflow-hidden block bg-slate-900 border border-white/10 shadow-xl"
                                                >
                                                    {short.thumbnailUrl ? (
                                                        <img src={short.thumbnailUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-600 gap-2 bg-gradient-to-br from-slate-900 to-slate-800">
                                                            <Film className="w-10 h-10" />
                                                        </div>
                                                    )}

                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                                                    <div className="absolute bottom-3 left-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <p className="text-white text-xs font-medium line-clamp-2">{short.caption}</p>
                                                    </div>
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
                            className="flex flex-col items-center justify-center py-24 text-center"
                        >
                            <div className="w-20 h-20 bg-white/[0.03] border border-white/10 rounded-2xl flex items-center justify-center mb-6">
                                <Search className="w-9 h-9 text-slate-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">No results found</h3>
                            <p className="text-sm text-slate-400 max-w-sm mx-auto">
                                We couldn't find anything matching "{debouncedQuery}". Try a different search term.
                            </p>
                            <Button
                                variant="ghost"
                                onClick={() => setQuery("")}
                                className="mt-6 text-primary font-medium hover:bg-primary/10 rounded-xl"
                            >
                                Clear search
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
