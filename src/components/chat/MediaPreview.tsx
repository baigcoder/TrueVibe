import { m, AnimatePresence } from 'framer-motion';
import { X, FileText, Video, Image as ImageIcon, Mic, Loader2, Play, ZoomIn, Film, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useRef } from 'react';

export interface PreviewFile {
    file: File;
    previewUrl?: string;
    type: 'image' | 'video' | 'file' | 'voice';
}

interface MediaPreviewProps {
    files: PreviewFile[];
    onRemove: (index: number) => void;
    onClear: () => void;
    isUploading?: boolean;
    uploadProgress?: number;
}

const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getFileIcon = (type: PreviewFile['type']) => {
    switch (type) {
        case 'image':
            return ImageIcon;
        case 'video':
            return Video;
        case 'voice':
            return Mic;
        default:
            return FileText;
    }
};

const getFileColor = (type: PreviewFile['type']) => {
    switch (type) {
        case 'image':
            return 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30';
        case 'video':
            return 'text-violet-400 bg-violet-500/15 border-violet-500/30';
        case 'voice':
            return 'text-rose-400 bg-rose-500/15 border-rose-500/30';
        default:
            return 'text-amber-400 bg-amber-500/15 border-amber-500/30';
    }
};

// Individual preview item component
function PreviewItem({
    item,
    index,
    onRemove,
    isUploading,
    onExpand
}: {
    item: PreviewFile;
    index: number;
    onRemove: (index: number) => void;
    isUploading: boolean;
    onExpand: () => void;
}) {
    const [videoDuration, setVideoDuration] = useState<number>(0);
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const Icon = getFileIcon(item.type);
    const colorClass = getFileColor(item.type);

    const handleVideoPlay = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (videoRef.current) {
            if (isVideoPlaying) {
                videoRef.current.pause();
            } else {
                videoRef.current.play();
            }
            setIsVideoPlaying(!isVideoPlaying);
        }
    };

    return (
        <m.div
            layout
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="relative group"
        >
            {item.type === 'image' && item.previewUrl ? (
                // Enhanced Image Preview
                <div
                    className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 cursor-pointer hover:border-primary/40 transition-all shadow-lg hover:shadow-primary/20"
                    onClick={onExpand}
                >
                    <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {/* Expand button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <ZoomIn className="w-5 h-5 text-white" />
                        </div>
                    </div>

                    {/* File info badge */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[8px] font-bold text-white uppercase">
                            {item.file.name.split('.').pop()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[8px] font-medium text-white/70">
                            {formatFileSize(item.file.size)}
                        </span>
                    </div>

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                    )}
                </div>
            ) : item.type === 'video' && item.previewUrl ? (
                // Enhanced Video Preview with playback
                <div
                    className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border border-white/10 bg-slate-900/50 cursor-pointer hover:border-violet-500/40 transition-all shadow-lg hover:shadow-violet-500/20"
                >
                    <video
                        ref={videoRef}
                        src={item.previewUrl}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        onLoadedMetadata={(e) => setVideoDuration(e.currentTarget.duration)}
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                    />

                    {/* Video gradient overlay */}
                    <div className={cn(
                        "absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 transition-opacity",
                        isVideoPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                    )} />

                    {/* Play/Pause button */}
                    <button
                        onClick={handleVideoPlay}
                        className={cn(
                            "absolute inset-0 flex items-center justify-center transition-all",
                            isVideoPlaying ? "opacity-0 hover:opacity-100" : "opacity-100"
                        )}
                    >
                        <div className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center transition-all",
                            isVideoPlaying
                                ? "bg-white/20 backdrop-blur-sm"
                                : "bg-violet-500/80 shadow-lg shadow-violet-500/30"
                        )}>
                            {isVideoPlaying ? (
                                <div className="flex gap-1">
                                    <div className="w-1 h-4 bg-white rounded-full" />
                                    <div className="w-1 h-4 bg-white rounded-full" />
                                </div>
                            ) : (
                                <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                            )}
                        </div>
                    </button>

                    {/* Video badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-violet-500/80 backdrop-blur-sm">
                        <Film className="w-3 h-3 text-white" />
                        <span className="text-[9px] font-bold text-white uppercase">Video</span>
                    </div>

                    {/* Duration & size info */}
                    <div className="absolute bottom-1.5 left-1.5 right-1.5 flex items-center justify-between">
                        {videoDuration > 0 && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[9px] font-bold text-white">
                                <Clock className="w-3 h-3" />
                                {formatDuration(videoDuration)}
                            </span>
                        )}
                        <span className="px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-sm text-[8px] font-medium text-white/70 ml-auto">
                            {formatFileSize(item.file.size)}
                        </span>
                    </div>

                    {isUploading && (
                        <div className="absolute inset-0 bg-black/70 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                        </div>
                    )}
                </div>
            ) : (
                // Other file types
                <div className={cn(
                    "w-24 h-24 sm:w-28 sm:h-28 rounded-2xl border flex flex-col items-center justify-center gap-2 transition-all group-hover:border-primary/40",
                    colorClass
                )}>
                    {isUploading ? (
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    ) : (
                        <Icon className="w-8 h-8 opacity-80" />
                    )}
                    <div className="text-center px-2">
                        <span className="block text-[8px] font-black uppercase tracking-widest truncate max-w-[70px]">
                            {item.file.name.split('.').pop()}
                        </span>
                        <span className="block text-[7px] opacity-60 mt-0.5">
                            {formatFileSize(item.file.size)}
                        </span>
                    </div>
                </div>
            )}

            {/* Remove Button */}
            {!isUploading && (
                <m.button
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(index);
                    }}
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg hover:scale-110"
                >
                    <X className="w-4 h-4" />
                </m.button>
            )}
        </m.div>
    );
}

export function MediaPreview({
    files,
    onRemove,
    onClear,
    isUploading = false,
    uploadProgress = 0,
}: MediaPreviewProps) {
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

    if (files.length === 0) return null;

    return (
        <>
            <m.div
                initial={{ opacity: 0, y: 10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: 10, height: 0 }}
                className="px-4 sm:px-6 py-4 border-b border-primary/10 glass-luxe-light relative overflow-hidden"
            >
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white">
                                {files.length} {files.length === 1 ? 'File' : 'Files'} Selected
                            </span>
                            <p className="text-[10px] text-slate-500">
                                Ready to send
                            </p>
                        </div>
                    </div>
                    {!isUploading && (
                        <button
                            onClick={onClear}
                            className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold uppercase tracking-wider hover:bg-red-500/20 transition-colors"
                        >
                            Clear All
                        </button>
                    )}
                </div>

                {/* Preview Grid */}
                <div className="flex flex-wrap gap-3">
                    <AnimatePresence mode="popLayout">
                        {files.map((item, index) => (
                            <PreviewItem
                                key={`${item.file.name}-${index}`}
                                item={item}
                                index={index}
                                onRemove={onRemove}
                                isUploading={isUploading}
                                onExpand={() => setExpandedIndex(index)}
                            />
                        ))}
                    </AnimatePresence>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                    <m.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4"
                    >
                        <div className="flex items-center gap-4">
                            <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5 relative">
                                <m.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${uploadProgress}%` }}
                                    className="h-full bg-gradient-to-r from-primary to-violet-500 shadow-[0_0_20px_rgba(129,140,248,0.8)] rounded-full"
                                />
                            </div>
                            <span className="text-sm font-bold text-primary min-w-[50px] text-right">
                                {uploadProgress}%
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-2">
                            Uploading... Please don't close this window
                        </p>
                    </m.div>
                )}
            </m.div>

            {/* Expanded Image Modal */}
            <AnimatePresence>
                {expandedIndex !== null && files[expandedIndex]?.type === 'image' && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
                        onClick={() => setExpandedIndex(null)}
                    >
                        <m.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            className="relative max-w-4xl max-h-[85vh] rounded-2xl overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <img
                                src={files[expandedIndex].previewUrl}
                                alt={files[expandedIndex].file.name}
                                className="max-w-full max-h-[85vh] object-contain rounded-2xl"
                            />
                            <button
                                onClick={() => setExpandedIndex(null)}
                                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                                <span className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-sm text-white">
                                    {files[expandedIndex].file.name}
                                </span>
                                <span className="px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-sm text-white/70">
                                    {formatFileSize(files[expandedIndex].file.size)}
                                </span>
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </>
    );
}

export default MediaPreview;
