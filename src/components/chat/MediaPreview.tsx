import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Video, Image as ImageIcon, Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

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
            return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
        case 'video':
            return 'text-violet-500 bg-violet-500/10 border-violet-500/20';
        case 'voice':
            return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
        default:
            return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
    }
};

export function MediaPreview({
    files,
    onRemove,
    onClear,
    isUploading = false,
    uploadProgress = 0,
}: MediaPreviewProps) {
    if (files.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: 10, height: 0 }}
            className="px-6 py-4 border-b border-cyan-500/10 glass-luxe-light relative overflow-hidden"
        >
            <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black text-cyan-400/60 uppercase tracking-[0.3em] tech-font">
                    {files.length} NODE_ATTACHMENT{files.length > 1 ? 'S' : ''}
                </span>
                {!isUploading && (
                    <button
                        onClick={onClear}
                        className="text-[9px] font-black text-slate-500 hover:text-rose-500 transition-colors uppercase tracking-widest"
                    >
                        HALT_ALL_UPLOADS
                    </button>
                )}
            </div>

            {/* Preview Grid */}
            <div className="flex flex-wrap gap-3">
                <AnimatePresence mode="popLayout">
                    {files.map((item, index) => {
                        const Icon = getFileIcon(item.type);
                        const colorClass = getFileColor(item.type);

                        return (
                            <motion.div
                                key={`${item.file.name}-${index}`}
                                layout
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="relative group"
                            >
                                {item.type === 'image' && item.previewUrl ? (
                                    // Image Preview
                                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                                        <img
                                            src={item.previewUrl}
                                            alt={item.file.name}
                                            className="w-full h-full object-cover"
                                        />
                                        {isUploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            </div>
                                        )}
                                    </div>
                                ) : item.type === 'video' && item.previewUrl ? (
                                    // Video Preview
                                    <div className="relative w-20 h-20 rounded-2xl overflow-hidden border border-white/10">
                                        <video
                                            src={item.previewUrl}
                                            className="w-full h-full object-cover"
                                            muted
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                            {isUploading ? (
                                                <Loader2 className="w-6 h-6 text-white animate-spin" />
                                            ) : (
                                                <Video className="w-6 h-6 text-white" />
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={cn(
                                        "w-20 h-20 rounded-2xl border flex flex-col items-center justify-center gap-2 glass-luxe transition-all group-hover:border-cyan-500/30",
                                        colorClass
                                    )}>
                                        {isUploading ? (
                                            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                                        ) : (
                                            <Icon className="w-6 h-6 opacity-80" />
                                        )}
                                        <span className="text-[7px] font-black uppercase tracking-[0.2em] truncate max-w-[60px] tech-font opacity-60">
                                            {item.file.name.split('.').pop()}
                                        </span>
                                    </div>
                                )}

                                {/* Remove Button */}
                                {!isUploading && (
                                    <button
                                        onClick={() => onRemove(index)}
                                        className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}

                                {/* File Info Tooltip */}
                                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                    <div className="bg-slate-900 px-2 py-1 rounded-lg text-[8px] text-slate-400 whitespace-nowrap border border-white/10">
                                        {formatFileSize(item.file.size)}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {isUploading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5 relative">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                className="h-full bg-cyan-500 shadow-[0_0_15px_rgba(0,245,255,0.8)] rounded-full relative z-10"
                            />
                            <div className="absolute inset-0 cyber-grid opacity-20" />
                        </div>
                        <span className="text-[10px] font-black text-cyan-400 tech-font">
                            {uploadProgress}%_SYNC
                        </span>
                    </div>
                </motion.div>
            )}
        </motion.div>
    );
}

export default MediaPreview;
