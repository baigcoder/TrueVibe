import { motion } from 'framer-motion';
import { useSpotify } from '@/hooks/useSpotify';

export const SpotifyPlayer = () => {
    const { nowPlaying, isLoading } = useSpotify();

    if (isLoading || !nowPlaying?.playing) return null;

    const { track } = nowPlaying;
    if (!track) return null;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full bg-[#1DB954]/5 backdrop-blur-3xl border border-[#1DB954]/10 rounded-3xl p-3 relative overflow-hidden group shadow-2xl"
        >
            {/* Animated Glow Overlay */}
            <motion.div
                animate={{
                    opacity: [0.1, 0.2, 0.1],
                    scale: [1, 1.05, 1]
                }}
                transition={{ duration: 4, repeat: Infinity }}
                className="absolute inset-0 bg-gradient-to-br from-[#1DB954]/20 to-transparent pointer-events-none"
            />

            <div className="flex items-center gap-4 relative z-10">
                {/* Album Art */}
                <div className="relative shrink-0">
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                        className="w-12 h-12 rounded-full overflow-hidden border border-[#1DB954]/30 shadow-lg"
                    >
                        <img
                            src={track.albumArt}
                            alt={track.album}
                            className="w-full h-full object-cover"
                        />
                    </motion.div>
                    <div className="absolute inset-0 rounded-full border border-white/10 pointer-events-none" />
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-[#030712] rounded-full border border-[#1DB954]/40" />
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <motion.h4
                            className="text-[10px] font-black text-white uppercase tracking-tight truncate aether-font italic"
                        >
                            {track.name}
                        </motion.h4>
                        <p className="text-[8px] text-[#1DB954] font-bold uppercase tracking-widest truncate tech-font">
                            {track.artists}
                        </p>
                    </div>

                    {/* Simple Progress Bar */}
                    <div className="mt-2.5 space-y-1">
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(track.progress / track.duration) * 100}%` }}
                                className="h-full bg-[#1DB954] shadow-[0_0_10px_#1DB954]"
                            />
                        </div>
                    </div>
                </div>

                {/* Status Icon */}
                <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-white/5">
                    <div className="flex gap-0.5 items-end h-2.5">
                        {[0.4, 0.8, 0.6, 0.9, 0.5].map((h, i) => (
                            <motion.div
                                key={i}
                                animate={{ height: [`${h * 100}%`, `${(1 - h) * 100}%`, `${h * 100}%`] }}
                                transition={{ duration: 0.5 + i * 0.1, repeat: Infinity }}
                                className="w-[1.2px] bg-[#1DB954]"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
