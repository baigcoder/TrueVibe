import { useState, useRef, useCallback, useEffect } from 'react';
import { m } from 'framer-motion';
import { Video, Square, X, SwitchCamera, Send, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob, duration: number) => void;
    onCancel: () => void;
    maxDuration?: number; // in seconds
}

export function VideoRecorder({ onRecordingComplete, onCancel, maxDuration = 60 }: VideoRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [hasRecorded, setHasRecorded] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Start camera stream
    const startCamera = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
                audio: true
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (error) {
            console.error('Failed to access camera:', error);
        }
    }, [facingMode]);

    // Stop camera stream
    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    // Switch camera
    const switchCamera = useCallback(() => {
        setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
    }, []);

    // Start recording
    const startRecording = useCallback(() => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType: 'video/webm' });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' });
            setRecordedBlob(blob);
            setPreviewUrl(URL.createObjectURL(blob));
            setHasRecorded(true);
            stopCamera();
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
    }, [maxDuration, stopCamera]);

    // Stop recording
    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        }
    }, [isRecording]);

    // Cancel and reset
    const handleCancel = useCallback(() => {
        stopCamera();
        if (timerRef.current) clearInterval(timerRef.current);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        onCancel();
    }, [stopCamera, previewUrl, onCancel]);

    // Send recorded video
    const handleSend = useCallback(() => {
        if (recordedBlob) {
            onRecordingComplete(recordedBlob, duration);
        }
    }, [recordedBlob, duration, onRecordingComplete]);

    // Reset to record again
    const handleRetake = useCallback(() => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setRecordedBlob(null);
        setHasRecorded(false);
        setDuration(0);
        startCamera();
    }, [previewUrl, startCamera]);

    // Initialize camera on mount
    useEffect(() => {
        startCamera();
        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [facingMode]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <m.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
        >
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                <button onClick={handleCancel} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                    <X className="w-5 h-5 text-white" />
                </button>

                <div className={cn(
                    "px-4 py-2 rounded-full flex items-center gap-2",
                    isRecording ? "bg-red-500/20 border border-red-500/30" : "bg-white/10"
                )}>
                    {isRecording && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    <Clock className="w-4 h-4 text-white" />
                    <span className="text-white font-mono text-sm">{formatTime(duration)}</span>
                    <span className="text-white/50 text-xs">/ {formatTime(maxDuration)}</span>
                </div>

                {!hasRecorded && (
                    <button onClick={switchCamera} className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                        <SwitchCamera className="w-5 h-5 text-white" />
                    </button>
                )}
            </div>

            {/* Video Preview */}
            <div className="flex-1 relative">
                {!hasRecorded ? (
                    <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className={cn(
                            "w-full h-full object-cover",
                            facingMode === 'user' && "scale-x-[-1]"
                        )}
                    />
                ) : (
                    <video
                        ref={previewVideoRef}
                        src={previewUrl || undefined}
                        controls
                        autoPlay
                        loop
                        className="w-full h-full object-contain bg-black"
                    />
                )}
            </div>

            {/* Controls */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-6 pb-10 flex items-center justify-center gap-6 bg-gradient-to-t from-black/80 to-transparent">
                {!hasRecorded ? (
                    <>
                        <Button
                            size="lg"
                            onClick={isRecording ? stopRecording : startRecording}
                            className={cn(
                                "w-20 h-20 rounded-full",
                                isRecording
                                    ? "bg-red-500 hover:bg-red-600 ring-4 ring-red-500/30"
                                    : "bg-white hover:bg-white/90"
                            )}
                        >
                            {isRecording ? (
                                <Square className="w-8 h-8 text-white fill-white" />
                            ) : (
                                <Video className="w-8 h-8 text-black" />
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        <Button
                            variant="ghost"
                            onClick={handleRetake}
                            className="h-12 px-6 bg-white/10 text-white rounded-full"
                        >
                            Retake
                        </Button>
                        <Button
                            onClick={handleSend}
                            className="h-14 px-8 bg-primary text-white rounded-full font-bold"
                        >
                            <Send className="w-5 h-5 mr-2" />
                            Send
                        </Button>
                    </>
                )}
            </div>
        </m.div>
    );
}

export default VideoRecorder;
