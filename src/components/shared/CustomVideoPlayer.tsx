import { useState, useRef, useEffect, useCallback } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    Minimize,
    SkipBack,
    SkipForward
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomVideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    maxHeight?: string;
    onClickExpand?: () => void;
}

export function CustomVideoPlayer({
    src,
    poster,
    className,
    maxHeight = "350px",
    onClickExpand
}: CustomVideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [showControls, setShowControls] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [buffered, setBuffered] = useState(0);

    const hideControlsTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Format time as MM:SS
    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Toggle play/pause
    const togglePlay = useCallback(() => {
        if (!videoRef.current) return;

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        if (!videoRef.current) return;
        videoRef.current.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // Seek video
    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!videoRef.current || !progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const newTime = percent * duration;

        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    }, [duration]);

    // Skip forward/backward
    const skip = useCallback((seconds: number) => {
        if (!videoRef.current) return;
        videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
    }, [currentTime, duration]);

    // Toggle fullscreen
    const toggleFullscreen = useCallback(() => {
        if (!containerRef.current) return;

        if (!isFullscreen) {
            if (containerRef.current.requestFullscreen) {
                containerRef.current.requestFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }, [isFullscreen]);

    // Handle video events
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => setCurrentTime(video.currentTime);
        const handleLoadedMetadata = () => setDuration(video.duration);
        const handleEnded = () => setIsPlaying(false);
        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);
        const handleProgress = () => {
            if (video.buffered.length > 0) {
                setBuffered(video.buffered.end(video.buffered.length - 1));
            }
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('ended', handleEnded);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('progress', handleProgress);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('ended', handleEnded);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('progress', handleProgress);
        };
    }, []);

    // Handle fullscreen change
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Auto-hide controls
    useEffect(() => {
        if (isPlaying && !isHovering) {
            hideControlsTimeout.current = setTimeout(() => {
                setShowControls(false);
            }, 2500);
        } else {
            setShowControls(true);
        }

        return () => {
            if (hideControlsTimeout.current) {
                clearTimeout(hideControlsTimeout.current);
            }
        };
    }, [isPlaying, isHovering]);

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
    const bufferedProgress = duration > 0 ? (buffered / duration) * 100 : 0;

    return (
        <div
            ref={containerRef}
            className={cn(
                "relative rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl group",
                className
            )}
            style={{ maxHeight }}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
            onClick={(e) => {
                // Only toggle play if clicking on video area, not controls
                if ((e.target as HTMLElement).tagName === 'VIDEO') {
                    togglePlay();
                }
            }}
        >
            {/* Video Element */}
            <video
                ref={videoRef}
                src={src}
                poster={poster}
                className="w-full h-full object-contain"
                style={{ maxHeight }}
                playsInline
                preload="metadata"
            />

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            {/* Center Play Button (when paused) */}
            <AnimatePresence>
                {!isPlaying && (
                    <m.button
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        onClick={togglePlay}
                        className="absolute inset-0 flex items-center justify-center"
                    >
                        <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl hover:bg-white/30 transition-all">
                            <Play className="w-7 h-7 text-white ml-1" fill="white" />
                        </div>
                    </m.button>
                )}
            </AnimatePresence>

            {/* Controls Overlay */}
            <AnimatePresence>
                {showControls && (
                    <m.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-0 left-0 right-0 p-3 sm:p-4"
                    >
                        {/* Progress Bar */}
                        <div
                            ref={progressRef}
                            className="relative h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 group/progress"
                            onClick={handleSeek}
                        >
                            {/* Buffered */}
                            <div
                                className="absolute inset-y-0 left-0 bg-white/30 rounded-full"
                                style={{ width: `${bufferedProgress}%` }}
                            />
                            {/* Progress */}
                            <div
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500 to-indigo-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                            />
                            {/* Thumb */}
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress}% - 6px)` }}
                            />
                        </div>

                        {/* Controls Row */}
                        <div className="flex items-center justify-between gap-2">
                            {/* Left Controls */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                                >
                                    {isPlaying ? (
                                        <Pause className="w-4 h-4 text-white" />
                                    ) : (
                                        <Play className="w-4 h-4 text-white ml-0.5" />
                                    )}
                                </button>

                                {/* Skip Back */}
                                <button
                                    onClick={() => skip(-10)}
                                    className="hidden sm:flex w-8 h-8 rounded-full bg-white/5 border border-white/10 items-center justify-center hover:bg-white/10 transition-all"
                                >
                                    <SkipBack className="w-3.5 h-3.5 text-white/70" />
                                </button>

                                {/* Skip Forward */}
                                <button
                                    onClick={() => skip(10)}
                                    className="hidden sm:flex w-8 h-8 rounded-full bg-white/5 border border-white/10 items-center justify-center hover:bg-white/10 transition-all"
                                >
                                    <SkipForward className="w-3.5 h-3.5 text-white/70" />
                                </button>

                                {/* Volume */}
                                <button
                                    onClick={toggleMute}
                                    className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all"
                                >
                                    {isMuted ? (
                                        <VolumeX className="w-4 h-4 text-white/70" />
                                    ) : (
                                        <Volume2 className="w-4 h-4 text-white/70" />
                                    )}
                                </button>

                                {/* Time */}
                                <div className="text-[10px] sm:text-xs font-mono text-white/60 ml-1">
                                    <span className="text-white">{formatTime(currentTime)}</span>
                                    <span className="mx-1">/</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Right Controls */}
                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Expand/Zoom Button */}
                                {onClickExpand && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onClickExpand();
                                        }}
                                        className="px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/20 text-[9px] font-bold text-white/80 uppercase tracking-wider hover:bg-white/20 transition-all"
                                    >
                                        Zoom
                                    </button>
                                )}

                                {/* Fullscreen */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/20 transition-all"
                                >
                                    {isFullscreen ? (
                                        <Minimize className="w-4 h-4 text-white" />
                                    ) : (
                                        <Maximize className="w-4 h-4 text-white" />
                                    )}
                                </button>
                            </div>
                        </div>
                    </m.div>
                )}
            </AnimatePresence>

            {/* Top Right Badge */}
            <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[9px] font-bold text-white/70 uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                HD Video
            </div>
        </div>
    );
}
