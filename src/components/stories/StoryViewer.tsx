import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Pause, Play, Volume2, VolumeX, Heart, Send, Eye, BarChart2, Trash2, MessageCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useStoryReact, useStoryViewers, useDeleteStory, useStoryLike, useStoryComment } from '@/api/hooks';
import { toast } from 'sonner';

interface Story {
    _id: string;
    userId: string;
    mediaUrl: string;
    mediaType: 'image' | 'video';
    caption?: string;
    createdAt: string;
    viewers: any[];
    likes: string[];
    comments: any[];
    reactions: any[];
    user?: {
        name: string;
        handle?: string;
        avatar?: string;
        _id?: string;
    };
}

interface StoryViewerProps {
    stories: Story[];
    initialIndex?: number;
    onClose: () => void;
    onStoryViewed?: (storyId: string) => void;
}

const STORY_DURATION = 5000; // 5 seconds per story

export function StoryViewer({ stories, initialIndex = 0, onClose, onStoryViewed }: StoryViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [replyText, setReplyText] = useState("");
    const [showViewers, setShowViewers] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [isLiking, setIsLiking] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const progressInterval = useRef<any>(null);

    const { profile } = useAuth();
    const reactMutation = useStoryReact();
    const likeMutation = useStoryLike();
    const commentMutation = useStoryComment();

    const currentStory = stories[currentIndex];
    const isLiked = currentStory.likes?.includes(profile?.userId || profile?.supabaseId || '');
    const isOwner = currentStory.userId === profile?.userId ||
        currentStory.userId === profile?.supabaseId ||
        currentStory.user?._id === profile?._id;

    const { data: viewersData } = useStoryViewers(isOwner ? currentStory._id : undefined);

    // Handle story progress
    useEffect(() => {
        if (isPaused) return;

        const startTime = Date.now();
        const duration = currentStory.mediaType === 'video' && videoRef.current
            ? videoRef.current.duration * 1000
            : STORY_DURATION;

        progressInterval.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const newProgress = Math.min((elapsed / duration) * 100, 100);
            setProgress(newProgress);

            if (newProgress >= 100) {
                goToNext();
            }
        }, 50);

        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, [currentIndex, isPaused, currentStory.mediaType]);

    const viewedRef = useRef<Set<string>>(new Set());

    // Track story view
    useEffect(() => {
        if (onStoryViewed && currentStory?._id && !viewedRef.current.has(currentStory._id)) {
            viewedRef.current.add(currentStory._id);
            onStoryViewed(currentStory._id);
        }
    }, [currentStory?._id, onStoryViewed]);

    const goToNext = useCallback(() => {
        if (currentIndex < stories.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setProgress(0);
        } else {
            onClose();
        }
    }, [currentIndex, stories.length, onClose]);

    const goToPrevious = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            setProgress(0);
        }
    }, [currentIndex]);

    const togglePause = useCallback(() => {
        setIsPaused(prev => !prev);
        if (videoRef.current) {
            isPaused ? videoRef.current.play() : videoRef.current.pause();
        }
    }, [isPaused]);

    const toggleMute = useCallback(() => {
        setIsMuted(prev => !prev);
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
        }
    }, [isMuted]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            switch (e.key) {
                case 'ArrowLeft':
                    goToPrevious();
                    break;
                case 'ArrowRight':
                    goToNext();
                    break;
                case ' ':
                    e.preventDefault();
                    togglePause();
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [goToNext, goToPrevious, togglePause, onClose]);

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    const handleReact = async (emoji: string) => {
        try {
            await reactMutation.mutateAsync({ id: currentStory._id, emoji });
            toast.success(`Reacted with ${emoji}`);
            // Briefly pause or just let it continue
        } catch (error) {
            toast.error("Failed to react");
        }
    };

    const handleLike = async () => {
        if (isLiking) return;
        setIsLiking(true);
        try {
            await likeMutation.mutateAsync(currentStory._id);
        } catch (error) {
            toast.error("Failed to like story");
        } finally {
            setIsLiking(false);
        }
    };

    const handleSendComment = async () => {
        if (!replyText.trim()) return;
        try {
            await commentMutation.mutateAsync({ id: currentStory._id, content: replyText });
            toast.success("Comment sent!");
            setReplyText("");
            setIsPaused(false);
        } catch (error) {
            toast.error("Failed to send comment");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to delete this story?")) return;

        try {
            await deleteMutation.mutateAsync(currentStory._id);
            toast.success("Story deleted");
            goToNext(); // This will close if it was the last story
        } catch (error) {
            toast.error("Failed to delete story");
        }
    };

    const deleteMutation = useDeleteStory();

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center"
                onClick={onClose}
            >
                {/* Desktop background story blur */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-40">
                    <img
                        src={currentStory.mediaUrl}
                        className="w-full h-full object-cover blur-[100px] scale-150"
                        alt=""
                    />
                </div>

                {/* Story Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="relative w-full h-full sm:max-w-[430px] sm:max-h-[92vh] mx-auto bg-black shadow-2xl shadow-primary/20 sm:rounded-[40px] overflow-hidden z-10"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Progress Bars */}
                    <div className="absolute top-4 left-4 right-4 z-20 flex gap-1.5 px-2">
                        {stories.map((_, index) => (
                            <div
                                key={index}
                                className="h-[2px] flex-1 bg-white/20 rounded-full overflow-hidden"
                            >
                                <div
                                    className={cn(
                                        "h-full bg-white rounded-full transition-all duration-100 ease-linear",
                                        index < currentIndex ? "w-full" : index === currentIndex ? "" : "w-0"
                                    )}
                                    style={{
                                        width: index === currentIndex ? `${progress}%` : index < currentIndex ? '100%' : '0%'
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Header */}
                    <div className="absolute top-8 left-0 right-0 z-20 flex items-center justify-between px-6">
                        <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border-2 border-primary/50 p-0.5">
                                <div className="w-full h-full rounded-full border border-white/20 overflow-hidden">
                                    <AvatarImage src={currentStory.user?.avatar} className="object-cover" />
                                </div>
                                <AvatarFallback className="bg-slate-800 text-white text-xs">
                                    {currentStory.user?.name?.[0] || '?'}
                                </AvatarFallback>
                            </Avatar>
                            <div className="drop-shadow-lg">
                                <p className="font-heading font-black text-white text-[14px] leading-tight flex items-center gap-1.5">
                                    {currentStory.user?.name || 'User'}
                                    {isOwner && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full font-bold">YOU</span>}
                                </p>
                                <p className="text-[11px] font-bold text-white/60 uppercase tracking-widest">{formatTime(currentStory.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={togglePause}
                                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                            >
                                {isPaused ? <Play className="w-4 h-4 fill-white" /> : <Pause className="w-4 h-4 fill-white" />}
                            </button>
                            {currentStory.mediaType === 'video' && (
                                <button
                                    onClick={toggleMute}
                                    className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                                >
                                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                </button>
                            )}
                            {isOwner && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                                    className="w-9 h-9 rounded-full bg-red-500/20 backdrop-blur-md flex items-center justify-center text-red-500 hover:bg-red-500/40 transition-all border border-red-500/20"
                                    title="Delete Story"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/20 transition-all border border-white/10"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Story Content */}
                    <div
                        className="w-full h-full bg-[#0a0a0a] flex items-center justify-center relative shadow-inner"
                        onPointerDown={() => setIsPaused(true)}
                        onPointerUp={() => setIsPaused(false)}
                    >
                        {currentStory.mediaType === 'video' ? (
                            <video
                                ref={videoRef}
                                src={currentStory.mediaUrl}
                                className="w-full h-full object-cover"
                                autoPlay
                                muted={isMuted}
                                playsInline
                                onEnded={goToNext}
                            />
                        ) : (
                            <img
                                src={currentStory.mediaUrl}
                                alt="Story"
                                className="w-full h-full object-cover"
                            />
                        )}

                        {/* Caption Overlay */}
                        {currentStory.caption && (
                            <div className="absolute bottom-32 left-0 right-0 px-6 z-20 pointer-events-none">
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-[24px] p-5 shadow-2xl"
                                >
                                    <p className="text-white text-[15px] font-medium leading-relaxed drop-shadow-md">
                                        {currentStory.caption}
                                    </p>
                                </motion.div>
                            </div>
                        )}
                    </div>

                    {/* Bottom Interactivity */}
                    <div className="absolute bottom-20 sm:bottom-8 left-0 right-0 z-30 px-4 sm:px-6 space-y-4 sm:space-y-6 pb-[env(safe-area-inset-bottom,0px)]">
                        {!isOwner ? (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/10 rounded-full px-3 sm:px-5 py-2.5 sm:py-3 shadow-2xl flex-1 focus-within:bg-white/20 transition-all">
                                    <input
                                        type="text"
                                        placeholder="Vibe back..."
                                        value={replyText}
                                        onChange={(e) => setReplyText(e.target.value)}
                                        onFocus={() => setIsPaused(true)}
                                        onBlur={() => setIsPaused(false)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                                        className="bg-transparent border-none text-white text-sm sm:text-[14px] font-medium focus:outline-none flex-1 placeholder:text-white/30 min-w-0"
                                    />
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleSendComment}
                                            className={cn(
                                                "transition-all p-1",
                                                replyText.trim() ? "text-primary scale-110" : "text-white/40"
                                            )}
                                        >
                                            <Send className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={handleLike}
                                        className={cn(
                                            "w-11 h-11 sm:w-12 sm:h-12 rounded-full border flex items-center justify-center transition-all shadow-xl backdrop-blur-md",
                                            isLiked
                                                ? "bg-primary border-primary text-white shadow-primary/40 scale-110"
                                                : "bg-white/10 border-white/10 text-white hover:bg-white/20"
                                        )}
                                    >
                                        <Heart className={cn("w-5 h-5 sm:w-6 sm:h-6", isLiked && "fill-white")} />
                                    </button>
                                    <button
                                        onClick={() => { setIsPaused(true); setShowComments(true); }}
                                        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-xl"
                                    >
                                        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div
                                className="flex items-center justify-between bg-black/40 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-5 shadow-2xl cursor-pointer hover:bg-black/60 transition-all group"
                                onClick={() => setShowViewers(true)}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {(viewersData as any)?.data?.viewers?.slice(0, 3)?.map((v: any, i: number) => (
                                            <Avatar key={i} className="w-8 h-8 border-2 border-black ring-1 ring-white/10">
                                                <AvatarImage src={v.avatar} />
                                                <AvatarFallback className="text-[10px] bg-slate-800">{v.name?.[0]}</AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[14px] font-black text-white uppercase tracking-[0.1em]">
                                            {(viewersData as any)?.data?.viewCount || 0} CHANNEL VIEWS
                                        </span>
                                        <div className="flex items-center gap-3 mt-0.5">
                                            <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                                                <Heart className="w-3 h-3 fill-current" /> {(viewersData as any)?.data?.likeCount || 0}
                                            </span>
                                            <span className="text-[10px] font-bold text-secondary flex items-center gap-1">
                                                <MessageCircle className="w-3 h-3 fill-current" /> {(viewersData as any)?.data?.commentCount || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <BarChart2 className="w-5 h-5 text-primary" />
                                </div>
                            </div>
                        )}

                        {/* Quick Reactions (only for viewers) */}
                        {!isOwner && !replyText && (
                            <div className="flex justify-between items-center px-1 sm:px-2">
                                {['❤️', '😂', '😮', '😢', '🔥', '👏'].map(emoji => (
                                    <button
                                        key={emoji}
                                        onClick={() => handleReact(emoji)}
                                        className="text-lg sm:text-[22px] hover:scale-150 transition-transform active:scale-95 drop-shadow-lg p-1"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Navigation Areas (Invisible) */}
                    <div className="absolute inset-0 z-10 flex">
                        <div
                            className="w-1/3 h-2/3 mt-20 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        />
                        <div
                            className="w-2/3 h-2/3 mt-20 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        />
                    </div>

                    {/* Desktop Hover Arrows */}
                    <button
                        onClick={(e) => { e.stopPropagation(); goToPrevious(); }}
                        className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 items-center justify-center text-white opacity-0 hover:opacity-100 transition-all z-30 hidden md:flex",
                            currentIndex === 0 && "hidden"
                        )}
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); goToNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md border border-white/10 items-center justify-center text-white opacity-0 hover:opacity-100 transition-all z-30 hidden md:flex"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>

                    {/* Comments Sheet */}
                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute inset-x-0 bottom-0 z-[40] bg-[#0c0c0e]/95 backdrop-blur-2xl rounded-t-[40px] border-t border-white/10 p-8 flex flex-col max-h-[70%]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6 flex-shrink-0" />
                                <div className="flex items-center justify-between mb-8 flex-shrink-0">
                                    <h4 className="font-heading font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
                                        <MessageCircle className="w-6 h-6 text-secondary" />
                                        Story Comments
                                    </h4>
                                    <span className="bg-secondary/20 text-secondary px-3 py-1 rounded-full text-xs font-black">
                                        {(viewersData as any)?.data?.commentCount || 0} FEEDBACK
                                    </span>
                                </div>

                                <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6 scrollbar-hide">
                                    {((viewersData as any)?.data?.comments || []).length > 0 ? (
                                        ((viewersData as any)?.data?.comments || []).map((comment: any) => (
                                            <div key={comment._id} className="flex gap-4 group">
                                                <Avatar className="w-10 h-10 border border-white/10 flex-shrink-0">
                                                    <AvatarImage src={comment.user?.avatar} />
                                                    <AvatarFallback>{comment.user?.name?.[0]}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-white/80 font-bold text-xs uppercase tracking-wider">{comment.user?.name}</span>
                                                        <span className="text-white/20 text-[8px] font-black">{formatTime(comment.createdAt)}</span>
                                                    </div>
                                                    <div className="bg-white/5 rounded-2xl rounded-tl-none p-4 border border-white/5 group-hover:bg-white/10 transition-colors">
                                                        <p className="text-white/90 text-[13px] leading-relaxed italic">{comment.content}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-white/5 rounded-3xl mx-auto flex items-center justify-center border border-white/10">
                                                <MessageCircle className="w-6 h-6 text-white/20" />
                                            </div>
                                            <p className="text-white/30 font-bold text-sm uppercase tracking-widest italic">Silent treatment?</p>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-auto space-y-4 flex-shrink-0">
                                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-2">
                                        <input
                                            type="text"
                                            placeholder="Write a comment..."
                                            value={replyText}
                                            onChange={(e) => setReplyText(e.target.value)}
                                            className="bg-transparent border-none text-white text-[13px] focus:outline-none flex-1 placeholder:text-white/20"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={handleSendComment}
                                            className="bg-primary hover:bg-primary/80 text-white rounded-xl h-9 px-4 font-black text-[10px] uppercase"
                                        >
                                            POST
                                        </Button>
                                    </div>
                                    <Button
                                        onClick={() => { setShowComments(false); setIsPaused(false); }}
                                        variant="ghost"
                                        className="w-full text-white/40 hover:text-white uppercase font-black text-[10px] tracking-widest"
                                    >
                                        Dismiss
                                    </Button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Viewers Sheet (Insights) */}
                    <AnimatePresence>
                        {showViewers && (
                            <motion.div
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                className="absolute inset-x-0 bottom-0 z-[40] bg-[#0c0c0e]/95 backdrop-blur-2xl rounded-t-[40px] border-t border-white/10 p-8 max-h-[70%]"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-6" />
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-heading font-black text-xl text-white uppercase tracking-tight flex items-center gap-2">
                                        <Eye className="w-6 h-6 text-primary" />
                                        Story Insights
                                    </h4>
                                    <div className="flex gap-2">
                                        <span className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs font-black">
                                            {(viewersData as any)?.data?.viewCount || 0} VIEWS
                                        </span>
                                        <span className="bg-rose-500/20 text-rose-500 px-3 py-1 rounded-full text-xs font-black">
                                            {(viewersData as any)?.data?.likeCount || 0} LIKES
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-4 overflow-y-auto max-h-[40vh] pr-2 scrollbar-hide">
                                    {((viewersData as any)?.data?.viewers || []).length > 0 ? (
                                        ((viewersData as any)?.data?.viewers || []).map((viewer: any) => (
                                            <div key={viewer._id} className="flex items-center justify-between group bg-white/[0.02] p-3 rounded-2xl border border-white/5 hover:bg-white/[0.05] transition-all">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="w-11 h-11 border border-white/10">
                                                        <AvatarImage src={viewer.avatar} />
                                                        <AvatarFallback>{viewer.name?.[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="text-white font-bold text-sm tracking-tight">{viewer.name}</p>
                                                        <p className="text-white/40 text-[10px] uppercase font-bold flex items-center gap-1">
                                                            <span className="w-1 h-1 bg-green-500 rounded-full" /> Synchronized
                                                        </p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="ghost" className="text-primary hover:text-white hover:bg-primary font-black text-[10px] px-4 rounded-xl uppercase tracking-widest border border-primary/20">
                                                    Protocol
                                                </Button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-20 text-center space-y-4">
                                            <div className="w-16 h-16 bg-white/5 rounded-3xl mx-auto flex items-center justify-center border border-white/10">
                                                <Eye className="w-6 h-6 text-white/20" />
                                            </div>
                                            <p className="text-white/30 font-bold text-sm uppercase tracking-widest italic">Broadcasting to void...</p>
                                        </div>
                                    )}
                                </div>
                                <Button
                                    onClick={() => setShowViewers(false)}
                                    className="w-full mt-8 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-black uppercase tracking-widest rounded-2xl py-6 h-14"
                                >
                                    Dismiss
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </motion.div>
        </AnimatePresence >
    );
}

export default StoryViewer;
