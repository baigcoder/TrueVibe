import React, { useState, useEffect, useRef, useCallback } from "react";
import { m, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import {
    Heart, MessageCircle, Share2, Bookmark, Play,
    Volume2, VolumeX, MoreHorizontal, ChevronUp, ChevronDown,
    ShieldCheck, Loader2, Zap, TrendingUp, Cpu, Plus, Upload, X, Video, Check, Trash2, Send, MessageSquare
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
    const progressRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(true);
    const [showHeart, setShowHeart] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isBuffering, setIsBuffering] = useState(false);
    const [showControls, setShowControls] = useState(false);
    const [videoError, setVideoError] = useState(false);
    const followMutation = useFollowUser();
    const unfollowMutation = useUnfollowUser();
    const recordView = useRecordShortView();
    const deleteMutation = useDeleteShort();
    const { profile } = useAuth();
    const isOwner = profile?._id === short.userId || profile?._id === short.creator?._id;
    const shouldLoad = isActive || Math.abs(index - currentIndex) <= 1;
    const controlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Format time as M:SS
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    useEffect(() => {
        if (isActive) {
            setIsPlaying(true);
            const playPromise = videoRef.current?.play();
            if (playPromise !== undefined) {
                playPromise.catch(() => setIsPlaying(false));
            }
            // Record view after 3 seconds
            const timer = setTimeout(() => {
                if (short._id && !short._id.toString().startsWith('mock-')) {
                    recordView.mutate(short._id);
                }
            }, 3000);
            return () => clearTimeout(timer);
        } else {
            videoRef.current?.pause();
        }
    }, [isActive, short._id]);

    // Video event listeners
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleCanPlay = () => setIsBuffering(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('waiting', handleWaiting);
        video.addEventListener('playing', handlePlaying);
        video.addEventListener('canplay', handleCanPlay);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('waiting', handleWaiting);
            video.removeEventListener('playing', handlePlaying);
            video.removeEventListener('canplay', handleCanPlay);
        };
    }, []);

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play();
            setIsPlaying(true);
        }
        // Show controls briefly
        setShowControls(true);
        if (controlsTimeout.current) clearTimeout(controlsTimeout.current);
        controlsTimeout.current = setTimeout(() => setShowControls(false), 2000);
    };

    const handleDoubleTap = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!short.isLiked) {
            onLikeToggle(short._id, false);
            setShowHeart(true);
            setTimeout(() => setShowHeart(false), 800);
        }
    };

    // Seek video via progress bar
    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || !progressRef.current) return;
        e.stopPropagation();
        const rect = progressRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const newTime = percent * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className="h-full w-full relative bg-black flex items-center justify-center snap-start overflow-hidden">
            {/* Desktop Background Blur */}
            <div className="hidden md:block absolute inset-0 z-0 opacity-40">
                <img src={short.thumbnailUrl} className="w-full h-full object-cover blur-[100px] scale-150" alt="" />
                <div className="absolute inset-0 bg-black/60" />
            </div>

            {/* Main Content Layer */}
            <div className="relative h-full w-full max-w-[450px] md:h-[92vh] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.8)] z-10 border-x border-white/5 md:border md:border-white/10">

                {/* 1. Video Layer - Base Level */}
                <div
                    className="absolute inset-0 z-0 bg-slate-950 cursor-pointer"
                    onClick={handlePlayPause}
                    onDoubleClick={handleDoubleTap}
                >
                    {videoError ? (
                        // Fallback UI for broken/missing videos
                        <div className="h-full w-full relative flex flex-col items-center justify-center">
                            <img
                                src={short.thumbnailUrl}
                                className="w-full h-full object-cover opacity-30 absolute inset-0"
                                alt=""
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/80" />
                            <div className="relative z-10 flex flex-col items-center gap-4 px-8 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                                    <Video className="w-8 h-8 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-white font-bold text-lg">Video Unavailable</p>
                                    <p className="text-white/50 text-sm mt-1">This video may have been removed</p>
                                </div>
                            </div>
                        </div>
                    ) : shouldLoad ? (
                        <video
                            ref={videoRef}
                            src={short.videoUrl}
                            poster={short.thumbnailUrl}
                            preload={isActive ? "auto" : "metadata"}
                            className="h-full w-full object-cover"
                            loop
                            playsInline
                            muted={isMuted}
                            onError={() => setVideoError(true)}
                        />
                    ) : (
                        <div className="h-full w-full relative">
                            <img src={short.thumbnailUrl} className="w-full h-full object-cover opacity-50 blur-sm" alt="" />
                            <div className="absolute inset-0 bg-black/20" />
                            <Loader2 className="w-10 h-10 text-primary animate-spin absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                    )}
                </div>

                {/* 2. Visual Feedback Layer - Non-interactive */}
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                    {/* Double Tap Heart */}
                    <AnimatePresence>
                        {showHeart && (
                            <m.div
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 1 }}
                                exit={{ scale: 2, opacity: 0 }}
                                className="z-50"
                            >
                                <Heart className="w-28 h-28 text-primary fill-primary drop-shadow-[0_0_40px_rgba(var(--primary-rgb),0.6)]" />
                            </m.div>
                        )}
                    </AnimatePresence>

                    {/* Play/Pause Indicator */}
                    <AnimatePresence>
                        {!isPlaying && (
                            <m.div
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.5 }}
                                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                                className="w-20 h-20 rounded-full bg-black/50 backdrop-blur-2xl border border-white/20 flex items-center justify-center shadow-2xl"
                            >
                                <Play className="w-9 h-9 text-white fill-white ml-1.5" />
                            </m.div>
                        )}
                    </AnimatePresence>

                    {/* Buffering Indicator */}
                    <AnimatePresence>
                        {isBuffering && isPlaying && (
                            <m.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute"
                            >
                                <div className="w-14 h-14 rounded-full border-2 border-white/20 border-t-primary animate-spin" />
                            </m.div>
                        )}
                    </AnimatePresence>

                    {/* Brief controls overlay on tap */}
                    <AnimatePresence>
                        {showControls && isPlaying && (
                            <m.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="absolute"
                            >
                                <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center">
                                    <Play className="w-7 h-7 text-white fill-white ml-1" />
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* 3. Global HUD Layer - Pointer-events: none (controls children individually) */}
                <div className="absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-5 pb-24 sm:pb-10">

                    {/* Top Row - Meta Info */}
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-2.5 pointer-events-auto">
                            <div className={cn(
                                "px-3.5 py-1.5 rounded-xl border backdrop-blur-2xl flex items-center gap-2",
                                short.trustLevel === 'authentic' ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : "bg-amber-500/20 border-amber-500/30 text-amber-400"
                            )}>
                                <ShieldCheck className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{short.trustLevel}</span>
                            </div>
                            <div className="px-3.5 py-1.5 rounded-xl border bg-primary/20 border-primary/30 text-primary backdrop-blur-2xl flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Trending</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3 pointer-events-auto">
                            <button
                                onClick={(e) => { e.stopPropagation(); toggleMute(); }}
                                className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-white backdrop-blur-xl transition-all active:scale-90"
                            >
                                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                            </button>
                            <button
                                className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-white/70 hover:text-white backdrop-blur-xl transition-all active:scale-90"
                                onClick={(e) => { e.stopPropagation(); }}
                            >
                                <MoreHorizontal className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row - Content & Actions */}
                    <div className="flex items-end justify-between gap-4">

                        {/* Information Section */}
                        <div className="flex-1 min-w-0 pointer-events-auto">
                            <div className="flex items-center gap-3 mb-4">
                                <Avatar className="w-11 h-11 border-2 border-primary/40 p-0.5 bg-black">
                                    <AvatarImage src={short.creator?.avatar} className="rounded-full object-cover" />
                                    <AvatarFallback className="bg-slate-800 text-white font-black">{short.creator?.name?.[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <h3 className="text-[15px] font-black text-white tracking-tight flex items-center gap-1.5 truncate">
                                        {short.creator?.name}
                                        <div className="w-3.5 h-3.5 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                                            <Check className="w-2 h-2 text-white" />
                                        </div>
                                    </h3>
                                    <span className="text-[10px] font-bold text-white/50 tracking-[0.1em] uppercase truncate">@{short.creator?.handle}</span>
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
                                        "h-7 px-3.5 rounded-lg text-[10px] font-black tracking-widest uppercase ml-1 flex-shrink-0 transition-all",
                                        short.creator?.isFollowing
                                            ? "bg-white/10 border border-white/10 text-white hover:bg-white/20"
                                            : "bg-primary hover:bg-primary/80 text-white shadow-lg shadow-primary/20"
                                    )}
                                >
                                    {short.creator?.isFollowing ? 'Following' : 'Follow'}
                                </Button>
                            </div>

                            <div className="bg-black/30 backdrop-blur-3xl border border-white/10 rounded-[20px] p-4.5 shadow-2xl">
                                <p className="text-white text-[13px] sm:text-sm font-medium leading-relaxed italic">
                                    "{short.caption}"
                                </p>
                                <div className="flex gap-2.5 mt-3.5 overflow-x-auto scrollbar-hide">
                                    {short.hashtags?.map((tag: string) => (
                                        <span key={tag} className="text-primary text-[10px] font-black tracking-tighter bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20">#{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Side Action Bar */}
                        <div className="flex flex-col gap-5 items-center flex-shrink-0 pointer-events-auto">
                            <ActionButton
                                icon={Heart}
                                count={formatNumber(short.likesCount)}
                                color="rose-500"
                                isActive={short.isLiked}
                                onClick={() => onLikeToggle(short._id, short.isLiked)}
                            />
                            <ActionButton
                                icon={MessageCircle}
                                count={formatNumber(short.commentsCount)}
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
                                onClick={() => { }}
                            />
                            {isOwner && (
                                <ActionButton
                                    icon={Trash2}
                                    label="DELETE"
                                    onClick={() => {
                                        if (confirm('Initiate deletion protocol?')) {
                                            deleteMutation.mutate(short._id);
                                        }
                                    }}
                                />
                            )}
                        </div>
                    </div>
                </div>

                {/* 4. Enhanced Progress Bar with Time */}
                <div className="absolute bottom-0 left-0 right-0 z-30">
                    {/* Time Display */}
                    <div className="flex justify-between px-4 pb-1.5 text-[10px] font-mono text-white/40">
                        <span>{formatTime(currentTime)}</span>
                        <span>{formatTime(duration)}</span>
                    </div>

                    {/* Interactive Progress Bar */}
                    <div
                        ref={progressRef}
                        className="h-1.5 bg-white/10 cursor-pointer group pointer-events-auto relative"
                        onClick={handleSeek}
                    >
                        {/* Buffered (placeholder) */}
                        <div
                            className="absolute inset-y-0 left-0 bg-white/20"
                            style={{ width: `${Math.min(progress + 20, 100)}%` }}
                        />
                        {/* Progress */}
                        <m.div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-purple-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)]"
                            style={{ width: `${progress}%` }}
                        />
                        {/* Thumb - visible on hover */}
                        <div
                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ left: `calc(${progress}% - 6px)` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

const ActionButton = ({ icon: Icon, color, isActive = false, onClick, label, count }: any) => {
    const getColors = () => {
        if (color === 'rose-500') {
            return isActive
                ? 'bg-rose-500/30 border-rose-500/50 text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]'
                : 'bg-black/40 border-white/10 text-white hover:bg-black/60';
        }
        if (color === 'primary') {
            return isActive
                ? 'bg-primary/30 border-primary/50 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]'
                : 'bg-black/40 border-white/10 text-white hover:bg-black/60';
        }
        if (color === 'amber-400') {
            return isActive
                ? 'bg-amber-400/30 border-amber-400/50 text-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                : 'bg-black/40 border-white/10 text-white hover:bg-black/60';
        }
        return 'bg-black/40 border-white/10 text-white hover:bg-black/60';
    };

    return (
        <div className="flex flex-col items-center gap-1.5 group">
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onClick?.();
                }}
                className={cn(
                    "w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border backdrop-blur-md transition-all duration-300",
                    "active:scale-90 touch-manipulation cursor-pointer",
                    getColors()
                )}
                style={{ pointerEvents: 'auto' }}
            >
                <Icon className={cn("w-6 h-6 sm:w-7 sm:h-7 transition-transform", isActive && "fill-current scale-110")} />
            </button>
            {count !== undefined && (
                <span className="text-[10px] sm:text-xs font-black text-white/70 tracking-widest uppercase">
                    {count}
                </span>
            )}
            {label && !count && (
                <span className="text-[8px] sm:text-[10px] font-black text-white/50 tracking-widest uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                    {label}
                </span>
            )}
        </div>
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
            <div className="h-[100dvh] w-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden px-4">
                <div className="relative">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-t-2 border-primary animate-spin" />
                    <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 sm:w-8 sm:h-8 text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]" />
                </div>
                <p className="mt-8 sm:mt-10 font-heading font-black text-slate-500 uppercase tracking-[0.3em] sm:tracking-[0.5em] text-[8px] sm:text-[10px] animate-pulse text-center">Initializing Virtual Network...</p>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center bg-black overflow-hidden overscroll-none">
            {/* Main Scrolling Feed */}
            <div
                ref={containerRef}
                onScroll={handleScroll}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory relative z-10 no-scrollbar"
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

            {/* Navigation Overlay - Desktop Only */}
            <div className="hidden md:flex absolute top-1/2 right-8 -translate-y-1/2 z-50 flex-col gap-6 pointer-events-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => scrollToIndex(currentIndex - 1)}
                    disabled={currentIndex === 0}
                    className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 text-white hover:bg-black/60 shadow-2xl backdrop-blur-md disabled:opacity-20 flex-shrink-0"
                >
                    <ChevronUp className="w-6 h-6" />
                </Button>

                <div className="flex flex-col items-center gap-2">
                    <div className="h-24 w-1 rounded-full bg-white/5 overflow-hidden relative">
                        <m.div
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
                    className="w-12 h-12 rounded-2xl bg-black/40 border border-white/10 text-white hover:bg-black/60 shadow-2xl backdrop-blur-md disabled:opacity-20 flex-shrink-0"
                >
                    <ChevronDown className="w-6 h-6" />
                </Button>
            </div>

            {/* Create Button Overlay - Adjusted for 100dvh */}
            <div className="absolute bottom-24 sm:bottom-10 left-6 sm:left-10 z-50">
                <m.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setIsCreateOpen(true)}
                    className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary via-purple-500 to-rose-400 p-0.5 shadow-2xl shadow-primary/40 group"
                >
                    <div className="w-full h-full bg-slate-950/80 backdrop-blur-xl rounded-[0.9rem] flex items-center justify-center transition-all group-hover:bg-transparent">
                        <Plus className="w-5 h-5 text-white" />
                    </div>
                </m.button>
            </div>

            {/* Comments Panel - Hybrid Responsive */}
            <AnimatePresence>
                {isCommentOpen && (
                    <>
                        {/* Backdrop for mobile */}
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsCommentOpen(false)}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] md:hidden"
                        />

                        <m.div
                            initial={window.innerWidth < 768 ? { y: '100%' } : { x: '100%' }}
                            animate={window.innerWidth < 768 ? { y: 0 } : { x: 0 }}
                            exit={window.innerWidth < 768 ? { y: '100%' } : { x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className={cn(
                                "fixed z-[100] bg-[#0c0c0e]/95 backdrop-blur-3xl shadow-[0_-20px_80px_rgba(0,0,0,0.5)] flex flex-col",
                                "bottom-0 left-0 right-0 h-[75vh] rounded-t-[2.5rem] border-t border-white/10", // Mobile
                                "md:top-0 md:right-0 md:bottom-0 md:left-auto md:w-[450px] md:h-full md:rounded-l-[3rem] md:border-l md:border-t-0" // Desktop
                            )}
                        >
                            {/* Drag Indicator for Mobile */}
                            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mt-4 mb-2 md:hidden" />

                            <div className="flex items-center justify-between p-6 sm:p-8 pb-4 flex-shrink-0">
                                <h3 className="text-xl sm:text-2xl font-black text-white italic uppercase tracking-tighter flex items-center gap-3">
                                    <MessageCircle className="w-6 h-6 text-primary" />
                                    Comments
                                    <span className="text-xs not-italic font-bold text-white/30 ml-2">{comments.length}</span>
                                </h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setIsCommentOpen(false)}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 text-white/40 hover:text-white transition-all"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Comments Scroll Area */}
                            <div className="flex-1 overflow-y-auto px-6 sm:px-8 space-y-6 no-scrollbar overscroll-contain pb-32 md:pb-8">
                                {loadingComments ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Syncing Data...</p>
                                    </div>
                                ) : comments.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-20 opacity-20 text-center">
                                        <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
                                            <Zap className="w-8 h-8" />
                                        </div>
                                        <p className="text-sm font-black uppercase tracking-widest">Digital Silence</p>
                                        <p className="text-[10px] font-bold mt-2">BE THE FIRST TO BROADCAST A VIBE</p>
                                    </div>
                                ) : (
                                    comments.map((comment: any) => (
                                        <div key={comment._id} className="flex gap-4 group">
                                            <Avatar className="w-10 h-10 sm:w-12 sm:h-12 border border-white/10 flex-shrink-0 bg-black">
                                                <AvatarImage src={comment.author?.avatar} className="rounded-xl" />
                                                <AvatarFallback className="bg-slate-800 text-white font-black text-xs uppercase">{comment.author?.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <span className="text-sm font-black text-white uppercase tracking-tight">{comment.author?.name}</span>
                                                    <span className="text-[9px] font-bold text-white/20 uppercase">2h ago</span>
                                                </div>
                                                <div className="bg-white/[0.03] border border-white/[0.05] rounded-2xl rounded-tl-sm p-4 relative">
                                                    <p className="text-white/80 text-sm leading-relaxed">{comment.content}</p>
                                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button className="text-white/20 hover:text-rose-500">
                                                            <Heart className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-5 mt-2.5 px-1">
                                                    <button className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-primary uppercase tracking-widest transition-colors">
                                                        <MessageSquare className="w-3 h-3" /> Reply
                                                    </button>
                                                    <button className="flex items-center gap-1.5 text-[10px] font-black text-white/30 hover:text-rose-500 uppercase tracking-widest transition-colors">
                                                        <Heart className="w-3 h-3" /> {comment.likesCount || 0}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Input Area - Fixed at Bottom of Panel */}
                            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e] to-transparent pt-12 safe-area-inset-bottom">
                                <div className="flex gap-3 bg-white/5 border border-white/10 rounded-[1.5rem] p-2 pl-5 items-center focus-within:border-primary/50 focus-within:bg-white/[0.08] transition-all shadow-2xl">
                                    <input
                                        value={commentText}
                                        onChange={(e) => setCommentText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                        placeholder="Add to the conversation..."
                                        className="bg-transparent border-none text-white text-sm focus:outline-none flex-1 placeholder:text-white/20 py-2 sm:py-3"
                                    />
                                    <Button
                                        size="icon"
                                        onClick={handlePostComment}
                                        disabled={!commentText.trim() || createCommentMutation.isPending}
                                        className="bg-primary hover:bg-primary/80 text-white rounded-xl w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 shadow-lg shadow-primary/20"
                                    >
                                        {createCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        </m.div>
                    </>
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
