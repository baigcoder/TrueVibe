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
                                ? data.secure_url.replace(/\.[^.]+$/, '.jpg')
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
     * Main upload function - compress + direct upload
     */
    const upload = useCallback(async (files: File[]): Promise<UploadResult[]> => {
        setIsUploading(true);
        setProgress(0);
        setUploads([]);

        const results: UploadResult[] = [];

        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const preview = URL.createObjectURL(file);

                // Update upload state
                setUploads(prev => [...prev, {
                    file,
                    progress: 0,
                    status: 'compressing',
                    preview,
                }]);

                // Step 1: Compress (for images)
                const processedFile = file.type.startsWith('image/')
                    ? await compressImage(file)
                    : file;

                // Update to uploading status
                setUploads(prev => prev.map((u, idx) =>
                    idx === i ? { ...u, status: 'uploading' as const } : u
                ));

                // Step 2: Direct upload to Cloudinary
                const result = await uploadDirect(processedFile, (percent) => {
                    const overallProgress = ((i * 100) + percent) / files.length;
                    setProgress(Math.round(overallProgress));
                    setUploads(prev => prev.map((u, idx) =>
                        idx === i ? { ...u, progress: percent } : u
                    ));
                });

                // Mark as done
                setUploads(prev => prev.map((u, idx) =>
                    idx === i ? { ...u, status: 'done' as const, result } : u
                ));

                results.push(result);
                onComplete?.(result);
            }

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
