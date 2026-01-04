import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Cropper from 'react-easy-crop';
import { m, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    X, Check, RotateCcw, ZoomIn, ZoomOut,
    Maximize2, Square, RectangleHorizontal,
    Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageEditorProps {
    imageUrl: string;
    onApply: (editedBlob: Blob) => void;
    onCancel: () => void;
}

interface CroppedAreaPixels {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Filter presets with CSS filters
const FILTERS = [
    { id: 'original', label: 'Original', filter: 'none' },
    { id: 'grayscale', label: 'B&W', filter: 'grayscale(100%)' },
    { id: 'sepia', label: 'Warm', filter: 'sepia(60%)' },
    { id: 'contrast', label: 'Pop', filter: 'contrast(130%) saturate(110%)' },
    { id: 'saturate', label: 'Vivid', filter: 'saturate(150%)' },
    { id: 'brightness', label: 'Bright', filter: 'brightness(115%)' },
    { id: 'vintage', label: 'Vintage', filter: 'sepia(30%) contrast(110%) brightness(90%)' },
    { id: 'cool', label: 'Cool', filter: 'saturate(80%) hue-rotate(20deg)' },
];

// Aspect ratio presets
const ASPECT_RATIOS = [
    { id: 'free', label: 'Free', value: undefined, icon: Maximize2 },
    { id: '1:1', label: '1:1', value: 1, icon: Square },
    { id: '4:5', label: '4:5', value: 4 / 5, icon: RectangleHorizontal },
    { id: '16:9', label: '16:9', value: 16 / 9, icon: RectangleHorizontal },
];

// Helper to create cropped image
const createCroppedImage = async (
    imageSrc: string,
    croppedAreaPixels: CroppedAreaPixels,
    filter: string
): Promise<Blob> => {
    const image = document.createElement('img') as HTMLImageElement;
    image.src = imageSrc;

    await new Promise((resolve) => {
        image.onload = resolve;
    });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('No 2D context');

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    // Apply filter
    ctx.filter = filter;

    ctx.drawImage(
        image,
        croppedAreaPixels.x,
        croppedAreaPixels.y,
        croppedAreaPixels.width,
        croppedAreaPixels.height,
        0,
        0,
        croppedAreaPixels.width,
        croppedAreaPixels.height
    );

    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to create blob'));
            },
            'image/jpeg',
            0.9
        );
    });
};

export function ImageEditor({ imageUrl, onApply, onCancel }: ImageEditorProps) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [rotation, setRotation] = useState(0);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
    const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
    const [selectedAspect, setSelectedAspect] = useState(ASPECT_RATIOS[0]);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropComplete = useCallback(
        (_croppedArea: any, croppedAreaPixels: CroppedAreaPixels) => {
            setCroppedAreaPixels(croppedAreaPixels);
        },
        []
    );

    const handleApply = async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await createCroppedImage(
                imageUrl,
                croppedAreaPixels,
                selectedFilter.filter
            );
            onApply(croppedBlob);
        } catch (error) {
            console.error('Failed to crop image:', error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReset = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setRotation(0);
        setSelectedFilter(FILTERS[0]);
        setSelectedAspect(ASPECT_RATIOS[0]);
    };

    return createPortal(
        <AnimatePresence>
            <m.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 sm:py-3 border-b border-white/10 bg-white/[0.02]">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8 sm:w-9 sm:h-9"
                    >
                        <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </Button>
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-[10px] sm:text-xs italic">Edit Fragment</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleReset}
                        className="text-white/50 hover:text-white hover:bg-white/10 rounded-xl w-8 h-8 sm:w-9 sm:h-9"
                    >
                        <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                </div>

                {/* Aspect Ratio Pills */}
                <div className="flex items-center justify-start sm:justify-center gap-2 px-4 py-2 sm:py-3 border-b border-white/5 bg-black/20 overflow-x-auto no-scrollbar">
                    {ASPECT_RATIOS.map((aspect) => (
                        <button
                            key={aspect.id}
                            onClick={() => setSelectedAspect(aspect)}
                            className={cn(
                                "px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-[8px] sm:text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 flex-shrink-0",
                                selectedAspect.id === aspect.id
                                    ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]"
                                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <aspect.icon className="w-2.5 h-2.5 sm:w-3 h-3" />
                            {aspect.label}
                        </button>
                    ))}
                </div>

                {/* Crop Area */}
                <div className="flex-1 min-h-[300px] relative bg-slate-900/40">
                    <div
                        className="absolute inset-0"
                        style={{ filter: selectedFilter.filter }}
                    >
                        <Cropper
                            image={imageUrl}
                            crop={crop}
                            zoom={zoom}
                            rotation={rotation}
                            aspect={selectedAspect.value}
                            onCropChange={setCrop}
                            onZoomChange={setZoom}
                            onRotationChange={setRotation}
                            onCropComplete={onCropComplete}
                            cropShape="rect"
                            showGrid={true}
                            style={{
                                containerStyle: {
                                    backgroundColor: 'transparent',
                                },
                                cropAreaStyle: {
                                    border: '2px solid rgba(var(--primary-rgb), 0.8)',
                                    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.75)',
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-4 px-4 py-2 sm:py-3 bg-black/20 border-t border-white/5">
                    <button
                        onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                        className="text-white/40 hover:text-white transition-colors p-1"
                    >
                        <ZoomOut className="w-3.5 h-3.5 sm:w-4 h-4" />
                    </button>
                    <div className="relative w-28 sm:w-48 h-1 flex items-center">
                        <div className="absolute inset-0 bg-white/10 rounded-full" />
                        <div
                            className="absolute inset-y-0 left-0 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]"
                            style={{ width: `${((zoom - 1) / 2) * 100}%` }}
                        />
                        <input
                            type="range"
                            min={1}
                            max={3}
                            step={0.01}
                            value={zoom}
                            onChange={(e) => setZoom(Number(e.target.value))}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div
                            className="absolute w-3 h-3 sm:w-3.5 sm:h-3.5 bg-white rounded-full shadow-lg border-2 border-primary pointer-events-none"
                            style={{ left: `calc(${((zoom - 1) / 2) * 100}% - 6px)` }}
                        />
                    </div>
                    <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                        className="text-white/40 hover:text-white transition-colors p-1"
                    >
                        <ZoomIn className="w-3.5 h-3.5 sm:w-4 h-4" />
                    </button>
                </div>

                {/* Filter Presets */}
                <div className="p-3 sm:p-4 bg-slate-950/50 border-t border-white/10">
                    <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-1.5 no-scrollbar">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSelectedFilter(filter)}
                                className={cn(
                                    "flex-shrink-0 flex flex-col items-center gap-1.5 sm:gap-2.5 transition-all duration-300",
                                    selectedFilter.id === filter.id ? "scale-105" : "opacity-60 hover:opacity-100"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-300",
                                        selectedFilter.id === filter.id
                                            ? "border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)]"
                                            : "border-white/5"
                                    )}
                                >
                                    <img
                                        src={imageUrl}
                                        alt={filter.label}
                                        className="w-full h-full object-cover"
                                        style={{ filter: filter.filter }}
                                    />
                                </div>
                                <span className={cn(
                                    "text-[7px] sm:text-[8px] font-black uppercase tracking-[0.2em]",
                                    selectedFilter.id === filter.id ? "text-primary" : "text-white/30"
                                )}>
                                    {filter.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 px-4 py-3 sm:px-6 sm:py-5 border-t border-white/10 bg-slate-950/80 safe-area-inset-bottom">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 h-10 sm:h-12 bg-white/5 border-white/10 text-white/70 hover:text-white hover:bg-white/10 rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px]"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isProcessing || !croppedAreaPixels}
                        className="flex-1 h-10 sm:h-12 bg-gradient-to-r from-primary via-purple-600 to-rose-500 hover:opacity-90 text-white rounded-xl sm:rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] sm:text-[10px] shadow-xl shadow-primary/20 border-none px-0"
                    >
                        {isProcessing ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                                <span>Syncing...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>Apply Vibe</span>
                            </div>
                        )}
                    </Button>
                </div>
            </m.div>
        </AnimatePresence>,
        document.body
    );
}

export default ImageEditor;
