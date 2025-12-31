import { useState, useRef, useEffect, useCallback } from 'react';
import { m } from 'framer-motion';
import { Mic, Square, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface VoiceRecorderProps {
    onRecordingComplete: (blob: Blob, duration: number) => void;
    onCancel: () => void;
    maxDuration?: number; // in seconds
}

export function VoiceRecorder({ onRecordingComplete, onCancel, maxDuration = 120 }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio analyser for visualization
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            // Start visualization
            const updateLevel = () => {
                if (analyserRef.current) {
                    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
                    analyserRef.current.getByteFrequencyData(dataArray);
                    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
                    setAudioLevel(average / 128);
                }
                animationFrameRef.current = requestAnimationFrame(updateLevel);
            };
            updateLevel();

            // Set up MediaRecorder
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                onRecordingComplete(audioBlob, duration);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100);
            setIsRecording(true);
            setDuration(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => {
                    if (prev >= maxDuration) {
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (error) {
            console.error('Failed to start recording:', error);
        }
    }, [maxDuration, onRecordingComplete]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        }
    }, [isRecording]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        setIsRecording(false);
        setDuration(0);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        onCancel();
    }, [onCancel]);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex items-center gap-4 p-4 bg-[#1f1f1f] rounded-xl border border-[#2a2a2a]"
        >
            {!isRecording ? (
                <>
                    <Button
                        size="icon"
                        onClick={startRecording}
                        className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90"
                    >
                        <Mic className="w-6 h-6" />
                    </Button>
                    <p className="text-gray-400 text-sm">Tap to record</p>
                </>
            ) : (
                <>
                    {/* Audio visualization */}
                    <div className="flex items-center gap-1 h-10">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <m.div
                                key={i}
                                className="w-1 bg-primary rounded-full"
                                animate={{
                                    height: Math.random() * 32 * audioLevel + 4,
                                }}
                                transition={{ duration: 0.1 }}
                            />
                        ))}
                    </div>

                    {/* Timer */}
                    <div className="flex-1 text-center">
                        <span className="text-white font-mono text-lg">{formatTime(duration)}</span>
                        <span className="text-gray-500 text-sm ml-2">/ {formatTime(maxDuration)}</span>
                    </div>

                    {/* Controls */}
                    <div className="flex gap-2">
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={cancelRecording}
                            className="w-10 h-10 rounded-full text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        >
                            <Trash2 className="w-5 h-5" />
                        </Button>
                        <Button
                            size="icon"
                            onClick={stopRecording}
                            className="w-10 h-10 rounded-full bg-primary hover:bg-primary/90"
                        >
                            <Square className="w-4 h-4 fill-current" />
                        </Button>
                    </div>
                </>
            )}
        </m.div>
    );
}

export default VoiceRecorder;
