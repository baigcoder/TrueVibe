import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Heart, MessageCircle, Share2, Bookmark, Play,
    Volume2, VolumeX, MoreHorizontal, ChevronUp, ChevronDown,
    ShieldCheck, Loader2, Zap, Sparkles, TrendingUp, Cpu, Plus, Upload, X, Video, Check, Trash2
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useShortsFeed,
    useLikeShort,
    useUnlikeShort,
    useRecordShortView,
    useCreateShort,
    useDeleteShort,
    useShortComments,
    useCreateShortComment,
    useFollowUser,
    useUnfollowUser
} from "@/api/hooks";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

// Internal Component for Individual Short to manage its own video state
const ShortItem = ({
    short,
    isActive,
    isMuted,
    toggleMute,
    onCommentClick,
    onLikeToggle,
    index,
    currentIndex
}: {
    short: any,
    isActive: boolean,
    isMuted: boolean,
    toggleMute: () => void,
    onCommentClick: () => void,
    onLikeToggle: (id: string, liked: boolean) => void,
    index: number,
    currentIndex: number
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showHeart, setShowHeart] = useState(false);
    const followMutation = useFollowUser();
    const unfollowMutation = useUnfollowUser();
    const recordView = useRecordShortView();
    const deleteMutation = useDeleteShort();
    const { profile } = useAuth();
    const isOwner = profile?._id === short.userId || profile?._id === short.creator?._id;

    const [shouldLoad, setShouldLoad] = useState(false);

    useEffect(() => {
        // Preload if within 2 units of distance
        const distance = Math.abs(index - currentIndex);
        if (distance <= 1) {
            setShouldLoad(true);
        }
    }, [currentIndex, index]);

    useEffect(() => {
        if (isActive && videoRef.current) {
            videoRef.current.play().catch(() => { });
            setIsPlaying(true);
            if (short._id && !short._id.toString().startsWith('mock-')) {
                recordView.mutate(short._id);
            }
        } else if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive, short._id, shouldLoad]);

    const handlePlayPause = () => {
        if (isPlaying) {
            videoRef.current?.pause();
        } else {
            videoRef.current?.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleDoubleTap = () => {
        if (!short.isLiked) {
            onLikeToggle(short._id, false);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 1000);
        }
    };

    return (
        <div className="h-full w-full relative bg-slate-950 flex items-center justify-center snap-start">
            {/* Video Layer */}
            <div className="relative h-full w-full max-w-[450px] overflow-hidden md:rounded-[2.5rem] shadow-2xl border-x md:border border-white/10">
                {(isActive || shouldLoad) && (
                    <video
                        ref={videoRef}
                        src={short.videoUrl}
                        poster={short.thumbnailUrl}
                        preload={isActive ? "auto" : "metadata"}
                        className="h-full w-full object-cover cursor-pointer bg-slate-900"
                        loop
                        playsInline
                        muted={isMuted}
                        onClick={handlePlayPause}
                        onDoubleClick={handleDoubleTap}
                    />
                )}
                {!shouldLoad && !isActive && (
                    <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                        <img src={short.thumbnailUrl} className="w-full h-full object-cover opacity-50 blur-sm" alt="" />
                        <Loader2 className="w-8 h-8 text-primary animate-spin absolute" />
                    </div>
                )}

                {/* Heart Animation on Double Tap */}
                <AnimatePresence>
                    {showHeart && (
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.5, opacity: 1 }}
                            exit={{ scale: 2, opacity: 0 }}
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
                        >
                            <Heart className="w-24 h-24 text-primary fill-primary drop-shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Pause Indicator */}
                {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none z-10 transition-opacity">
                        <div className="w-20 h-20 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center">
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                        </div>
                    </div>
                )}

                {/* HUD Overlays */}
                <div className="absolute inset-0 p-3 sm:p-4 lg:p-6 flex flex-col justify-between z-30" style={{ pointerEvents: 'none' }}>
                    {/* Top Stats */}
                    <div className="flex justify-between items-start" style={{ pointerEvents: 'auto' }}>
                        <div className="flex gap-2 flex-wrap">
                            <div className={cn(
                                "px-3 py-1.5 rounded-xl border flex items-center gap-2",
                                short.trustLevel === 'authentic' ? "bg-[#10b981]/20 border-[#10b981]/30 text-emerald-400" : "bg-[#f59e0b]/20 border-[#f59e0b]/30 text-amber-400"
                            )}>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span className="text-[9px] font-black uppercase tracking-widest">{short.trustLevel.toUpperCase()}</span>
                            </div>
                            <div className="px-3 py-1.5 rounded-xl bg-black/40 border border-white/10 text-white/70 flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[9px] font-black uppercase tracking-widest">STREAM_VIBE</span>
                            </div>
                        </div>
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                            className="w-10 h-10 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
                        >
                            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                        </button>
                    </div>

                    {/* Bottom Info Section */}
                    <div className="flex items-end justify-between pb-16 sm:pb-4 lg:pb-0" style={{ pointerEvents: 'auto' }}>
                        <div className="flex-1 mr-4 sm:mr-6 max-w-[55%] sm:max-w-[65%]">
                            <div className="flex items-center gap-3 mb-4">
                                <motion.div whileHover={{ scale: 1.05 }} className="relative">
                                    <Avatar className="w-12 h-12 border-2 border-primary/30 rounded-2xl shadow-xl">
                                        <AvatarImage src={short.creator?.avatar} />
                                        <AvatarFallback className="bg-slate-800 text-white font-black">{short.creator?.name?.[0]}</AvatarFallback>
                                    </Avatar>
                                    {short.creator?.trustScore > 80 && (
                                        <div className="absolute -bottom-1 -right-1 bg-primary text-white p-0.5 rounded-lg border-2 border-slate-900">
                                            <Sparkles className="w-2 h-2" />
                                        </div>
                                    )}
                                </motion.div>
                                <div className="flex-1">
                                    <h3 className="text-sm sm:text-lg font-black text-white leading-tight uppercase tracking-tight flex items-center gap-2 truncate">
                                        {short.creator?.name}
                                        {short.creator?.isFollowing && <Check className="w-3 h-3 text-primary" />}
                                    </h3>
                                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest">@{short.creator?.handle}</p>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (short.creator?.isFollowing) {
                                            unfollowMutation.mutate(short.creator?._id);
                                        } else {
                                            followMutation.mutate(short.creator?._id);
                                        }
                                    }}
                                    className={cn(
                                        "rounded-xl font-black text-[10px] uppercase tracking-widest h-9 px-4 transition-all",
                                        short.creator?.isFollowing
                                            ? "bg-white/10 border border-white/10 text-white hover:bg-white/20"
                                            : "bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20"
                                    )}
                                >
                                    {short.creator?.isFollowing ? 'Following' : 'Follow'}
                                </Button>
                            </div>
                            <div className="bg-black/60 rounded-xl sm:rounded-2xl p-3 sm:p-4 border border-white/5 group-hover/video:bg-black/80 transition-all">
                                <p className="text-white text-xs sm:text-sm leading-relaxed line-clamp-2 italic opacity-90">
                                    {short.caption || "Synchronizing visual fragments..."}
                                </p>
                                <div className="flex gap-2 mt-2">
                                    {short.hashtags?.map((tag: string) => (
                                        <span key={tag} className="text-primary text-[10px] font-black uppercase tracking-widest">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Action Bar (Vertical) - MUST have pointer-events-auto */}
                        <div
                            className="flex flex-col gap-4 items-center pb-4 flex-shrink-0"
                            style={{ pointerEvents: 'auto', zIndex: 100, position: 'relative' }}
                        >
                            <ActionButton
                                icon={Heart}
                                label={formatNumber(short.likesCount)}
                                color="rose-500"
                                isActive={short.isLiked}
                                onClick={() => onLikeToggle(short._id, short.isLiked)}
                            />
                            <ActionButton
                                icon={MessageCircle}
                                label={formatNumber(short.commentsCount)}
                                color="primary"
                                onClick={onCommentClick}
                            />
                            <ActionButton
                                icon={Bookmark}
                                label="SAVE"
                                color="amber-400"
                                isActive={false}
                                onClick={() => { }}
                            />
                            <ActionButton
                                icon={Share2}
                                label="SHARE"
                                color="white"
                                onClick={() => { }}
                            />
                            {isOwner && (
                                <ActionButton
                                    icon={Trash2}
                                    label="DELETE"
                                    color="white"
                                    onClick={(e: any) => {
                                        e.stopPropagation();
                                        if (confirm('Delete this transmission?')) {
                                            deleteMutation.mutate(short._id);
                                        }
                                    }}
                                />
                            )}
                            <button className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-white/40 hover:text-white transition-all">
                                <MoreHorizontal className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Progress Bar (at bottom of video) */}
                <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/5 z-30">
                    <motion.div
                        className="h-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.7)]"
                        initial={{ width: 0 }}
                        animate={isActive ? { width: '100%' } : { width: 0 }}
                        transition={{ duration: 30, ease: 'linear', repeat: Infinity }}
                    />
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, color, isActive = false, onClick }: any) => {
    const getColors = () => {
        if (color === 'rose-500') {
            return isActive
                ? 'bg-rose-500/30 border-rose-500 text-rose-400'
                : 'bg-black/70 border-white/30 text-white';
        }
        if (color === 'primary') {
            return isActive
                ? 'bg-primary/30 border-primary text-primary'
                : 'bg-black/70 border-white/30 text-white';
        }
        if (color === 'amber-400') {
            return isActive
                ? 'bg-amber-400/30 border-amber-400 text-amber-400'
                : 'bg-black/70 border-white/30 text-white';
        }
        return 'bg-black/70 border-white/30 text-white';
    };

    return (
        <button
            type="button"
            onClick={(e) => {
                e.stopPropagation();
                onClick?.();
            }}
            className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center border-2 shadow-2xl backdrop-blur-md",
                "active:scale-90 transition-transform cursor-pointer",
                getColors()
            )}
            style={{ pointerEvents: 'auto' }}
        >
            <Icon className={cn("w-7 h-7", isActive && "fill-current")} />
        </button>
    );
};

const formatNumber = (num: number): string => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
};

export default function ShortsPage() {
    const { data, isLoading, fetchNextPage, hasNextPage } = useShortsFeed();
    const likeMutation = useLikeShort();
    const unlikeMutation = useUnlikeShort();
    const createCommentMutation = useCreateShortComment();
    const createShortMutation = useCreateShort();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMuted, setIsMuted] = useState(true);
    const [isCommentOpen, setIsCommentOpen] = useState(false);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [caption, setCaption] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Mock data for initial fill
    const mockShorts = [
        {
            _id: 'mock-1',
            caption: 'TrueVibe visual protocol transmission active. Stay tuned for details.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
            trustLevel: 'authentic',
            likesCount: 1247,
            commentsCount: 89,
            isLiked: false,
            creator: {
                _id: 'user-1',
                name: 'Neon Horizon',
                handle: 'neonhorizon',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Neon',
                trustScore: 92,
                isFollowing: false
            }
        },
        {
            _id: 'mock-2',
            caption: 'Decrypting fragmented reality. The grid is alive.',
            videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
            thumbnailUrl: 'https://images.unsplash.com/photo-1611162616475-46b635cb6868?w=400',
            trustLevel: 'authentic',
            likesCount: 3421,
            commentsCount: 156,
            isLiked: true,
            creator: {
                _id: 'user-2',
                name: 'Grid Runner',
                handle: 'gridrunner',
                avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grid',
                trustScore: 85,
                isFollowing: true
            }
        }
    ];

    const apiShorts = data?.pages.flatMap((page: any) => page.data.shorts) || [];
    const shorts = apiShorts.length > 0 ? apiShorts : mockShorts;
    const currentShort = shorts[currentIndex];

    const { data: commentsData, isLoading: loadingComments } = useShortComments(
        (!currentShort?._id || currentShort._id.startsWith('mock-')) ? '' : currentShort._id
    );
    const comments = commentsData?.pages.flatMap((page: any) => page.data.comments) || [];

    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;
        const scrollSnap = containerRef.current.scrollTop / containerRef.current.clientHeight;
        const index = Math.round(scrollSnap);
        if (index !== currentIndex) {
            setCurrentIndex(index);
            if (index >= shorts.length - 2 && hasNextPage) {
                fetchNextPage();
            }
        }
    }, [currentIndex, shorts.length, hasNextPage, fetchNextPage]);

    const handleLikeToggle = async (id: string, currentlyLiked: boolean) => {
        if (id.startsWith('mock-')) {
            // Show feedback for mock data
            console.log('Cannot like mock data');
            return;
        }

        try {
            if (currentlyLiked) {
                await unlikeMutation.mutateAsync(id);
            } else {
                await likeMutation.mutateAsync(id);
            }
        } catch (error) {
            console.error('Like failed:', error);
        }
    };

    const scrollToIndex = (index: number) => {
        if (containerRef.current) {
            containerRef.current.scrollTo({
                top: index * containerRef.current.clientHeight,
                behavior: 'smooth'
            });
        }
    };

    const handlePostComment = async () => {
        if (!commentText.trim() || !currentShort?._id || currentShort._id.startsWith('mock-')) return;
        try {
            await createCommentMutation.mutateAsync({
                shortId: currentShort._id,
                content: commentText
            });
            setCommentText('');
        } catch (e) {
            console.error(e);
        }
    };

    if (isLoading && apiShorts.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-slate-950">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full border-t-2 border-primary animate-spin" />
                    <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <p className="mt-10 font-heading font-black text-slate-500 uppercase tracking-[0.5em] text-[10px] animate-pulse">Initializing Virtual Network...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[calc(100vh-160px)] sm:h-[calc(100vh-180px)] lg:h-[calc(100vh-100px)] flex flex-col items-center bg-slate-950/50 rounded-xl sm:rounded-2xl lg:rounded-[2rem] overflow-hidden border border-white/5">
            {/* Main Scrolling Feed */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory relative z-10"
                style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {shorts.map((short, index) => (
                    <ShortItem
                        key={short._id + index}
                        short={short}
                        isActive={index === currentIndex}
                        isMuted={isMuted}
                        toggleMute={() => setIsMuted(!isMuted)}
                        onCommentClick={() => setIsCommentOpen(true)}
                        onLikeToggle={handleLikeToggle}
                        index={index}
                        currentIndex={currentIndex}
                    />
                ))}
            </div>

            {/* Navigation Overlay - Contained within parent */}
            <div className="absolute top-1/2 right-2 lg:right-8 -translate-y-1/2 z-50 flex flex-col gap-4 lg:gap-6 pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollToIndex(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-black/40 border border-white/10 text-white hover:bg-black/60 shadow-2xl backdrop-blur-md disabled:opacity-20 flex-shrink-0"
                >
                    <ChevronUp className="w-5 h-5 lg:w-6 lg:h-6" />
                </Button>

                <div className="flex flex-col items-center gap-2">
                    <div className="h-24 w-1 rounded-full bg-white/5 overflow-hidden relative">
                        <motion.div
                            className="absolute top-0 left-0 w-full bg-primary shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                            animate={{ height: `${((currentIndex + 1) / shorts.length) * 100}%` }}
                        />
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollToIndex(currentIndex + 1)}
                    disabled={currentIndex === shorts.length - 1 && !hasNextPage}
                    className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-black/40 border border-white/10 text-white hover:bg-black/60 shadow-2xl backdrop-blur-md disabled:opacity-20 flex-shrink-0"
                >
                    <ChevronDown className="w-5 h-5 lg:w-6 lg:h-6" />
                </Button>
            </div>

            {/* Create Button Overlay */}
            <div className="absolute bottom-6 left-4 lg:bottom-10 lg:left-10 z-50">
                <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsCreateOpen(true)}
                    className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-gradient-to-br from-primary via-purple-500 to-rose-400 p-0.5 shadow-2xl shadow-primary/40 group"
                >
                    <div className="w-full h-full bg-slate-900 rounded-[0.9rem] lg:rounded-[1.3rem] flex items-center justify-center transition-all group-hover:bg-transparent">
                        <Plus className="w-6 h-6 lg:w-7 lg:h-7 text-white" />
                    </div>
                </motion.button>
            </div>

            {/* Comments Right Panel */}
            <AnimatePresence>
                {isCommentOpen && (
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'tween', duration: 0.25 }}
                        className="fixed inset-0 md:absolute md:right-0 md:top-0 md:bottom-0 md:left-auto z-[100] w-full md:w-[400px] bg-[#0c0c0e]/98 md:border-l border-white/10 p-4 sm:p-6 md:p-8 flex flex-col shadow-2xl md:rounded-l-[2rem] backdrop-blur-xl safe-area-inset-bottom"
                    >
                        <div className="flex items-center justify-between mb-4 sm:mb-6 flex-shrink-0">
                            <h3 className="font-heading font-black text-lg sm:text-xl text-white uppercase italic tracking-tighter flex items-center gap-2 sm:gap-3">
                                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                                Comments
                            </h3>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setIsCommentOpen(false)}
                                className="text-white/40 hover:text-white -mr-2"
                            >
                                <X className="w-6 h-6" />
                            </Button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 sm:space-y-6 pr-1 mb-4 no-scrollbar overscroll-contain">
                            {loadingComments ? (
                                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-primary" /></div>
                            ) : comments.length === 0 ? (
                                <div className="text-center py-16 opacity-30">
                                    <Zap className="w-12 h-12 mx-auto mb-3" />
                                    <p className="font-black uppercase tracking-widest text-[10px]">No comments yet</p>
                                </div>
                            ) : (
                                comments.map((comment: any) => (
                                    <div key={comment._id} className="flex gap-3">
                                        <Avatar className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl border border-white/10 flex-shrink-0">
                                            <AvatarImage src={comment.author?.avatar} />
                                            <AvatarFallback className="bg-slate-800 text-white font-black text-xs">{comment.author?.name?.[0]}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-xs sm:text-sm font-bold text-white truncate">{comment.author?.name}</span>
                                            </div>
                                            <div className="bg-white/5 border border-white/5 rounded-xl sm:rounded-2xl rounded-tl-sm p-3 sm:p-4">
                                                <p className="text-white/80 text-xs sm:text-sm leading-relaxed">{comment.content}</p>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 px-1">
                                                <button className="flex items-center gap-1 text-[10px] font-bold text-white/30 hover:text-rose-500">
                                                    <Heart className="w-3 h-3" /> {comment.likesCount || 0}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="flex gap-2 sm:gap-3 bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-2 sm:p-3 items-center focus-within:border-primary/50 transition-all flex-shrink-0 pb-[env(safe-area-inset-bottom,8px)]">
                            <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                placeholder="Write a comment..."
                                className="bg-transparent border-none text-white text-sm focus:outline-none flex-1 placeholder:text-white/30 px-2 sm:px-3 min-w-0"
                            />
                            <Button
                                size="sm"
                                onClick={handlePostComment}
                                disabled={!commentText.trim() || createCommentMutation.isPending}
                                className="bg-primary hover:bg-primary/80 text-white rounded-xl sm:rounded-2xl h-9 sm:h-10 px-4 sm:px-6 font-bold text-xs sm:text-sm flex-shrink-0"
                            >
                                {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send'}
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Stream Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="bg-slate-900/95 backdrop-blur-3xl border border-white/10 rounded-2xl sm:rounded-[3rem] max-w-[95vw] sm:max-w-lg p-0 overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] max-h-[90vh] flex flex-col">
                    <div className="p-5 sm:p-8 overflow-y-auto flex-1">
                        <DialogHeader>
                            <DialogTitle className="text-xl sm:text-2xl font-heading font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                <Video className="w-6 h-6 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]" />
                                Stream
                            </DialogTitle>
                            <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-2 leading-relaxed">
                                Broadcast your visual fragment to the grid
                            </p>
                        </DialogHeader>

                        <div className="mt-6 sm:mt-8 space-y-5 sm:space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={cn(
                                    "relative aspect-[9/16] max-h-[250px] sm:max-h-[320px] rounded-2xl sm:rounded-[2rem] border-2 border-dashed transition-all cursor-pointer overflow-hidden group/upload mx-auto",
                                    selectedFile ? "border-primary bg-primary/5" : "border-white/10 bg-white/[0.02] hover:border-primary/50"
                                )}
                            >
                                {previewUrl ? (
                                    <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center group-hover/upload:scale-105 transition-transform duration-500">
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center mb-4 shadow-xl">
                                            <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                                        </div>
                                        <p className="text-sm sm:text-base font-black text-white mb-1 uppercase italic tracking-tight">Drop Visual Fragment</p>
                                        <p className="text-[9px] sm:text-[10px] text-slate-500 font-black uppercase tracking-widest">MP4, MOV • MAX_60S</p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            setSelectedFile(file);
                                            setPreviewUrl(URL.createObjectURL(file));
                                        }
                                    }}
                                />
                            </div>

                            {/* Show file info if selected */}
                            {selectedFile && (
                                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                                    <Video className="w-5 h-5 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold text-white truncate">{selectedFile.name}</p>
                                        <p className="text-[10px] text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setPreviewUrl(null); }} className="text-slate-400 hover:text-rose-400">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-[9px] text-slate-500 font-black uppercase tracking-[0.2em] block ml-1">Caption</label>
                                <Textarea
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                    placeholder="Add a caption..."
                                    className="bg-white/[0.03] border-white/10 rounded-xl text-white placeholder:text-slate-600 min-h-[80px] focus:border-primary/30 transition-all p-4 text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Fixed Submit Button */}
                    <div className="p-4 sm:p-6 border-t border-white/5 bg-slate-900/50 shrink-0">
                        <Button
                            onClick={async () => {
                                if (!selectedFile) return;
                                setIsUploading(true);
                                try {
                                    const formData = new FormData();
                                    formData.append('video', selectedFile);
                                    formData.append('caption', caption);
                                    await createShortMutation.mutateAsync(formData);
                                    setIsCreateOpen(false);
                                    setSelectedFile(null);
                                    setPreviewUrl(null);
                                    setCaption("");
                                } catch (error) {
                                    console.error(error);
                                } finally {
                                    setIsUploading(false);
                                }
                            }}
                            disabled={!selectedFile || isUploading}
                            className="w-full h-12 sm:h-14 bg-gradient-to-r from-primary via-purple-600 to-rose-500 hover:opacity-90 text-white font-heading font-black italic uppercase tracking-widest rounded-xl sm:rounded-2xl shadow-xl shadow-primary/20 transition-all text-sm"
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Zap className="w-4 h-4 mr-2" />
                                    Broadcast
                                </>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
