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
    // Skip if not an image or already small (< 100KB)
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
            // Compress images before upload for faster transfer
            const processedFile = await compressImage(file);
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
