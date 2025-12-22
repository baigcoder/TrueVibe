import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, Music } from 'lucide-react';
import { useSpotify } from '@/hooks/useSpotify';
import { useState, useEffect, useRef } from 'react';

// Extract dominant color from an image
const extractDominantColor = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve('#1DB954');
                return;
            }

            canvas.width = 50;
            canvas.height = 50;
            ctx.drawImage(img, 0, 0, 50, 50);

            try {
                const imageData = ctx.getImageData(0, 0, 50, 50).data;
                let r = 0, g = 0, b = 0, count = 0;

                // Sample every 4th pixel for performance
                for (let i = 0; i < imageData.length; i += 16) {
                    r += imageData[i];
                    g += imageData[i + 1];
                    b += imageData[i + 2];
                    count++;
                }

                r = Math.round(r / count);
                g = Math.round(g / count);
                b = Math.round(b / count);

                resolve(`rgb(${r}, ${g}, ${b})`);
            } catch {
                resolve('#1DB954');
            }
        };
        img.onerror = () => resolve('#1DB954');
        img.src = imageUrl;
    });
};

export const SpotifyPlayer = () => {
    const { nowPlaying, isLoading, play, pause, next, previous, isPlaying } = useSpotify();
    const [dominantColor, setDominantColor] = useState('#1DB954');
    const lastAlbumArt = useRef<string>('');

    useEffect(() => {
        const albumArt = nowPlaying?.track?.albumArt;
        if (albumArt && albumArt !== lastAlbumArt.current) {
            lastAlbumArt.current = albumArt;
            extractDominantColor(albumArt).then(setDominantColor);
        }
    }, [nowPlaying?.track?.albumArt]);

    // Show idle state when connected but not playing
    if (isLoading) return null;

    const { track } = nowPlaying || {};
    const hasTrack = track && nowPlaying?.playing;

    const handlePlayPause = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        next();
    };

    const handlePrevious = (e: React.MouseEvent) => {
        e.stopPropagation();
        previous();
    };

    // Not playing - show idle state
    if (!hasTrack) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-[#1DB954]/5 backdrop-blur-3xl border border-[#1DB954]/10 rounded-3xl p-4 relative overflow-hidden"
            >
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-[#1DB954]/10 flex items-center justify-center">
                        <Music className="w-5 h-5 text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white uppercase tracking-tight aether-font italic">
                            Spotify Connected
                        </p>
                        <p className="text-[8px] text-[#1DB954] font-bold uppercase tracking-widest tech-font">
                            Play something to see it here
                        </p>
                    </div>
                    <div className="flex gap-0.5 items-end h-4">
                        {[0.3, 0.5, 0.4].map((h, i) => (
                            <div
                                key={i}
                                className="w-[2px] bg-[#1DB954]/40 rounded-full"
                                style={{ height: `${h * 100}%` }}
                            />
                        ))}
                    </div>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full backdrop-blur-3xl border border-white/10 rounded-3xl p-3 relative overflow-hidden group shadow-2xl"
            style={{
                background: `linear-gradient(135deg, ${dominantColor}15 0%, ${dominantColor}05 50%, transparent 100%)`,
            }}
        >
            {/* Animated Glow Overlay with dynamic color */}
            <motion.div
                animate={{
                    opacity: [0.1, 0.25, 0.1],
                    scale: [1, 1.05, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(ellipse at top left, ${dominantColor}30, transparent 70%)`,
                }}
            />

            <div className="flex items-center gap-3 relative z-10">
                {/* Album Art */}
                <div className="relative shrink-0">
                    <motion.div
                        animate={isPlaying ? { rotate: 360 } : {}}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg"
                        style={{ borderColor: `${dominantColor}60` }}
                    >
                        <img
                            src={track.albumArt}
                            alt={track.album}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                    <div
                        className="absolute inset-0 rounded-full border pointer-events-none"
                        style={{ borderColor: `${dominantColor}20` }}
                    />
                    <div
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#030712] rounded-full border"
                        style={{ borderColor: `${dominantColor}60` }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <motion.h4
                            className="text-[11px] font-black text-white uppercase tracking-tight truncate aether-font italic"
                        >
                            {track.name}
                        </motion.h4>
                        <p
                            className="text-[9px] font-bold uppercase tracking-widest truncate tech-font"
                            style={{ color: dominantColor }}
                        >
                            {track.artists}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 space-y-1">
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(track.progress / track.duration) * 100}%` }}
                                className="h-full shadow-lg"
                                style={{
                                    backgroundColor: dominantColor,
                                    boxShadow: `0 0 10px ${dominantColor}`
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Playback Controls */}
                <div className="shrink-0 flex items-center gap-1">
                    <button
                        onClick={handlePrevious}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                    >
                        <SkipBack className="w-3 h-3 text-white/70" />
                    </button>

                    <button
                        onClick={handlePlayPause}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg"
                        style={{
                            backgroundColor: dominantColor,
                            boxShadow: `0 0 20px ${dominantColor}50`
                        }}
                    >
                        {isPlaying ? (
                            <Pause className="w-4 h-4 text-black" />
                        ) : (
                            <Play className="w-4 h-4 text-black ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={handleNext}
                        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-90"
                    >
                        <SkipForward className="w-3 h-3 text-white/70" />
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
