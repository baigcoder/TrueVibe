import { useState, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import { MapPin, Navigation, Send, X, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LocationPickerProps {
    onLocationSelect: (location: { lat: number; lng: number; address?: string }) => void;
    onCancel: () => void;
}

interface LocationDisplayProps {
    lat: number;
    lng: number;
    address?: string;
    className?: string;
}

/**
 * Component to pick and share current location
 */
export function LocationPicker({ onLocationSelect, onCancel }: LocationPickerProps) {
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const getCurrentLocation = useCallback(() => {
        setIsLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('Geolocation is not supported by your browser');
            setIsLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ lat: latitude, lng: longitude });

                // Try to get address using reverse geocoding
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
                    );
                    const data = await response.json();
                    setAddress(data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                } catch {
                    setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                }

                setIsLoading(false);
            },
            (err) => {
                setError(`Failed to get location: ${err.message}`);
                setIsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, []);

    const handleSend = useCallback(() => {
        if (location) {
            onLocationSelect({ ...location, address });
        }
    }, [location, address, onLocationSelect]);

    useEffect(() => {
        getCurrentLocation();
    }, [getCurrentLocation]);

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="p-4 rounded-2xl bg-[#1a1a1a] border border-white/10"
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="font-bold text-white">Share Location</span>
                </div>
                <button onClick={onCancel} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20">
                    <X className="w-4 h-4 text-white" />
                </button>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    <span className="ml-3 text-slate-400">Getting your location...</span>
                </div>
            ) : error ? (
                <div className="py-4">
                    <p className="text-red-400 text-sm mb-4">{error}</p>
                    <Button onClick={getCurrentLocation} variant="outline" className="w-full">
                        <Navigation className="w-4 h-4 mr-2" />
                        Try Again
                    </Button>
                </div>
            ) : location ? (
                <div className="space-y-4">
                    {/* Map Preview using OpenStreetMap */}
                    <div className="relative w-full h-40 rounded-xl overflow-hidden bg-slate-800">
                        <img
                            src={`https://staticmap.openstreetmap.de/staticmap.php?center=${location.lat},${location.lng}&zoom=15&size=400x200&markers=${location.lat},${location.lng},red`}
                            alt="Location map"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-2 left-2 right-2 text-xs text-white/80 truncate bg-black/40 px-2 py-1 rounded">
                            {address}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button onClick={getCurrentLocation} variant="outline" className="flex-1">
                            <Navigation className="w-4 h-4 mr-2" />
                            Refresh
                        </Button>
                        <Button onClick={handleSend} className="flex-1 bg-primary">
                            <Send className="w-4 h-4 mr-2" />
                            Share
                        </Button>
                    </div>
                </div>
            ) : null}
        </m.div>
    );
}

/**
 * Component to display a shared location in chat
 */
export function LocationDisplay({ lat, lng, address, className }: LocationDisplayProps) {
    const openInMaps = () => {
        window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
    };

    return (
        <div
            className={cn(
                "rounded-xl overflow-hidden bg-slate-800 max-w-[280px] cursor-pointer group",
                className
            )}
            onClick={openInMaps}
        >
            {/* Map Preview */}
            <div className="relative w-full h-32">
                <img
                    src={`https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=15&size=300x150&markers=${lat},${lng},red`}
                    alt="Location"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <ExternalLink className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
            </div>

            {/* Location Info */}
            <div className="p-3">
                <div className="flex items-center gap-2 mb-1">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-xs font-bold text-white">Shared Location</span>
                </div>
                {address && (
                    <p className="text-[11px] text-slate-400 truncate">{address}</p>
                )}
            </div>
        </div>
    );
}

export default LocationPicker;
