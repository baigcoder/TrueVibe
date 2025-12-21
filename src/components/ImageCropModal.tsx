import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import type { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { X, Check, RotateCcw, Crop as CropIcon, Sparkles } from 'lucide-react';

// Filter presets
const FILTERS = [
    { name: 'None', filter: '' },
    { name: 'Grayscale', filter: 'grayscale(100%)' },
    { name: 'Sepia', filter: 'sepia(80%)' },
    { name: 'Warm', filter: 'sepia(30%) saturate(120%)' },
    { name: 'Cool', filter: 'saturate(90%) hue-rotate(20deg)' },
    { name: 'Vintage', filter: 'sepia(40%) contrast(90%) brightness(110%)' },
    { name: 'Crisp', filter: 'contrast(120%) saturate(110%)' },
    { name: 'Fade', filter: 'contrast(90%) brightness(110%) saturate(80%)' },
    { name: 'Dramatic', filter: 'contrast(130%) brightness(90%)' },
];

interface ImageCropModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (croppedImageBlob: Blob, filter: string) => void;
    imageFile: File | null;
    aspectRatio?: number; // e.g., 16/9 for cover, 1 for avatar
    title?: string;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop({ unit: '%', width: 90 }, aspect, mediaWidth, mediaHeight),
        mediaWidth,
        mediaHeight
    );
}

export function ImageCropModal({
    isOpen,
    onClose,
    onSave,
    imageFile,
    aspectRatio = 16 / 5, // Default cover aspect
    title = 'Edit Image'
}: ImageCropModalProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
    const [selectedFilter, setSelectedFilter] = useState(0);
    const [brightness, setBrightness] = useState(100);
    const [contrast, setContrast] = useState(100);
    const [saturation, setSaturation] = useState(100);
    const [imgSrc, setImgSrc] = useState('');
    const imgRef = useRef<HTMLImageElement>(null);

    // Load image when file changes
    useState(() => {
        if (imageFile) {
            const reader = new FileReader();
            reader.onload = () => {
                setImgSrc(reader.result as string);
            };
            reader.readAsDataURL(imageFile);
        }
    });

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        setCrop(centerAspectCrop(width, height, aspectRatio));
    }, [aspectRatio]);

    const getCombinedFilter = () => {
        const baseFilter = FILTERS[selectedFilter].filter;
        const adjustments = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        return baseFilter ? `${baseFilter} ${adjustments}` : adjustments;
    };

    const resetAdjustments = () => {
        setSelectedFilter(0);
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
    };

    const generateCroppedImage = useCallback(async (): Promise<Blob | null> => {
        if (!imgRef.current || !completedCrop) return null;

        const image = imgRef.current;
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        canvas.width = completedCrop.width * scaleX;
        canvas.height = completedCrop.height * scaleY;

        // Apply filter
        ctx.filter = getCombinedFilter();

        ctx.drawImage(
            image,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            canvas.width,
            canvas.height
        );

        return new Promise((resolve) => {
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.9);
        });
    }, [completedCrop, getCombinedFilter]);

    const handleSave = async () => {
        const blob = await generateCroppedImage();
        if (blob) {
            onSave(blob, getCombinedFilter());
            onClose();
        }
    };

    // Update image source when file changes
    if (imageFile && !imgSrc) {
        const reader = new FileReader();
        reader.onload = () => setImgSrc(reader.result as string);
        reader.readAsDataURL(imageFile);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-slate-950 border-white/10 p-0">
                <DialogHeader className="p-4 border-b border-white/10">
                    <DialogTitle className="flex items-center gap-3 text-white font-heading font-black italic uppercase tracking-wider text-sm">
                        <CropIcon className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col lg:flex-row h-full max-h-[calc(90vh-140px)]">
                    {/* Image Preview */}
                    <div className="flex-1 p-4 flex items-center justify-center bg-black/50 min-h-[300px] overflow-auto">
                        {imgSrc ? (
                            <ReactCrop
                                crop={crop}
                                onChange={(_, percentCrop) => setCrop(percentCrop)}
                                onComplete={(c) => setCompletedCrop(c)}
                                aspect={aspectRatio}
                                className="max-h-[400px]"
                            >
                                <img
                                    ref={imgRef}
                                    src={imgSrc}
                                    alt="Crop preview"
                                    onLoad={onImageLoad}
                                    style={{ filter: getCombinedFilter(), maxHeight: '400px' }}
                                    className="max-w-full"
                                />
                            </ReactCrop>
                        ) : (
                            <div className="text-slate-500 text-sm">No image selected</div>
                        )}
                    </div>

                    {/* Controls Panel */}
                    <div className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-white/10 p-4 space-y-6 overflow-y-auto bg-slate-900/50">
                        {/* Filters */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles className="w-4 h-4 text-primary" />
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Filters</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {FILTERS.map((filter, i) => (
                                    <button
                                        key={filter.name}
                                        onClick={() => setSelectedFilter(i)}
                                        className={cn(
                                            "p-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                                            selectedFilter === i
                                                ? "bg-primary/20 border-primary/50 text-primary"
                                                : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                                        )}
                                    >
                                        {filter.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Adjustments */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjust</span>
                                <button
                                    onClick={resetAdjustments}
                                    className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                                >
                                    <RotateCcw className="w-3 h-3" /> Reset
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                        <span>Brightness</span>
                                        <span>{brightness}%</span>
                                    </div>
                                    <Slider
                                        value={[brightness]}
                                        onValueChange={([v]) => setBrightness(v)}
                                        min={50}
                                        max={150}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                        <span>Contrast</span>
                                        <span>{contrast}%</span>
                                    </div>
                                    <Slider
                                        value={[contrast]}
                                        onValueChange={([v]) => setContrast(v)}
                                        min={50}
                                        max={150}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                                        <span>Saturation</span>
                                        <span>{saturation}%</span>
                                    </div>
                                    <Slider
                                        value={[saturation]}
                                        onValueChange={([v]) => setSaturation(v)}
                                        min={0}
                                        max={200}
                                        step={1}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-t border-white/10 flex justify-end gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="text-slate-400 hover:text-white"
                    >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!completedCrop}
                        className="bg-primary hover:bg-primary/90 text-white font-bold"
                    >
                        <Check className="w-4 h-4 mr-2" />
                        Apply
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
