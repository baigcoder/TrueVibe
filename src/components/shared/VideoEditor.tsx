import { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    X, Check, RotateCcw, Play, Pause,
    Volume2, VolumeX, Maximize2, Square, RectangleHorizontal,
    Loader2, Scissors, Crop
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoEditorProps {
    videoUrl: string;
    onApply: (settings: VideoEditSettings) => void;
    onCancel: () => void;
}

export interface VideoEditSettings {
    isMuted: boolean;
    startTime: number;
    endTime: number;
    aspectRatio: string;
    cropArea?: { x: number; y: number; width: number; height: number };
}

// Aspect ratio presets
const ASPECT_RATIOS = [
    { id: 'free', label: 'Original', value: undefined, icon: Maximize2 },
    { id: '1:1', label: '1:1', value: 1, icon: Square },
    { id: '4:5', label: '4:5', value: 4 / 5, icon: RectangleHorizontal },
    { id: '16:9', label: '16:9', value: 16 / 9, icon: RectangleHorizontal },
    { id: '9:16', label: '9:16', value: 9 / 16, icon: RectangleHorizontal },
];

export function VideoEditor({ videoUrl, onApply, onCancel }: VideoEditorProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    // Playback state
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    // Edit state
    const [startTime, setStartTime] = useState(0);
    const [endTime, setEndTime] = useState(0);
    const [selectedAspect, setSelectedAspect] = useState(ASPECT_RATIOS[0]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'trim' | 'crop'>('trim');

    // Dragging state for timeline
    const [isDragging, setIsDragging] = useState<'start' | 'end' | 'playhead' | null>(null);

    // Initialize video duration
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
            setEndTime(Math.min(video.duration, 60)); // Max 60 seconds
        };

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);

            // Loop within trim range
            if (video.currentTime >= endTime) {
                video.currentTime = startTime;
            }
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [endTime, startTime]);

    // Toggle play/pause
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
        } else {
            if (video.currentTime < startTime || video.currentTime >= endTime) {
                video.currentTime = startTime;
            }
            video.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, startTime, endTime]);

    // Toggle mute
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        video.muted = !isMuted;
        setIsMuted(!isMuted);
    }, [isMuted]);

    // Format time as MM:SS
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle timeline drag
    const handleTimelineMouseDown = useCallback((e: React.MouseEvent, type: 'start' | 'end' | 'playhead') => {
        e.preventDefault();
        setIsDragging(type);
    }, []);

    const handleTimelineMouseMove = useCallback((e: MouseEvent) => {
        if (!isDragging || !timelineRef.current || !duration) return;

        const rect = timelineRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
        const time = (x / rect.width) * duration;

        if (isDragging === 'start') {
            setStartTime(Math.max(0, Math.min(time, endTime - 1)));
        } else if (isDragging === 'end') {
            const maxEnd = Math.min(duration, startTime + 60); // Max 60 seconds
            setEndTime(Math.max(startTime + 1, Math.min(time, maxEnd)));
        } else if (isDragging === 'playhead') {
            if (videoRef.current) {
                videoRef.current.currentTime = Math.max(startTime, Math.min(time, endTime));
            }
        }
    }, [isDragging, duration, startTime, endTime]);

    const handleTimelineMouseUp = useCallback(() => {
        setIsDragging(null);
    }, []);

    // Add global mouse event listeners for dragging
    useEffect(() => {
        if (isDragging) {
            window.addEventListener('mousemove', handleTimelineMouseMove);
            window.addEventListener('mouseup', handleTimelineMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleTimelineMouseMove);
                window.removeEventListener('mouseup', handleTimelineMouseUp);
            };
        }
    }, [isDragging, handleTimelineMouseMove, handleTimelineMouseUp]);

    // Handle apply
    const handleApply = async () => {
        setIsProcessing(true);

        try {
            const settings: VideoEditSettings = {
                isMuted,
                startTime,
                endTime,
                aspectRatio: selectedAspect.id,
            };

            onApply(settings);
        } catch (error) {
            console.error('Failed to apply video edits:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Handle reset
    const handleReset = () => {
        setStartTime(0);
        setEndTime(Math.min(duration, 60));
        setIsMuted(false);
        setSelectedAspect(ASPECT_RATIOS[0]);
        if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.currentTime = 0;
        }
    };

    // Calculate trim duration
    const trimDuration = endTime - startTime;

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-2 sm:py-3 border-b border-white/10 bg-white/[0.02]">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8 sm:w-9 sm:h-9"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic">
                        Edit Video
                    </h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleReset}
                        className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8 sm:w-9 sm:h-9"
                    >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>

                {/* Tab Selector */}
                <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 sm:py-3 border-b border-white/5 bg-black/20">
                    <button
                        onClick={() => setActiveTab('trim')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'trim'
                                ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <Scissors className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Trim
                    </button>
                    <button
                        onClick={() => setActiveTab('crop')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[9px] sm:text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                            activeTab === 'crop'
                                ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                        )}
                    >
                        <Crop className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        Crop
                    </button>
                </div>

                {/* Video Preview - Constrained Height */}
                <div className="flex-1 min-h-0 relative bg-black flex items-center justify-center overflow-hidden p-2">
                    <div
                        className={cn(
                            "relative max-h-full",
                            selectedAspect.id === '1:1' && "aspect-square",
                            selectedAspect.id === '4:5' && "aspect-[4/5]",
                            selectedAspect.id === '16:9' && "aspect-video",
                            selectedAspect.id === '9:16' && "aspect-[9/16]",
                            selectedAspect.id === 'free' && "max-w-full"
                        )}
                        style={{ maxHeight: 'calc(100% - 1rem)' }}
                    >
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="w-full h-full object-contain bg-black max-h-[40vh] sm:max-h-[50vh]"
                            playsInline
                            loop
                            onClick={togglePlay}
                        />

                        {/* Play/Pause Overlay */}
                        <div
                            className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                            onClick={togglePlay}
                        >
                            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-white/20 backdrop-blur-xl flex items-center justify-center">
                                {isPlaying ? (
                                    <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                ) : (
                                    <Play className="w-6 h-6 sm:w-8 sm:h-8 text-white ml-1" />
                                )}
                            </div>
                        </div>

                        {/* Aspect Ratio Crop Overlay */}
                        {selectedAspect.id !== 'free' && (
                            <div className="absolute inset-0 pointer-events-none border-2 border-primary/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]" />
                        )}
                    </div>

                    {/* Mute Button */}
                    <button
                        onClick={toggleMute}
                        className={cn(
                            "absolute bottom-2 right-2 sm:bottom-4 sm:right-4 w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all",
                            isMuted
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                                : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                        )}
                    >
                        {isMuted ? (
                            <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />
                        ) : (
                            <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
                        )}
                    </button>
                </div>

                {/* Crop Tab - Aspect Ratio Selection */}
                {activeTab === 'crop' && (
                    <div className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-3 sm:py-4 bg-black/40 border-t border-white/5 overflow-x-auto">
                        {ASPECT_RATIOS.map((aspect) => (
                            <button
                                key={aspect.id}
                                onClick={() => setSelectedAspect(aspect)}
                                className={cn(
                                    "px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2",
                                    selectedAspect.id === aspect.id
                                        ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                        : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                                )}
                            >
                                <aspect.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                {aspect.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Trim Tab - Timeline */}
                {activeTab === 'trim' && (
                    <div className="flex-shrink-0 px-4 py-3 sm:py-4 bg-black/40 border-t border-white/5">
                        {/* Time Display */}
                        <div className="flex items-center justify-between mb-3 text-[10px] sm:text-xs font-mono">
                            <span className="text-emerald-400">{formatTime(startTime)}</span>
                            <span className="text-white/60">
                                Duration: <span className="text-white font-bold">{formatTime(trimDuration)}</span>
                                {trimDuration >= 60 && <span className="text-amber-400 ml-2">(max 60s)</span>}
                            </span>
                            <span className="text-rose-400">{formatTime(endTime)}</span>
                        </div>

                        {/* Timeline */}
                        <div
                            ref={timelineRef}
                            className="relative h-12 sm:h-14 bg-white/5 rounded-2xl overflow-hidden cursor-pointer"
                        >
                            {/* Video Waveform/Thumbnail Placeholder */}
                            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-purple-500/20 to-rose-500/20" />

                            {/* Trimmed Region Highlight */}
                            <div
                                className="absolute top-0 bottom-0 bg-primary/30 border-x-2 border-primary"
                                style={{
                                    left: `${(startTime / duration) * 100}%`,
                                    width: `${((endTime - startTime) / duration) * 100}%`,
                                }}
                            />

                            {/* Dimmed Regions */}
                            <div
                                className="absolute top-0 bottom-0 left-0 bg-black/60"
                                style={{ width: `${(startTime / duration) * 100}%` }}
                            />
                            <div
                                className="absolute top-0 bottom-0 right-0 bg-black/60"
                                style={{ width: `${((duration - endTime) / duration) * 100}%` }}
                            />

                            {/* Start Handle */}
                            <div
                                className="absolute top-0 bottom-0 w-4 sm:w-5 cursor-ew-resize group z-10"
                                style={{ left: `calc(${(startTime / duration) * 100}% - 10px)` }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
                            >
                                <div className="absolute inset-y-0 right-0 w-1.5 bg-emerald-500 rounded-l-full group-hover:bg-emerald-400 transition-colors shadow-lg" />
                                <div className="absolute top-1/2 right-0 -translate-y-1/2 w-3 h-8 sm:h-10 bg-emerald-500 rounded-l-lg flex items-center justify-center group-hover:bg-emerald-400">
                                    <div className="w-0.5 h-4 bg-emerald-900/50 rounded-full" />
                                </div>
                            </div>

                            {/* End Handle */}
                            <div
                                className="absolute top-0 bottom-0 w-4 sm:w-5 cursor-ew-resize group z-10"
                                style={{ left: `${(endTime / duration) * 100}%` }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
                            >
                                <div className="absolute inset-y-0 left-0 w-1.5 bg-rose-500 rounded-r-full group-hover:bg-rose-400 transition-colors shadow-lg" />
                                <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-8 sm:h-10 bg-rose-500 rounded-r-lg flex items-center justify-center group-hover:bg-rose-400">
                                    <div className="w-0.5 h-4 bg-rose-900/50 rounded-full" />
                                </div>
                            </div>

                            {/* Playhead */}
                            <div
                                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-20"
                                style={{ left: `${(currentTime / duration) * 100}%` }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, 'playhead')}
                            >
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg" />
                            </div>
                        </div>

                        {/* Playback Controls */}
                        <div className="flex items-center justify-center gap-4 mt-4">
                            <button
                                onClick={togglePlay}
                                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all border border-white/10"
                            >
                                {isPlaying ? (
                                    <Pause className="w-5 h-5 sm:w-6 sm:h-6" />
                                ) : (
                                    <Play className="w-5 h-5 sm:w-6 sm:h-6 ml-0.5" />
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {/* Footer Actions */}
                <div className="flex-shrink-0 flex gap-3 px-4 py-3 sm:px-6 sm:py-4 border-t border-white/10 bg-slate-950">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 h-10 sm:h-12 bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isProcessing}
                        className="flex-1 h-10 sm:h-12 bg-gradient-to-r from-primary via-purple-600 to-rose-500 hover:opacity-90 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] shadow-xl shadow-primary/20 border-none px-0"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                <span>Processing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Apply Edit</span>
                            </div>
                        )}
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>,
        document.body
    );
}

export default VideoEditor;
