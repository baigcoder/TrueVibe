import { m } from 'framer-motion';
import { Play, Pause, SkipForward, Music } from 'lucide-react';
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
    const { nowPlaying, isLoading, play, pause, next, isPlaying } = useSpotify();
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



    // Not playing - show idle state
    if (!hasTrack) {
        return (
            <m.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-4 relative group shadow-2xl transition-all duration-700 hover:border-white/20"
            >
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#1DB954]/10 flex items-center justify-center">
                        <Music className="w-4 h-4 text-[#1DB954]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-white uppercase tracking-widest aether-font italic">
                            Spotify Sync
                        </p>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest tech-font">
                            Idle mode
                        </p>
                    </div>
                    <div className="flex gap-0.5 items-end h-3">
                        {[0.3, 0.5, 0.4].map((h, i) => (
                            <div
                                key={i}
                                className="w-[1.5px] bg-[#1DB954]/40 rounded-full"
                                style={{ height: `${h * 100}%` }}
                            />
                        ))}
                    </div>
                </div>
            </m.div>
        );
    }

    return (
        <m.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-3xl p-5 relative group shadow-2xl transition-all duration-700 hover:border-white/20"
            style={{
                background: `linear-gradient(135deg, ${dominantColor}15 0%, transparent 100%)`,
            }}
        >
            {/* Animated Glow Overlay with dynamic color */}
            <m.div
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
                    <m.div
                        animate={isPlaying ? { rotate: 360 } : {}}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg"
                        style={{ borderColor: `${dominantColor}60` }}
                    >
                        <img
                            src={track.albumArt}
                            alt={track.album}
                            className="w-full h-full object-cover"
                        />
                    </m.div>
                    <div
                        className="absolute inset-0 rounded-full border pointer-events-none"
                        style={{ borderColor: `${dominantColor}20` }}
                    />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <m.h4
                            className="text-[11px] font-black text-white uppercase tracking-tight truncate aether-font italic"
                        >
                            {track.name}
                        </m.h4>
                        <p
                            className="text-[9px] font-bold uppercase tracking-widest truncate tech-font opacity-80"
                            style={{ color: dominantColor }}
                        >
                            {track.artists}
                        </p>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-2 space-y-1">
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <m.div
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
                <div className="shrink-0 flex items-center gap-1.5">
                    <button
                        onClick={handlePlayPause}
                        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 shadow-lg"
                        style={{
                            backgroundColor: dominantColor,
                            boxShadow: `0 0 15px ${dominantColor}50`
                        }}
                    >
                        {isPlaying ? (
                            <Pause className="w-3.5 h-3.5 text-black" />
                        ) : (
                            <Play className="w-3.5 h-3.5 text-black ml-0.5" />
                        )}
                    </button>

                    <button
                        onClick={handleNext}
                        className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-all active:scale-95"
                    >
                        <SkipForward className="w-3.5 h-3.5 text-white/70" />
                    </button>
                </div>
            </div>
        </m.div>
    );
};
