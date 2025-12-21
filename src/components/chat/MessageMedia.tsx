import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, FileText, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import VoicePlayer from './VoicePlayer';

export interface MediaItem {
    type: 'image' | 'video' | 'file' | 'voice';
    url: string;
    name?: string;
    duration?: number;
}

interface MessageMediaProps {
    media: MediaItem[];
    isOwn?: boolean;
}

interface ImageLightboxProps {
    src: string;
    alt?: string;
    onClose: () => void;
}

function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[200] flex items-center justify-center"
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
            <motion.img
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                src={src}
                alt={alt}
                onClick={(e) => e.stopPropagation()}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-2xl shadow-2xl"
            />
        </motion.div>
    );
}

function VideoPlayer({ src, thumbnail }: { src: string; thumbnail?: string }) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showControls, setShowControls] = useState(true);

    return (
        <div
            className="relative rounded-2xl overflow-hidden bg-black group"
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => !isPlaying && setShowControls(true)}
        >
            <video
                src={src}
                poster={thumbnail}
                className="max-w-full max-h-[300px] object-contain"
                muted={isMuted}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onClick={(e) => {
                    const video = e.currentTarget;
                    if (video.paused) {
                        video.play();
                    } else {
                        video.pause();
                    }
                }}
                controls
            />
        </div>
    );
}

function FileAttachment({ item, isOwn }: { item: MediaItem; isOwn?: boolean }) {
    const fileName = item.name || 'File';
    const extension = fileName.split('.').pop()?.toUpperCase() || 'FILE';

    return (
        <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            download
            className={cn(
                "flex items-center gap-3 p-3 rounded-2xl border transition-all hover:scale-[1.02]",
                isOwn
                    ? "bg-primary/10 border-primary/20 hover:border-primary/40"
                    : "bg-white/5 border-white/10 hover:border-white/20"
            )}
        >
            <div className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center",
                isOwn ? "bg-primary/20" : "bg-amber-500/20"
            )}>
                <FileText className={cn(
                    "w-6 h-6",
                    isOwn ? "text-primary" : "text-amber-500"
                )} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{fileName}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">{extension}</p>
            </div>
            <Download className="w-5 h-5 text-slate-400" />
        </a>
    );
}

export function MessageMedia({ media, isOwn = false }: MessageMediaProps) {
    const [lightboxImage, setLightboxImage] = useState<string | null>(null);

    if (!media || media.length === 0) return null;

    // Group media by type for better layout
    const images = media.filter(m => m.type === 'image');
    const videos = media.filter(m => m.type === 'video');
    const files = media.filter(m => m.type === 'file');
    const voices = media.filter(m => m.type === 'voice');

    return (
        <>
            <div className="space-y-2 mt-2">
                {/* Images Grid */}
                {images.length > 0 && (
                    <div className={cn(
                        "grid gap-2",
                        images.length === 1 ? "grid-cols-1" :
                            images.length === 2 ? "grid-cols-2" :
                                images.length >= 3 ? "grid-cols-2" : "grid-cols-1"
                    )}>
                        {images.map((img, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setLightboxImage(img.url)}
                                className="relative cursor-pointer rounded-2xl overflow-hidden group"
                            >
                                <img
                                    src={img.url}
                                    alt={img.name || 'Image'}
                                    className="w-full h-auto max-h-[300px] object-cover"
                                />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Maximize2 className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}

                {/* Videos */}
                {videos.map((video, idx) => (
                    <VideoPlayer key={idx} src={video.url} />
                ))}

                {/* Voice Messages */}
                {voices.map((voice, idx) => (
                    <VoicePlayer
                        key={idx}
                        src={voice.url}
                        duration={voice.duration}
                    />
                ))}

                {/* Files */}
                {files.map((file, idx) => (
                    <FileAttachment key={idx} item={file} isOwn={isOwn} />
                ))}
            </div>

            {/* Image Lightbox */}
            <AnimatePresence>
                {lightboxImage && (
                    <ImageLightbox
                        src={lightboxImage}
                        onClose={() => setLightboxImage(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}

export default MessageMedia;
