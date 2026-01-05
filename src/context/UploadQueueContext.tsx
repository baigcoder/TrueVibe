/**
 * UploadQueueContext - Industrial-grade background upload system
 * 
 * How it works:
 * 1. User creates post → Post appears IMMEDIATELY with "Uploading..." status
 * 2. Video uploads in background while user browses
 * 3. When complete → Post updates to show video
 * 4. On failure → Post shows retry option
 * 
 * Used by Instagram, TikTok, YouTube for perceived instant uploads
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export interface UploadTask {
    id: string;
    postId: string;
    file: File;
    status: 'queued' | 'uploading' | 'processing' | 'complete' | 'failed';
    progress: number;
    error?: string;
    createdAt: number;
    mediaUrl?: string;
    mediaId?: string;
}

interface UploadQueueContextType {
    tasks: UploadTask[];
    addToQueue: (postId: string, file: File) => string;
    retryUpload: (taskId: string) => void;
    cancelUpload: (taskId: string) => void;
    getTaskForPost: (postId: string) => UploadTask | undefined;
    isUploading: boolean;
    activeUploads: number;
}

const UploadQueueContext = createContext<UploadQueueContextType | null>(null);

// Constants
const MAX_CONCURRENT_UPLOADS = 2;
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dbqmh24nd';
const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'truevibe_unsigned';

export function UploadQueueProvider({ children }: { children: React.ReactNode }) {
    const [tasks, setTasks] = useState<UploadTask[]>([]);
    const activeUploadsRef = useRef<Set<string>>(new Set());
    const queryClient = useQueryClient();

    // Process queue - runs when tasks change
    const processQueue = useCallback(async () => {
        const queuedTasks = tasks.filter(t => t.status === 'queued');
        const activeCount = tasks.filter(t => t.status === 'uploading').length;

        // Start more uploads if under limit
        const slotsAvailable = MAX_CONCURRENT_UPLOADS - activeCount;
        const tasksToStart = queuedTasks.slice(0, slotsAvailable);

        for (const task of tasksToStart) {
            if (activeUploadsRef.current.has(task.id)) continue;
            activeUploadsRef.current.add(task.id);
            uploadFile(task);
        }
    }, [tasks]);

    // Upload a single file
    const uploadFile = async (task: UploadTask) => {
        try {
            // Update status to uploading
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: 'uploading' as const, progress: 0 } : t
            ));

            const isVideo = task.file.type.startsWith('video/');
            const resourceType = isVideo ? 'video' : 'image';
            const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

            const formData = new FormData();
            formData.append('file', task.file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            formData.append('folder', 'truevibe/posts');

            // Upload with progress tracking
            const result = await new Promise<any>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        const progress = Math.round((event.loaded / event.total) * 100);
                        setTasks(prev => prev.map(t =>
                            t.id === task.id ? { ...t, progress } : t
                        ));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            resolve(JSON.parse(xhr.responseText));
                        } catch {
                            reject(new Error('Invalid response'));
                        }
                    } else {
                        reject(new Error(`Upload failed: ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error'));
                xhr.ontimeout = () => reject(new Error('Upload timeout'));

                xhr.open('POST', uploadUrl);
                xhr.timeout = 300000; // 5 minutes
                xhr.send(formData);
            });

            // Update status to processing (confirming with backend)
            setTasks(prev => prev.map(t =>
                t.id === task.id ? { ...t, status: 'processing' as const, progress: 100 } : t
            ));

            // Confirm upload with backend
            const confirmResponse = await fetch('/api/media/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    cloudinaryId: result.public_id,
                    url: result.secure_url,
                    type: isVideo ? 'video' : 'image',
                    width: result.width,
                    height: result.height,
                    duration: result.duration,
                    sizeBytes: result.bytes,
                    mimeType: task.file.type,
                    thumbnailUrl: result.thumbnail_url,
                }),
            });

            if (!confirmResponse.ok) {
                throw new Error('Failed to confirm upload');
            }

            const confirmData = await confirmResponse.json();
            const mediaId = confirmData.data?.media?._id;

            // Update post with media ID
            await fetch(`/api/posts/${task.postId}/attach-media`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ mediaIds: [mediaId] }),
            });

            // Mark as complete
            setTasks(prev => prev.map(t =>
                t.id === task.id ? {
                    ...t,
                    status: 'complete' as const,
                    progress: 100,
                    mediaUrl: result.secure_url,
                    mediaId,
                } : t
            ));

            // Invalidate posts query to refresh feed
            queryClient.invalidateQueries({ queryKey: ['posts'] });
            queryClient.invalidateQueries({ queryKey: ['post', task.postId] });

            console.log(`✅ Background upload complete: ${task.file.name}`);

        } catch (error: any) {
            console.error(`❌ Background upload failed:`, error);
            setTasks(prev => prev.map(t =>
                t.id === task.id ? {
                    ...t,
                    status: 'failed' as const,
                    error: error.message || 'Upload failed',
                } : t
            ));
        } finally {
            activeUploadsRef.current.delete(task.id);
        }
    };

    // Add file to queue
    const addToQueue = useCallback((postId: string, file: File): string => {
        const taskId = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        const newTask: UploadTask = {
            id: taskId,
            postId,
            file,
            status: 'queued',
            progress: 0,
            createdAt: Date.now(),
        };

        setTasks(prev => [...prev, newTask]);
        console.log(`📤 Added to upload queue: ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)`);

        return taskId;
    }, []);

    // Retry failed upload
    const retryUpload = useCallback((taskId: string) => {
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, status: 'queued' as const, error: undefined, progress: 0 } : t
        ));
    }, []);

    // Cancel upload
    const cancelUpload = useCallback((taskId: string) => {
        setTasks(prev => prev.filter(t => t.id !== taskId));
    }, []);

    // Get task for a specific post
    const getTaskForPost = useCallback((postId: string): UploadTask | undefined => {
        return tasks.find(t => t.postId === postId);
    }, [tasks]);

    // Process queue when tasks change
    useEffect(() => {
        processQueue();
    }, [tasks.filter(t => t.status === 'queued').length]);

    // Clean up completed tasks after 5 minutes
    useEffect(() => {
        const interval = setInterval(() => {
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            setTasks(prev => prev.filter(t =>
                t.status !== 'complete' || t.createdAt > fiveMinutesAgo
            ));
        }, 60000);

        return () => clearInterval(interval);
    }, []);

    const isUploading = tasks.some(t => t.status === 'uploading' || t.status === 'processing');
    const activeUploads = tasks.filter(t => t.status === 'uploading').length;

    return (
        <UploadQueueContext.Provider value={{
            tasks,
            addToQueue,
            retryUpload,
            cancelUpload,
            getTaskForPost,
            isUploading,
            activeUploads,
        }}>
            {children}
        </UploadQueueContext.Provider>
    );
}

export function useUploadQueue() {
    const context = useContext(UploadQueueContext);
    if (!context) {
        throw new Error('useUploadQueue must be used within UploadQueueProvider');
    }
    return context;
}

export default UploadQueueContext;
