/**
 * useDirectUpload - Ultra-fast direct-to-Cloudinary upload hook
 * 
 * Bypasses backend entirely for 10x faster uploads:
 * - Browser compresses image → uploads directly to Cloudinary
 * - Uses unsigned preset (no signature required)
 * - Shows instant preview while uploading in background
 */

import { useState, useCallback } from 'react';
import imageCompression from 'browser-image-compression';

// Cloudinary configuration - using unsigned preset for direct upload
// IMPORTANT: Must match backend cloud name (CLOUDINARY_CLOUD_NAME env var)
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dbqmh24nd';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'truevibe_unsigned';

interface UploadResult {
    publicId: string;
    url: string;
    secureUrl: string;
    width: number;
    height: number;
    format: string;
    bytes: number;
    duration?: number;
    thumbnailUrl?: string;
}

interface UploadProgress {
    file: File;
    progress: number;
    status: 'compressing' | 'uploading' | 'done' | 'error';
    preview?: string;
    result?: UploadResult;
    error?: string;
}

interface UseDirectUploadOptions {
    folder?: string;
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    onProgress?: (progress: number) => void;
    onComplete?: (result: UploadResult) => void;
    onError?: (error: Error) => void;
}

export function useDirectUpload(options: UseDirectUploadOptions = {}) {
    const {
        folder = 'truevibe/posts',
        maxSizeMB = 1,
        maxWidthOrHeight = 1920,
        onProgress,
        onComplete,
        onError,
    } = options;

    const [isUploading, setIsUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [uploads, setUploads] = useState<UploadProgress[]>([]);

    /**
     * Compress image using browser-image-compression
     * Reduces file size by 60-90% typically
     */
    const compressImage = useCallback(async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/') || file.size < 50 * 1024) {
            return file; // Skip small images or non-images
        }

        try {
            const compressed = await imageCompression(file, {
                maxSizeMB,
                maxWidthOrHeight,
                useWebWorker: true,
                fileType: 'image/webp', // WebP is ~30% smaller than JPEG
                initialQuality: 0.85,
            });

            console.log(`📦 Compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB (${Math.round((1 - compressed.size / file.size) * 100)}% smaller)`);
            return compressed;
        } catch (err) {
            console.warn('Compression failed, using original:', err);
            return file;
        }
    }, [maxSizeMB, maxWidthOrHeight]);

    /**
     * Compress video using Canvas + MediaRecorder
     * Reduces file size by 40-60% typically
     */
    const compressVideo = useCallback(async (file: File): Promise<File> => {
        // Skip small videos (< 5MB) or if browser doesn't support MediaRecorder
        if (file.size < 5 * 1024 * 1024 || !window.MediaRecorder) {
            console.log('🎬 Video too small or MediaRecorder not supported, skipping compression');
            return file;
        }

        try {
            console.log(`🎬 Compressing video: ${(file.size / 1024 / 1024).toFixed(1)}MB...`);

            return new Promise((resolve, _reject) => {
                const video = document.createElement('video');
                video.muted = true;
                video.playsInline = true;

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                video.onloadedmetadata = () => {
                    // Scale down to max 720p for faster upload
                    const scale = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
                    canvas.width = Math.floor(video.videoWidth * scale);
                    canvas.height = Math.floor(video.videoHeight * scale);

                    // Use lower bitrate for compression
                    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
                        ? 'video/webm;codecs=vp9'
                        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
                            ? 'video/webm;codecs=vp8'
                            : 'video/webm';

                    const stream = canvas.captureStream(24); // 24fps
                    const recorder = new MediaRecorder(stream, {
                        mimeType,
                        videoBitsPerSecond: 1000000, // 1Mbps (lower = smaller file)
                    });

                    const chunks: Blob[] = [];
                    recorder.ondataavailable = (e) => chunks.push(e.data);

                    recorder.onstop = () => {
                        const blob = new Blob(chunks, { type: 'video/webm' });
                        const compressed = new File([blob], file.name.replace(/\.[^.]+$/, '.webm'), {
                            type: 'video/webm',
                        });

                        console.log(`🎬 Compressed: ${(file.size / 1024 / 1024).toFixed(1)}MB → ${(compressed.size / 1024 / 1024).toFixed(1)}MB (${Math.round((1 - compressed.size / file.size) * 100)}% smaller)`);

                        // If compression made it bigger, use original
                        if (compressed.size >= file.size * 0.9) {
                            console.log('🎬 Compression ineffective, using original');
                            resolve(file);
                        } else {
                            resolve(compressed);
                        }

                        URL.revokeObjectURL(video.src);
                    };

                    recorder.onerror = () => {
                        console.warn('🎬 Video compression failed, using original');
                        resolve(file);
                    };

                    recorder.start();
                    video.play();

                    // Draw frames to canvas
                    const drawFrame = () => {
                        if (video.ended || video.paused) {
                            recorder.stop();
                            return;
                        }
                        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                        requestAnimationFrame(drawFrame);
                    };
                    drawFrame();
                };

                video.onerror = () => {
                    console.warn('🎬 Could not load video for compression');
                    resolve(file);
                };

                // Set a timeout - don't spend more than 30s compressing
                setTimeout(() => {
                    console.warn('🎬 Compression timeout, using original');
                    resolve(file);
                }, 30000);

                video.src = URL.createObjectURL(file);
            });
        } catch (err) {
            console.warn('🎬 Video compression error:', err);
            return file;
        }
    }, []);

    /**
     * Direct upload to Cloudinary (no backend needed!)
     */
    const uploadDirect = useCallback(async (
        file: File,
        onUploadProgress?: (percent: number) => void
    ): Promise<UploadResult> => {
        const isVideo = file.type.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';

        const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', folder);

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onUploadProgress?.(percent);
                    setProgress(percent);
                    onProgress?.(percent);
                }
            };

            xhr.onload = () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const data = JSON.parse(xhr.responseText);
                        const result: UploadResult = {
                            publicId: data.public_id,
                            url: data.url,
                            secureUrl: data.secure_url,
                            width: data.width,
                            height: data.height,
                            format: data.format,
                            bytes: data.bytes,
                            duration: data.duration,
                            thumbnailUrl: isVideo
                                // Use Cloudinary transformation to get video thumbnail:
                                // Insert 'so_0,f_jpg,w_640,h_360,c_fill/' after '/upload/' to get first frame as JPG
                                ? data.secure_url.replace('/upload/', '/upload/so_0,f_jpg,w_640,h_360,c_fill/')
                                : undefined,
                        };
                        resolve(result);
                    } catch {
                        reject(new Error('Invalid response from Cloudinary'));
                    }
                } else {
                    const errorData = JSON.parse(xhr.responseText || '{}');
                    reject(new Error(errorData.error?.message || `Upload failed: ${xhr.status}`));
                }
            };

            xhr.onerror = () => reject(new Error('Network error during upload'));
            xhr.ontimeout = () => reject(new Error('Upload timed out'));

            xhr.open('POST', uploadUrl);
            xhr.timeout = 300000; // 5 minutes
            xhr.send(formData);
        });
    }, [folder, onProgress]);

    /**
     * Main upload function - compress + direct upload (PARALLEL for speed!)
     */
    const upload = useCallback(async (files: File[]): Promise<UploadResult[]> => {
        setIsUploading(true);
        setProgress(0);
        setUploads([]);

        try {
            // Initialize upload states for all files
            const initialUploads = files.map(file => ({
                file,
                progress: 0,
                status: 'compressing' as const,
                preview: URL.createObjectURL(file),
            }));
            setUploads(initialUploads);

            // Process all files in parallel for maximum speed
            const uploadPromises = files.map(async (file, i) => {
                // Step 1: Compress images and videos
                let processedFile = file;
                if (file.type.startsWith('image/')) {
                    processedFile = await compressImage(file);
                } else if (file.type.startsWith('video/')) {
                    processedFile = await compressVideo(file);
                }

                // Update to uploading status
                setUploads(prev => prev.map((u, idx) =>
                    idx === i ? { ...u, status: 'uploading' as const } : u
                ));

                // Step 2: Direct upload to Cloudinary
                const result = await uploadDirect(processedFile, (percent) => {
                    // Update individual file progress
                    setUploads(prev => {
                        const updated = prev.map((u, idx) =>
                            idx === i ? { ...u, progress: percent } : u
                        );
                        // Calculate overall progress
                        const totalProgress = updated.reduce((sum, u) => sum + u.progress, 0) / files.length;
                        setProgress(Math.round(totalProgress));
                        return updated;
                    });
                });

                // Mark as done
                setUploads(prev => prev.map((u, idx) =>
                    idx === i ? { ...u, status: 'done' as const, result } : u
                ));

                onComplete?.(result);
                return result;
            });

            // Wait for all uploads to complete in parallel
            const results = await Promise.all(uploadPromises);
            return results;
        } catch (err) {
            const error = err as Error;
            onError?.(error);
            throw error;
        } finally {
            setIsUploading(false);
        }
    }, [compressImage, uploadDirect, onComplete, onError]);

    /**
     * Upload a single file (convenience method)
     */
    const uploadSingle = useCallback(async (file: File): Promise<UploadResult> => {
        const results = await upload([file]);
        return results[0];
    }, [upload]);

    /**
     * Get instant preview without waiting for upload
     */
    const getPreview = useCallback((file: File): string => {
        return URL.createObjectURL(file);
    }, []);

    return {
        upload,
        uploadSingle,
        getPreview,
        isUploading,
        progress,
        uploads,
        compressImage, // Exported for manual use
    };
}

export type { UploadResult, UploadProgress };
