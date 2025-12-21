import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoicePlayerProps {
    src: string;
    duration?: number;
    className?: string;
}

export function VoicePlayer({ src, duration: initialDuration, className }: VoicePlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(initialDuration || 0);
    const [waveformData, setWaveformData] = useState<number[]>([]);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    // Generate waveform visualization data
    useEffect(() => {
        const generateWaveform = async () => {
            try {
                const response = await fetch(src);
                const arrayBuffer = await response.arrayBuffer();
                const audioContext = new AudioContext();
                const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

                const channelData = audioBuffer.getChannelData(0);
                const samples = 50;
                const blockSize = Math.floor(channelData.length / samples);
                const waveform: number[] = [];

                for (let i = 0; i < samples; i++) {
                    let sum = 0;
                    for (let j = 0; j < blockSize; j++) {
                        sum += Math.abs(channelData[i * blockSize + j]);
                    }
                    waveform.push(sum / blockSize);
                }

                // Normalize
                const max = Math.max(...waveform);
                setWaveformData(waveform.map(v => v / max));
            } catch (error) {
                // Fallback to random waveform
                setWaveformData(Array.from({ length: 50 }, () => Math.random() * 0.5 + 0.5));
            }
        };

        generateWaveform();
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            setDuration(audio.duration);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

    const togglePlayback = useCallback(() => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!audioRef.current || !progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audioRef.current.currentTime = percentage * duration;
    }, [duration]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div className={cn("flex items-center gap-3 p-3 bg-[#1f1f1f] rounded-xl", className)}>
            <audio ref={audioRef} src={src} preload="metadata" />

            {/* Play/Pause Button */}
            <button
                onClick={togglePlayback}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white hover:bg-primary/90 transition-colors flex-shrink-0"
            >
                {isPlaying ? (
                    <Pause className="w-5 h-5" />
                ) : (
                    <Play className="w-5 h-5 ml-0.5" />
                )}
            </button>

            {/* Waveform */}
            <div
                ref={progressRef}
                className="flex-1 h-8 flex items-center gap-[2px] cursor-pointer"
                onClick={handleSeek}
            >
                {waveformData.map((height, index) => {
                    const isPlayed = (index / waveformData.length) * 100 <= progress;
                    return (
                        <motion.div
                            key={index}
                            className={cn(
                                "w-[3px] rounded-full transition-colors",
                                isPlayed ? "bg-primary" : "bg-[#3a3a3a]"
                            )}
                            style={{ height: `${height * 100}%` }}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: index * 0.01 }}
                        />
                    );
                })}
            </div>

            {/* Duration */}
            <div className="text-xs text-gray-400 font-mono min-w-[40px] text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
            </div>
        </div>
    );
}

export default VoicePlayer;
