import { useState, useCallback } from 'react';
import { api } from '@/api/client';

export interface MediaAttachment {
    type: 'image' | 'video' | 'file' | 'voice';
    url: string;
    name?: string;
    duration?: number;
    size?: number;
}

interface UploadProgress {
    loaded: number;
    total: number;
    percentage: number;
}

interface UseMediaUploadReturn {
    uploadMedia: (file: File, type?: MediaAttachment['type']) => Promise<MediaAttachment>;
    uploadMultiple: (files: File[]) => Promise<MediaAttachment[]>;
    isUploading: boolean;
    progress: UploadProgress | null;
    error: string | null;
    reset: () => void;
}

/**
 * Determine file type from MIME type
 */
const getMediaType = (file: File): MediaAttachment['type'] => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'voice';
    return 'file';
};

/**
 * Get video duration from file
 */
const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            resolve(Math.round(video.duration));
        };
        video.onerror = () => resolve(0);
        video.src = URL.createObjectURL(file);
    });
};

/**
 * Get audio duration from file
 */
const getAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            window.URL.revokeObjectURL(audio.src);
            resolve(Math.round(audio.duration));
        };
        audio.onerror = () => resolve(0);
        audio.src = URL.createObjectURL(file);
    });
};

/**
 * Compress image for faster upload
 * Resizes to max 1920px and compresses to 80% JPEG quality
 */
const compressImage = async (file: File): Promise<File> => {
    // Skip if not an image or already small (<100KB)
    if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
        return file;
    }

    return new Promise((resolve) => {
        const img = document.createElement('img') as HTMLImageElement;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Max dimensions for upload (1920px max width/height)
            const maxSize = 1920;
            let { width, height } = img;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height = (height / width) * maxSize;
                    width = maxSize;
                } else {
                    width = (width / height) * maxSize;
                    height = maxSize;
                }
            }

            canvas.width = width;
            canvas.height = height;
            ctx?.drawImage(img, 0, 0, width, height);

            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        console.log(`📦 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                        resolve(compressedFile);
                    } else {
                        resolve(file);
                    }
                },
                'image/jpeg',
                0.8 // 80% quality for good balance
            );
        };
        img.onerror = () => resolve(file);
        img.src = URL.createObjectURL(file);
    });
};

/**
 * Compress video for faster upload
 * Reduces resolution to 720p max and re-encodes at lower bitrate
 * Can reduce file size by 50-80% for HD videos
 */
const compressVideo = async (
    file: File,
    onProgress?: (progress: number) => void
): Promise<File> => {
    // Skip if not a video or already small (<2MB)
    if (!file.type.startsWith('video/') || file.size < 2 * 1024 * 1024) {
        return file;
    }

    console.log(`🎬 Compressing video: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
    onProgress?.(5);

    return new Promise((resolve) => {
        const video = document.createElement('video');
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            try {
                // Calculate target resolution (max 720p)
                const maxHeight = 720;
                let { videoWidth: width, videoHeight: height } = video;

                if (height > maxHeight) {
                    width = Math.round((width / height) * maxHeight);
                    height = maxHeight;
                }

                // Ensure even dimensions (required for many codecs)
                width = Math.round(width / 2) * 2;
                height = Math.round(height / 2) * 2;

                console.log(`   📐 Resizing: ${video.videoWidth}x${video.videoHeight} → ${width}x${height}`);
                onProgress?.(10);

                // Create canvas for frame processing
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d')!;

                // Use MediaRecorder to re-encode
                const stream = canvas.captureStream(30); // 30fps

                // IMPORTANT: Unmute video for audio capture
                video.muted = false;
                video.volume = 0.01; // Very low volume to avoid playback noise

                // Capture audio from the video element using Web Audio API
                let audioCtx: AudioContext | null = null;
                try {
                    audioCtx = new AudioContext();
                    const source = audioCtx.createMediaElementSource(video);
                    const dest = audioCtx.createMediaStreamDestination();

                    // Connect source to both destination (for recording) and speakers (muted)
                    const gainNode = audioCtx.createGain();
                    gainNode.gain.value = 0; // Mute playback output

                    source.connect(dest); // For recording
                    source.connect(gainNode);
                    gainNode.connect(audioCtx.destination);

                    // Add audio tracks to the stream
                    const audioTracks = dest.stream.getAudioTracks();
                    if (audioTracks.length > 0) {
                        audioTracks.forEach(track => stream.addTrack(track));
                        console.log('   🔊 Audio track captured successfully');
                    } else {
                        console.log('   ⚠️ No audio tracks available');
                    }
                } catch (audioErr) {
                    console.log('   ⚠️ Audio capture failed (video may be silent):', audioErr);
                }

                // Choose codec - prefer VP9 for smaller files, fallback to VP8/H264
                const mimeTypes = [
                    'video/webm;codecs=vp9',
                    'video/webm;codecs=vp8',
                    'video/webm',
                    'video/mp4'
                ];

                let selectedMime = 'video/webm';
                for (const mime of mimeTypes) {
                    if (MediaRecorder.isTypeSupported(mime)) {
                        selectedMime = mime;
                        break;
                    }
                }

                // Lower bitrate for compression (1.5 Mbps for 720p)
                const videoBitrate = height >= 720 ? 1500000 : 1000000;

                const recorder = new MediaRecorder(stream, {
                    mimeType: selectedMime,
                    videoBitsPerSecond: videoBitrate
                });

                const chunks: Blob[] = [];
                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0) chunks.push(e.data);
                };

                recorder.onstop = () => {
                    const blob = new Blob(chunks, { type: selectedMime });
                    const ext = selectedMime.includes('webm') ? 'webm' : 'mp4';
                    const compressedFile = new File(
                        [blob],
                        file.name.replace(/\.[^.]+$/, `.${ext}`),
                        { type: selectedMime, lastModified: Date.now() }
                    );

                    const reduction = ((file.size - compressedFile.size) / file.size * 100).toFixed(0);
                    console.log(`✅ Video compressed: ${(file.size / (1024 * 1024)).toFixed(1)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB (-${reduction}%)`);
                    onProgress?.(100);

                    // Cleanup
                    URL.revokeObjectURL(video.src);
                    resolve(compressedFile);
                };

                recorder.onerror = () => {
                    console.log('   ⚠️ MediaRecorder failed, using original');
                    resolve(file);
                };

                recorder.start(100); // Collect data every 100ms

                // Play video and draw to canvas
                video.currentTime = 0;
                await video.play();

                const duration = video.duration;
                let lastProgress = 10;

                const drawFrame = () => {
                    if (video.paused || video.ended) {
                        recorder.stop();
                        return;
                    }

                    ctx.drawImage(video, 0, 0, width, height);

                    // Update progress
                    const progress = 10 + (video.currentTime / duration) * 85;
                    if (progress - lastProgress >= 5) {
                        onProgress?.(Math.round(progress));
                        lastProgress = progress;
                    }

                    requestAnimationFrame(drawFrame);
                };

                drawFrame();

                // Stop when video ends
                video.onended = () => {
                    recorder.stop();
                };

            } catch (err) {
                console.log('   ⚠️ Video compression failed:', err);
                resolve(file); // Fallback to original
            }
        };

        video.onerror = () => {
            console.log('   ⚠️ Video load failed, using original');
            resolve(file);
        };

        video.src = URL.createObjectURL(file);
        video.load();
    });
};

/**
 * Hook for uploading media to Cloudinary via signed upload
 */
export function useMediaUpload(): UseMediaUploadReturn {
    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState<UploadProgress | null>(null);
    const [error, setError] = useState<string | null>(null);

    const reset = useCallback(() => {
        setIsUploading(false);
        setProgress(null);
        setError(null);
    }, []);

    const uploadMedia = useCallback(async (
        file: File,
        type?: MediaAttachment['type']
    ): Promise<MediaAttachment> => {
        setIsUploading(true);
        setProgress({ loaded: 0, total: file.size, percentage: 0 });
        setError(null);

        try {
            // Compress images AND videos before upload for faster transfer
            let processedFile = await compressImage(file);

            // Also compress videos (reduces 50-80% file size)
            if (file.type.startsWith('video/')) {
                processedFile = await compressVideo(file, (progress) => {
                    setProgress({ loaded: 0, total: file.size, percentage: progress });
                });
            }

            const mediaType = type || getMediaType(processedFile);

            // Validate file size (after compression)
            const maxSize = mediaType === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
            if (processedFile.size > maxSize) {
                throw new Error(`File too large. Max size: ${maxSize / (1024 * 1024)}MB`);
            }

            // Validate video duration
            if (mediaType === 'video') {
                const duration = await getVideoDuration(processedFile);
                if (duration > 60) {
                    throw new Error('Video must be 60 seconds or less');
                }
            }

            // Step 1: Get signed upload params from backend
            const signatureResponse = await api.post<{
                success: boolean;
                data: {
                    signature: string;
                    timestamp: number;
                    cloudName: string;
                    apiKey: string;
                    folder: string;
                };
            }>('/media/upload-url', {
                folder: 'chat-media',
            });

            const { signature, timestamp, cloudName, apiKey, folder } = signatureResponse.data;

            // Step 2: Upload to Cloudinary
            const formData = new FormData();
            formData.append('file', processedFile);
            formData.append('signature', signature);
            formData.append('timestamp', timestamp.toString());
            formData.append('api_key', apiKey);
            formData.append('folder', folder);

            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${mediaType === 'video' || mediaType === 'voice' ? 'video' : 'auto'}/upload`;

            const xhr = new XMLHttpRequest();

            const uploadPromise = new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const percentage = Math.round((event.loaded / event.total) * 100);
                        setProgress({
                            loaded: event.loaded,
                            total: event.total,
                            percentage,
                        });
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve(JSON.parse(xhr.responseText));
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.open('POST', uploadUrl);
                xhr.send(formData);
            });

            const cloudinaryResponse = await uploadPromise;

            // Get duration for audio/video
            let duration: number | undefined;
            if (mediaType === 'video') {
                duration = await getVideoDuration(file);
            } else if (mediaType === 'voice') {
                duration = await getAudioDuration(file);
            }

            const attachment: MediaAttachment = {
                type: mediaType,
                url: cloudinaryResponse.secure_url,
                name: processedFile.name,
                duration,
                size: processedFile.size,
            };

            setIsUploading(false);
            setProgress(null);

            return attachment;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Upload failed';
            setError(message);
            setIsUploading(false);
            throw err;
        }
    }, []);

    const uploadMultiple = useCallback(async (files: File[]): Promise<MediaAttachment[]> => {
        // Upload all files in PARALLEL for faster performance
        const uploadPromises = files.map(file => uploadMedia(file));
        const results = await Promise.all(uploadPromises);
        return results;
    }, [uploadMedia]);

    return {
        uploadMedia,
        uploadMultiple,
        isUploading,
        progress,
        error,
        reset,
    };
}

export default useMediaUpload;
