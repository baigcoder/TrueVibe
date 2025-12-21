import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import {
    X, Check, RotateCcw, ZoomIn, ZoomOut,
    Maximize2, Square, RectangleHorizontal
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

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onCancel}
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">Edit Photo</h3>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleReset}
                        className="text-white/70 hover:text-white hover:bg-white/10 rounded-xl"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </Button>
                </div>

                {/* Aspect Ratio Pills */}
                <div className="flex items-center justify-center gap-2 p-3 border-b border-white/5">
                    {ASPECT_RATIOS.map((aspect) => (
                        <button
                            key={aspect.id}
                            onClick={() => setSelectedAspect(aspect)}
                            className={cn(
                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                selectedAspect.id === aspect.id
                                    ? "bg-primary text-white shadow-lg shadow-primary/30"
                                    : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
                            )}
                        >
                            <aspect.icon className="w-3 h-3" />
                            {aspect.label}
                        </button>
                    ))}
                </div>

                {/* Crop Area */}
                <div className="flex-1 relative overflow-hidden">
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
                                    backgroundColor: '#000',
                                },
                                cropAreaStyle: {
                                    border: '2px solid rgba(129, 140, 248, 0.8)',
                                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                                },
                            }}
                        />
                    </div>
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-4 p-3 border-t border-white/5">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                        className="text-white/60 hover:text-white rounded-xl"
                    >
                        <ZoomOut className="w-5 h-5" />
                    </Button>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.1}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-32 h-1 bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg"
                    />
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                        className="text-white/60 hover:text-white rounded-xl"
                    >
                        <ZoomIn className="w-5 h-5" />
                    </Button>
                </div>

                {/* Filter Presets */}
                <div className="p-4 border-t border-white/10">
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {FILTERS.map((filter) => (
                            <button
                                key={filter.id}
                                onClick={() => setSelectedFilter(filter)}
                                className={cn(
                                    "flex-shrink-0 flex flex-col items-center gap-2 transition-all",
                                    selectedFilter.id === filter.id && "scale-105"
                                )}
                            >
                                <div
                                    className={cn(
                                        "w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all",
                                        selectedFilter.id === filter.id
                                            ? "border-primary shadow-lg shadow-primary/30"
                                            : "border-white/10"
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
                                    "text-[9px] font-black uppercase tracking-widest",
                                    selectedFilter.id === filter.id ? "text-primary" : "text-white/50"
                                )}>
                                    {filter.label}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-4 border-t border-white/10">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        className="flex-1 h-12 bg-white/5 border-white/10 text-white hover:bg-white/10 rounded-xl font-bold uppercase tracking-widest text-xs"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={isProcessing || !croppedAreaPixels}
                        className="flex-1 h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-primary/20"
                    >
                        {isProcessing ? (
                            <span className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processing...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <Check className="w-4 h-4" />
                                Apply
                            </span>
                        )}
                    </Button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}

export default ImageEditor;
