/**
 * MediaUploader - Reusable component for uploading images/videos with local preview
 * Uses useDirectUpload hook for Cloudinary integration
 */

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, Image, Video, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useDirectUpload, UploadResult } from '@/hooks/useDirectUpload';
import { cn } from '@/lib/utils';
import styles from './MediaUploader.module.css';

interface MediaUploaderProps {
    type: 'image' | 'video' | 'both';
    multiple?: boolean;
    maxFiles?: number;
    value?: MediaFile[];
    onChange: (files: MediaFile[]) => void;
    folder?: string;
    placeholder?: string;
    aspectRatio?: 'square' | '16:9' | '4:3' | 'free';
    maxSizeMB?: number;
    className?: string;
}

export interface MediaFile {
    id: string;
    url: string;
    publicId?: string;
    preview?: string;
    width?: number;
    height?: number;
    duration?: number;
    thumbnailUrl?: string;
    file?: File;
    status: 'pending' | 'uploading' | 'done' | 'error';
    progress?: number;
    error?: string;
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
    type = 'image',
    multiple = false,
    maxFiles = 10,
    value = [],
    onChange,
    folder = 'truevibe/projects',
    placeholder = 'Drop files here or click to upload',
    aspectRatio = 'free',
    maxSizeMB = 10,
    className,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const { uploadSingle, isUploading, progress } = useDirectUpload({
        folder,
        maxSizeMB,
        maxWidthOrHeight: 2048,
    });

    // Generate unique ID
    const generateId = () => `media-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Get accept types for input
    const getAcceptTypes = () => {
        if (type === 'image') return 'image/*';
        if (type === 'video') return 'video/*';
        return 'image/*,video/*';
    };

    // Handle file selection
    const handleFiles = useCallback(async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        const availableSlots = multiple ? maxFiles - value.length : 1;
        const filesToProcess = fileArray.slice(0, availableSlots);

        // Create pending entries with local previews
        const pendingFiles: MediaFile[] = filesToProcess.map((file) => ({
            id: generateId(),
            url: '',
            preview: URL.createObjectURL(file),
            file,
            status: 'pending' as const,
            progress: 0,
        }));

        // Update state with pending files
        const newValue = multiple ? [...value, ...pendingFiles] : pendingFiles;
        onChange(newValue);

        // Upload each file
        for (const pendingFile of pendingFiles) {
            if (!pendingFile.file) continue;

            try {
                // Update to uploading status
                onChange((prev) =>
                    prev.map((f) =>
                        f.id === pendingFile.id
                            ? { ...f, status: 'uploading' as const }
                            : f
                    )
                );

                // Upload to Cloudinary
                const result: UploadResult = await uploadSingle(pendingFile.file);

                // Update with final URL
                onChange((prev) =>
                    prev.map((f) =>
                        f.id === pendingFile.id
                            ? {
                                ...f,
                                url: result.secureUrl,
                                publicId: result.publicId,
                                width: result.width,
                                height: result.height,
                                duration: result.duration,
                                thumbnailUrl: result.thumbnailUrl,
                                status: 'done' as const,
                                progress: 100,
                            }
                            : f
                    )
                );
            } catch (error) {
                console.error('Upload failed:', error);
                onChange((prev) =>
                    prev.map((f) =>
                        f.id === pendingFile.id
                            ? { ...f, status: 'error' as const, error: 'Upload failed' }
                            : f
                    )
                );
            }
        }
    }, [value, multiple, maxFiles, onChange, uploadSingle]);

    // Drag and drop handlers
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);

    // Remove file
    const removeFile = useCallback((id: string) => {
        const fileToRemove = value.find((f) => f.id === id);
        if (fileToRemove?.preview) {
            URL.revokeObjectURL(fileToRemove.preview);
        }
        onChange(value.filter((f) => f.id !== id));
    }, [value, onChange]);

    // Click to upload
    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const canAddMore = multiple ? value.length < maxFiles : value.length === 0;

    return (
        <div className={cn(styles.container, className)}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept={getAcceptTypes()}
                multiple={multiple}
                onChange={(e) => e.target.files && handleFiles(e.target.files)}
                className={styles.hiddenInput}
            />

            {/* Uploaded files preview */}
            <AnimatePresence mode="popLayout">
                {value.length > 0 && (
                    <div className={cn(styles.previewGrid, {
                        [styles.gridSquare]: aspectRatio === 'square',
                        [styles.grid16x9]: aspectRatio === '16:9',
                    })}>
                        {value.map((file) => (
                            <motion.div
                                key={file.id}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={styles.previewItem}
                            >
                                {/* Preview image/video */}
                                {file.file?.type.startsWith('video/') || file.url.includes('/video/') ? (
                                    <video
                                        src={file.preview || file.url}
                                        className={styles.previewMedia}
                                        controls
                                    />
                                ) : (
                                    <img
                                        src={file.preview || file.url}
                                        alt="Preview"
                                        className={styles.previewMedia}
                                    />
                                )}

                                {/* Status overlay */}
                                {file.status !== 'done' && (
                                    <div className={styles.statusOverlay}>
                                        {file.status === 'uploading' && (
                                            <>
                                                <Loader2 className={styles.spinner} />
                                                <span className={styles.progressText}>
                                                    {file.progress || progress}%
                                                </span>
                                            </>
                                        )}
                                        {file.status === 'error' && (
                                            <AlertCircle className={styles.errorIcon} />
                                        )}
                                    </div>
                                )}

                                {/* Success indicator */}
                                {file.status === 'done' && (
                                    <div className={styles.successBadge}>
                                        <CheckCircle size={16} />
                                    </div>
                                )}

                                {/* Remove button */}
                                <button
                                    type="button"
                                    onClick={() => removeFile(file.id)}
                                    className={styles.removeButton}
                                >
                                    <X size={14} />
                                </button>
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>

            {/* Upload zone */}
            {canAddMore && (
                <motion.div
                    className={cn(styles.dropzone, {
                        [styles.dragging]: isDragging,
                        [styles.compact]: value.length > 0,
                    })}
                    onClick={handleClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                >
                    <div className={styles.dropzoneContent}>
                        {type === 'video' ? (
                            <Video className={styles.dropzoneIcon} />
                        ) : type === 'image' ? (
                            <Image className={styles.dropzoneIcon} />
                        ) : (
                            <Upload className={styles.dropzoneIcon} />
                        )}
                        <span className={styles.dropzoneText}>{placeholder}</span>
                        {multiple && (
                            <span className={styles.dropzoneHint}>
                                {value.length}/{maxFiles} files
                            </span>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default MediaUploader;
