import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface MediaItem {
    url: string;
    type: 'image' | 'video';
    postId?: string;
    likesCount?: number;
    commentsCount?: number;
}

interface MediaPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    media: MediaItem | MediaItem[];
    initialIndex?: number;
    showStats?: boolean;
}

export function MediaPreviewModal({
    isOpen,
    onClose,
    media,
    initialIndex = 0,
    showStats = false
}: MediaPreviewModalProps) {
    const mediaArray = Array.isArray(media) ? media : [media];
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const currentMedia = mediaArray[currentIndex];

    // Reset to initial index when media changes
    useEffect(() => {
        setCurrentIndex(initialIndex);
    }, [initialIndex, media]);

    const handlePrevious = useCallback(() => {
        setCurrentIndex(prev => (prev > 0 ? prev - 1 : mediaArray.length - 1));
    }, [mediaArray.length]);

    const handleNext = useCallback(() => {
        setCurrentIndex(prev => (prev < mediaArray.length - 1 ? prev + 1 : 0));
    }, [mediaArray.length]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') handlePrevious();
            if (e.key === 'ArrowRight') handleNext();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, handlePrevious, handleNext]);

    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && currentMedia && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-xl"
                    onClick={onClose}
                >
                    {/* Close button */}
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>

                    {/* Navigation arrows */}
                    {mediaArray.length > 1 && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ChevronLeft className="w-8 h-8 text-white" />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                            >
                                <ChevronRight className="w-8 h-8 text-white" />
                            </button>
                        </>
                    )}

                    {/* Media content */}
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {currentMedia.type === 'video' ? (
                            <video
                                src={currentMedia.url}
                                className="max-w-full max-h-[80vh] rounded-lg object-contain"
                                controls
                                autoPlay
                            />
                        ) : (
                            <img
                                src={currentMedia.url}
                                alt=""
                                className="max-w-full max-h-[80vh] rounded-lg object-contain"
                            />
                        )}

                        {/* Stats overlay */}
                        {showStats && (currentMedia.likesCount !== undefined || currentMedia.commentsCount !== undefined) && (
                            <div className="mt-4 flex items-center gap-6 text-white">
                                <div className="flex items-center gap-2">
                                    <Heart className="w-5 h-5 fill-white" />
                                    <span className="font-semibold">{currentMedia.likesCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MessageCircle className="w-5 h-5 fill-white" />
                                    <span className="font-semibold">{currentMedia.commentsCount || 0}</span>
                                </div>
                            </div>
                        )}

                        {/* Media counter */}
                        {mediaArray.length > 1 && (
                            <div className="mt-4 flex items-center gap-2">
                                {mediaArray.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`w-2 h-2 rounded-full transition-all ${idx === currentIndex
                                            ? 'bg-white w-6'
                                            : 'bg-white/40 hover:bg-white/60'
                                            }`}
                                    />
                                ))}
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
