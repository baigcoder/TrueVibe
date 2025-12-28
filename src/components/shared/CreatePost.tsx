import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Image, Video, Smile, MapPin, X, Loader2,
    ShieldCheck, Sparkles, Hash, Pencil, BarChart3,
    Calendar, Clock, Save, History, Wand2, Lightbulb, Copy, Check
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCreatePost, useUploadUrl, useConfirmUpload, useSaveDraft, useDeleteDraft } from "@/api/hooks";
import { cn } from "@/lib/utils";
import { ImageEditor } from "./ImageEditor";
import { PollCreator } from "./Poll";
import { format } from "date-fns";
import { DraftsManager } from "./DraftsManager";
import { toast } from "sonner";
import { useAICopilot } from "@/hooks/useAICopilot";
import { useDirectUpload } from "@/hooks/useDirectUpload";

interface CreatePostProps {
    onSuccess?: () => void;
    className?: string;
}

// Expanded emoji palette
const EMOJI_CATEGORIES = {
    "Smileys": ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😋", "😛", "🤔", "🤗", "🤭"],
    "Gestures": ["👍", "👎", "👌", "✌️", "🤞", "🤟", "🤘", "🤙", "👏", "🙌", "👐", "🤲", "🙏", "💪", "🦾", "🖐️", "✋", "👋", "🤚", "🖖"],
    "Hearts": ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❤️‍🔥", "💖", "💗", "💓", "💞", "💕", "💟", "❣️", "💝", "💘"],
    "Objects": ["🔥", "✨", "⭐", "🌟", "💫", "🎉", "🎊", "🎈", "🎁", "🏆", "🥇", "🎯", "💯", "📱", "💻", "🎮", "🎵", "🎶", "☕", "🍕"],
    "Nature": ["🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🪻", "🌱", "🌿", "🍀", "🌳", "🌴", "🌵", "🌾", "🌊", "🌙", "⭐", "☀️", "🌈", "⛈️"],
};

export function CreatePost({ onSuccess, className }: CreatePostProps) {
    const [content, setContent] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filePreviews, setFilePreviews] = useState<{ url: string; type: 'image' | 'video' }[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0); // 0-100 percentage
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showHashtagInput, setShowHashtagInput] = useState(false);
    const [hashtags, setHashtags] = useState<string[]>([]);
    const [hashtagInput, setHashtagInput] = useState("");
    const [showLocationInput, setShowLocationInput] = useState(false);
    const [location, setLocation] = useState("");
    const [activeEmojiCategory, setActiveEmojiCategory] = useState<keyof typeof EMOJI_CATEGORIES>("Smileys");
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const [editingImageIndex, setEditingImageIndex] = useState<number | null>(null);
    const [showPollCreator, setShowPollCreator] = useState(false);
    const [pollData, setPollData] = useState<{ options: { text: string }[]; expiresIn: number; allowMultiple: boolean } | null>(null);
    const [showScheduler, setShowScheduler] = useState(false);
    const [scheduledFor, setScheduledFor] = useState<string | null>(null);
    const [draftId, setDraftId] = useState<string | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [showDraftsManager, setShowDraftsManager] = useState(false);

    // AI Copilot state
    const [showAICopilot, setShowAICopilot] = useState(false);
    const [aiCaptions, setAiCaptions] = useState<string[]>([]);
    const [aiHashtags, setAiHashtags] = useState<{ hashtags: string[]; trending: string[] } | null>(null);
    const [aiIdeas, setAiIdeas] = useState<{ title: string; caption: string; hashtags: string[] }[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [aiTopicInput, setAiTopicInput] = useState("");


    const { user, profile } = useAuth();
    const createPost = useCreatePost();
    const getUploadUrl = useUploadUrl();
    const confirmUpload = useConfirmUpload();
    const saveDraft = useSaveDraft();
    const deleteDraft = useDeleteDraft();

    const {
        generateCaption, isGeneratingCaption,
        suggestHashtags, isGeneratingHashtags,
        generateIdeas, isGeneratingIdeas,
    } = useAICopilot();

    // 🚀 Direct upload hook for 10x faster uploads (bypasses backend!)
    const directUpload = useDirectUpload({
        folder: 'truevibe/posts',
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        onProgress: (p) => setUploadProgress(p),
    });

    // AI Copilot handlers
    const handleGenerateCaption = async () => {
        const context = aiTopicInput.trim() || content.trim() || "social media post";
        const result = await generateCaption(context);
        if (result) {
            setAiCaptions(result.captions);
        }
    };

    const handleSuggestHashtags = async () => {
        const currentContent = content.trim() || aiTopicInput.trim() || "trending content";
        const result = await suggestHashtags(currentContent);
        if (result) {
            setAiHashtags({ hashtags: result.hashtags, trending: result.trending });
        }
    };

    const handleGenerateIdeas = async () => {
        const topic = aiTopicInput.trim() || "lifestyle";
        const result = await generateIdeas(topic, "trendy");
        if (result) {
            setAiIdeas(result.ideas);
        }
    };

    const applyCaption = (caption: string) => {
        setContent(caption);
        toast.success("Caption applied!");
    };

    const applyHashtags = (tags: string[]) => {
        setHashtags(prev => [...new Set([...prev, ...tags])]);
        toast.success(`Added ${tags.length} hashtags!`);
    };

    const applyIdea = (idea: { caption: string; hashtags: string[] }) => {
        setContent(idea.caption);
        setHashtags(prev => [...new Set([...prev, ...idea.hashtags])]);
        toast.success("Idea applied!");
    };

    const copyToClipboard = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };


    // Compress image before upload for faster transfer
    const compressImage = async (file: File): Promise<File> => {
        // Skip if not an image or already small
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

    // NOTE: Video compression disabled - browser-based compression is too slow for larger videos
    // Cloudinary handles server-side optimization much faster with eager transformations

    // Process file (compress based on type)
    // NOTE: Video compression disabled - browser-based compression is too slow for larger videos
    // Cloudinary handles server-side optimization much faster with eager transformations
    const processFile = async (file: File): Promise<File> => {
        if (file.type.startsWith('image/')) {
            return compressImage(file);
        }
        // Videos upload directly - Cloudinary applies fast server-side compression
        console.log(`📤 Uploading video directly: ${(file.size / 1024 / 1024).toFixed(1)}MB`);
        return file;
    };

    // Parallel chunked upload for large videos (2-3x faster)
    const uploadChunked = async (
        file: File,
        uploadUrl: string,
        apiKey: string,
        timestamp: number,
        signature: string,
        folder: string,
        onProgress: (percent: number) => void
    ): Promise<any> => {
        const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
        const MAX_CONCURRENT = 3; // Upload 3 chunks at once
        const MAX_RETRIES = 2;
        const CHUNK_TIMEOUT = 120000; // 2 minutes per chunk

        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const uniqueUploadId = `uqid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        console.log(`🚀 Parallel upload: ${totalChunks} chunks × ${MAX_CONCURRENT} concurrent, ${(file.size / 1024 / 1024).toFixed(1)}MB`);

        // Track progress for each chunk
        const chunkProgress: number[] = new Array(totalChunks).fill(0);
        const updateTotalProgress = () => {
            const totalBytes = chunkProgress.reduce((sum, bytes) => sum + bytes, 0);
            onProgress(Math.round((totalBytes / file.size) * 100));
        };

        // Upload a single chunk with retry
        const uploadChunk = async (chunkIndex: number): Promise<any> => {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);
            const chunkSize = end - start;
            const contentRange = `bytes ${start}-${end - 1}/${file.size}`;

            for (let retry = 0; retry <= MAX_RETRIES; retry++) {
                try {
                    const formData = new FormData();
                    formData.append('file', chunk);
                    formData.append('api_key', apiKey);
                    formData.append('timestamp', timestamp.toString());
                    formData.append('signature', signature);
                    formData.append('folder', folder);
                    formData.append('unique_upload_id', uniqueUploadId);

                    const response = await new Promise<any>((resolve, reject) => {
                        const xhr = new XMLHttpRequest();

                        xhr.upload.onprogress = (event) => {
                            if (event.lengthComputable) {
                                chunkProgress[chunkIndex] = event.loaded;
                                updateTotalProgress();
                            }
                        };

                        xhr.onload = () => {
                            if (xhr.status >= 200 && xhr.status < 300) {
                                chunkProgress[chunkIndex] = chunkSize; // Mark complete
                                updateTotalProgress();
                                try {
                                    resolve(JSON.parse(xhr.responseText));
                                } catch {
                                    reject(new Error('Invalid JSON'));
                                }
                            } else {
                                reject(new Error(`HTTP ${xhr.status}`));
                            }
                        };

                        xhr.onerror = () => reject(new Error('Network error'));
                        xhr.ontimeout = () => reject(new Error('Timeout'));

                        xhr.open('POST', uploadUrl);
                        xhr.setRequestHeader('X-Unique-Upload-Id', uniqueUploadId);
                        xhr.setRequestHeader('Content-Range', contentRange);
                        xhr.timeout = CHUNK_TIMEOUT;
                        xhr.send(formData);
                    });

                    console.log(`📦 Chunk ${chunkIndex + 1}/${totalChunks} ✓`);
                    return response;

                } catch (error: any) {
                    if (retry < MAX_RETRIES) {
                        console.warn(`⚠️ Chunk ${chunkIndex + 1} retry ${retry + 1}/${MAX_RETRIES}`);
                        await new Promise(r => setTimeout(r, 1000 * (retry + 1)));
                    } else {
                        throw error;
                    }
                }
            }
        };

        // Process chunks with limited concurrency
        const results: any[] = [];
        const queue = Array.from({ length: totalChunks }, (_, i) => i);
        const inProgress = new Set<Promise<void>>();

        while (queue.length > 0 || inProgress.size > 0) {
            // Start new uploads up to MAX_CONCURRENT
            while (queue.length > 0 && inProgress.size < MAX_CONCURRENT) {
                const chunkIndex = queue.shift()!;
                const promise = uploadChunk(chunkIndex)
                    .then(res => { results[chunkIndex] = res; })
                    .finally(() => inProgress.delete(promise));
                inProgress.add(promise);
            }

            // Wait for at least one to complete
            if (inProgress.size > 0) {
                await Promise.race(inProgress);
            }
        }

        console.log('✅ Parallel upload complete!');

        // Return the last chunk's response (contains final file info)
        return results[totalChunks - 1] || results.find(r => r?.public_id);
    };

    // Upload a single file to Cloudinary with progress tracking
    const uploadToCloudinary = async (file: File, fileIndex: number = 0, totalFiles: number = 1): Promise<string | null> => {
        try {
            // Compress images AND videos before upload
            const processedFile = await processFile(file);

            const isVideo = processedFile.type.startsWith('video/');
            const uploadUrlRes = await getUploadUrl.mutateAsync('posts');
            const { uploadUrl, apiKey, timestamp, signature, folder, eager } = (uploadUrlRes as { data: { uploadUrl: string; apiKey: string; timestamp: number; signature: string; folder: string; eager?: string } }).data;

            let cloudData: any;

            // Use chunked upload for large videos (>10MB)
            const CHUNKED_THRESHOLD = 10 * 1024 * 1024; // 10MB

            if (isVideo && processedFile.size > CHUNKED_THRESHOLD) {
                console.log(`🎬 Large video detected (${(processedFile.size / 1024 / 1024).toFixed(1)}MB), using chunked upload...`);

                cloudData = await uploadChunked(
                    processedFile,
                    uploadUrl,
                    apiKey,
                    timestamp,
                    signature,
                    folder,
                    (progress) => {
                        const overallProgress = ((fileIndex * 100) + progress) / totalFiles;
                        setUploadProgress(Math.round(overallProgress));
                    }
                );
            } else {
                // Regular upload for images and small videos
                const formData = new FormData();
                formData.append('file', processedFile);
                formData.append('api_key', apiKey);
                formData.append('timestamp', timestamp.toString());
                formData.append('signature', signature);
                formData.append('folder', folder);

                // Only include eager transforms for images (they fail for videos)
                if (eager && !isVideo) {
                    formData.append('eager', eager);
                }

                // Use XMLHttpRequest for progress tracking
                cloudData = await new Promise<any>((resolve, reject) => {
                    const xhr = new XMLHttpRequest();

                    xhr.upload.onprogress = (event) => {
                        if (event.lengthComputable) {
                            // Calculate progress for current file + previous files
                            const fileProgress = (event.loaded / event.total) * 100;
                            const overallProgress = ((fileIndex * 100) + fileProgress) / totalFiles;
                            setUploadProgress(Math.round(overallProgress));
                        }
                    };

                    xhr.onload = () => {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            try {
                                resolve(JSON.parse(xhr.responseText));
                            } catch {
                                reject(new Error('Invalid JSON response'));
                            }
                        } else {
                            console.error('Cloudinary error:', xhr.status, xhr.responseText);
                            reject(new Error(`Upload failed: ${xhr.statusText}`));
                        }
                    };

                    xhr.onerror = () => reject(new Error('Network error during upload'));
                    xhr.ontimeout = () => reject(new Error('Upload timed out'));

                    xhr.open('POST', uploadUrl);
                    xhr.timeout = 300000; // 5 minute timeout for large videos
                    xhr.send(formData);
                });
            }

            if (!cloudData.public_id) throw new Error('Upload failed: No public_id');

            const type = processedFile.type.startsWith('video/') ? 'video' : 'image';
            const confirmRes = await confirmUpload.mutateAsync({
                cloudinaryId: cloudData.public_id,
                url: cloudData.secure_url,
                type,
                width: cloudData.width,
                height: cloudData.height,
                duration: cloudData.duration,
                sizeBytes: cloudData.bytes,
                mimeType: processedFile.type,
                thumbnailUrl: cloudData.thumbnail_url,
            });

            return (confirmRes as { data: { media: { _id: string } } }).data.media._id;
        } catch (error) {
            console.error('Upload error:', error);
            return null;
        }
    };

    // Auto-save draft logic
    useEffect(() => {
        if (!isExpanded || !content.trim() || createPost.isPending) return;

        const timer = setTimeout(async () => {
            try {
                setIsSavingDraft(true);
                const res = await saveDraft.mutateAsync({
                    draftId: draftId || undefined,
                    content,
                    poll: pollData,
                    hashtags,
                    visibility: 'public',
                    autoSaved: true,
                    scheduledFor: scheduledFor || undefined,
                });

                if ((res as any).data?.draft?._id) {
                    setDraftId((res as any).data.draft._id);
                }
            } catch (error) {
                console.error("Auto-save failed:", error);
            } finally {
                setIsSavingDraft(false);
            }
        }, 3000); // 3 second debounce

        return () => clearTimeout(timer);
    }, [content, pollData, hashtags, scheduledFor, isExpanded]);

    const handleSubmit = async () => {
        if (!content.trim() && selectedFiles.length === 0) return;

        try {
            setIsUploading(true);
            setUploadProgress(0);

            // 🚀 FAST PATH: Direct upload for images (bypasses backend = 10x faster)
            // Videos still use signed upload (needed for AI analysis queue)
            const mediaIds: string[] = [];
            const totalFiles = selectedFiles.length;

            const imageFiles = selectedFiles.filter(f => f.type.startsWith('image/'));
            const videoFiles = selectedFiles.filter(f => f.type.startsWith('video/'));

            // Upload images directly to Cloudinary (FAST!)
            if (imageFiles.length > 0) {
                console.log(`🚀 Direct uploading ${imageFiles.length} image(s)...`);
                try {
                    const results = await directUpload.upload(imageFiles);
                    for (const result of results) {
                        // Confirm with backend to get mediaId for DB
                        const confirmRes = await confirmUpload.mutateAsync({
                            cloudinaryId: result.publicId,
                            url: result.secureUrl,
                            type: 'image',
                            width: result.width,
                            height: result.height,
                            sizeBytes: result.bytes,
                            mimeType: `image/${result.format}`,
                        });
                        const mediaId = (confirmRes as { data: { media: { _id: string } } }).data.media._id;
                        mediaIds.push(mediaId);
                    }
                    console.log(`✅ Direct upload complete: ${results.length} images`);
                } catch (directErr) {
                    console.warn('⚠️ Direct upload failed, falling back to signed upload');
                    // Fallback to signed upload
                    for (let i = 0; i < imageFiles.length; i++) {
                        const result = await uploadToCloudinary(imageFiles[i], i, totalFiles);
                        if (result) mediaIds.push(result);
                    }
                }
            }

            // 🚀 FAST PATH: Direct upload for videos too (bypasses backend signature!)
            // Only use chunked upload for very large videos (>50MB)
            const LARGE_VIDEO_THRESHOLD = 50 * 1024 * 1024; // 50MB

            if (videoFiles.length > 0) {
                const smallVideos = videoFiles.filter(f => f.size <= LARGE_VIDEO_THRESHOLD);
                const largeVideos = videoFiles.filter(f => f.size > LARGE_VIDEO_THRESHOLD);

                // Direct upload for small/medium videos (FAST!)
                if (smallVideos.length > 0) {
                    console.log(`🚀 Direct uploading ${smallVideos.length} video(s)...`);
                    try {
                        const results = await directUpload.upload(smallVideos);
                        for (const result of results) {
                            // Confirm with backend to get mediaId + queue AI analysis
                            const confirmRes = await confirmUpload.mutateAsync({
                                cloudinaryId: result.publicId,
                                url: result.secureUrl,
                                type: 'video',
                                width: result.width,
                                height: result.height,
                                duration: result.duration,
                                sizeBytes: result.bytes,
                                mimeType: `video/${result.format}`,
                                thumbnailUrl: result.thumbnailUrl,
                            });
                            const mediaId = (confirmRes as { data: { media: { _id: string } } }).data.media._id;
                            mediaIds.push(mediaId);
                        }
                        console.log(`✅ Direct upload complete: ${results.length} videos`);
                    } catch (directErr) {
                        console.warn('⚠️ Video direct upload failed, falling back to signed upload');
                        for (let i = 0; i < smallVideos.length; i++) {
                            const result = await uploadToCloudinary(smallVideos[i], imageFiles.length + i, totalFiles);
                            if (result) mediaIds.push(result);
                        }
                    }
                }

                // Chunked upload for large videos (>50MB) - more reliable
                for (let i = 0; i < largeVideos.length; i++) {
                    console.log(`🎬 Chunked upload for large video ${i + 1}/${largeVideos.length} (${(largeVideos[i].size / 1024 / 1024).toFixed(1)}MB)...`);
                    const result = await uploadToCloudinary(largeVideos[i], imageFiles.length + smallVideos.length + i, totalFiles);
                    if (result) {
                        mediaIds.push(result);
                    }
                }
            }

            let finalContent = content.trim();
            if (hashtags.length > 0) {
                finalContent += '\n' + hashtags.map(t => `#${t}`).join(' ');
            }
            if (location) {
                finalContent += `\n📍 ${location}`;
            }

            if (scheduledFor) {
                await saveDraft.mutateAsync({
                    draftId: draftId || undefined,
                    content: finalContent,
                    mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
                    poll: pollData,
                    hashtags,
                    visibility: 'public',
                    autoSaved: false,
                    scheduledFor,
                });
            } else {
                await createPost.mutateAsync({
                    content: finalContent,
                    mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
                });

                if (draftId) {
                    await deleteDraft.mutateAsync(draftId);
                }
            }

            setContent("");
            setSelectedFiles([]);
            setFilePreviews([]);
            setIsExpanded(false);
            setHashtags([]);
            setLocation("");
            setScheduledFor(null);
            setShowScheduler(false);
            setPollData(null);
            setShowPollCreator(false);
            setDraftId(null);
            setShowEmojiPicker(false);
            onSuccess?.();

            // Clean up object URLs
            filePreviews.forEach(p => URL.revokeObjectURL(p.url));
        } catch (error) {
            console.error("Failed to create post:", error);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const handleManualSave = async () => {
        if (!content.trim() && selectedFiles.length === 0) return;
        try {
            setIsSavingDraft(true);
            let mediaIds: string[] = [];
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(file => uploadToCloudinary(file));
                const results = await Promise.all(uploadPromises);
                mediaIds = results.filter((id): id is string => id !== null);
            }

            const res = await saveDraft.mutateAsync({
                draftId: draftId || undefined,
                content,
                mediaIds: mediaIds.length > 0 ? mediaIds : undefined,
                poll: pollData,
                hashtags,
                visibility: 'public',
                autoSaved: false,
                scheduledFor: scheduledFor || undefined,
            });

            if ((res as any).data?.draft?._id) {
                setDraftId((res as any).data.draft._id);
            }
            // Reset after manual save might be too aggressive, maybe just show toast
        } catch (error) {
            console.error("Manual save failed:", error);
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        const maxAllowed = 4 - selectedFiles.length;
        const newFiles = files.slice(0, maxAllowed);

        setSelectedFiles(prev => [...prev, ...newFiles]);

        // Use URL.createObjectURL for better performance with local previews
        const newPreviews = newFiles.map(file => ({
            url: URL.createObjectURL(file),
            type: 'image' as const
        }));
        setFilePreviews(prev => [...prev, ...newPreviews]);
        setIsExpanded(true);
    };

    const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || selectedFiles.length > 0) return;

        const file = files[0];
        setSelectedFiles([file]);

        const previewUrl = URL.createObjectURL(file);
        setFilePreviews([{ url: previewUrl, type: 'video' }]);
        setIsExpanded(true);
    };

    const removeFile = (index: number) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        setFilePreviews(prev => {
            const newPreviews = [...prev];
            URL.revokeObjectURL(newPreviews[index].url);
            newPreviews.splice(index, 1);
            return newPreviews;
        });
    };

    // Handle edited image from ImageEditor
    const handleEditApply = (editedBlob: Blob) => {
        if (editingImageIndex === null) return;

        // Create new File from blob
        const editedFile = new File([editedBlob], `edited-${Date.now()}.jpg`, {
            type: 'image/jpeg',
        });

        // Replace file at index
        setSelectedFiles(prev => {
            const newFiles = [...prev];
            newFiles[editingImageIndex] = editedFile;
            return newFiles;
        });

        // Update preview
        const newPreviewUrl = URL.createObjectURL(editedBlob);
        setFilePreviews(prev => {
            const newPreviews = [...prev];
            URL.revokeObjectURL(newPreviews[editingImageIndex].url);
            newPreviews[editingImageIndex] = { url: newPreviewUrl, type: 'image' };
            return newPreviews;
        });

        setEditingImageIndex(null);
        console.log('✅ Image edited and applied');
    };

    const handleEditDraft = (draft: any) => {
        setContent(draft.content || "");
        setHashtags(draft.hashtags || []);
        setDraftId(draft._id);
        setPollData(draft.poll || null);
        if (draft.poll) setShowPollCreator(true);
        if (draft.scheduledFor) {
            setScheduledFor(format(new Date(draft.scheduledFor), "yyyy-MM-dd'T'HH:mm"));
            setShowScheduler(true);
        }
        setIsExpanded(true);
        setShowDraftsManager(false);
        toast.success("Draft loaded into editor");
    };

    const addHashtag = () => {
        if (hashtagInput.trim() && !hashtags.includes(hashtagInput.trim())) {
            setHashtags(prev => [...prev, hashtagInput.trim().replace(/^#/, '')]);
            setHashtagInput("");
        }
    };

    const characterCount = content.length;
    const maxCharacters = 500;
    const isOverLimit = characterCount > maxCharacters;
    const progress = Math.min((characterCount / maxCharacters) * 100, 100);
    const hasVideo = filePreviews.some(f => f.type === 'video');

    return (
        <motion.div
            className={cn(
                "bg-[#030712]/60 backdrop-blur-3xl rounded-[2rem] sm:rounded-[2.5rem] overflow-hidden relative shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] group/create transition-all duration-700 border border-white/10",
                isExpanded && "bg-[#030712]/80",
                className
            )}
            style={{ touchAction: 'manipulation' }}
        >
            {/* Technical Texture & Mesh Gradient Overlays */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-grid-pattern" />
            <div className={cn(
                "absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(99,102,241,0.1),transparent_50%)] opacity-0 group-hover/create:opacity-100 transition-opacity duration-1000",
                isExpanded && "opacity-100"
            )} />

            <div className="p-3 sm:p-6 md:p-8 relative">
                <div className="flex gap-4 sm:gap-6">
                    <div className="relative pt-1 flex-shrink-0">
                        <motion.div
                            animate={{
                                scale: isExpanded ? [1, 1.2, 1] : 1,
                                opacity: isExpanded ? 0.6 : 0.2
                            }}
                            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute inset-0 bg-primary/20 rounded-full blur-2xl"
                        />
                        <Avatar className="w-11 h-11 sm:w-12 sm:h-12 relative ring-2 ring-white/10 group-hover/create:ring-primary/40 transition-all duration-500 shadow-2xl rounded-2xl">
                            <AvatarImage src={profile?.avatar} className="object-cover" />
                            <AvatarFallback className="bg-slate-900 text-slate-400 font-black text-xs italic uppercase">
                                {profile?.name?.[0] || user?.email?.[0]?.toUpperCase() || "V"}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                        <Textarea
                            placeholder="WHAT'S ON YOUR MIND?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            className={cn(
                                "bg-transparent border-none resize-none text-white placeholder:text-slate-600 px-4 py-3 shadow-none ring-0",
                                "focus-visible:ring-0 focus:ring-0 text-[18px] font-bold leading-[1.6] placeholder:font-black placeholder:text-[14px] placeholder:tracking-[0.2em] transition-all duration-500",
                                isExpanded ? "min-h-[140px]" : "min-h-[4rem] flex items-center"
                            )}
                        />

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-4 right-4 sm:top-6 sm:right-6">
                                    <div className="relative w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" className="sm:hidden" />
                                            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" className="hidden sm:block" />

                                            <circle cx="16" cy="16" r="14" fill="none" stroke={isOverLimit ? "#f43f5e" : progress > 80 ? "#f59e0b" : "#10b981"} strokeWidth="2.5" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 14}`} strokeDashoffset={`${2 * Math.PI * 14 * (1 - progress / 100)}`} className="transition-all duration-500 sm:hidden" />
                                            <circle cx="20" cy="20" r="16" fill="none" stroke={isOverLimit ? "#f43f5e" : progress > 80 ? "#f59e0b" : "#10b981"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`} className="transition-all duration-500 hidden sm:block" />
                                        </svg>
                                        <span className={cn("absolute text-[7px] sm:text-[8px] font-black", isOverLimit ? "text-rose-500" : "text-white/40")}>{isOverLimit ? `-${characterCount - maxCharacters}` : `${maxCharacters - characterCount}`}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {hashtags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3">
                                {hashtags.map(tag => (
                                    <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold">
                                        #{tag}
                                        <button onClick={() => setHashtags(prev => prev.filter(t => t !== tag))} className="hover:text-white ml-1"><X className="w-3 h-3" /></button>
                                    </span>
                                ))}
                            </div>
                        )}

                        {location && (
                            <div className="flex items-center gap-2 mt-3 text-sky-400 text-sm">
                                <MapPin className="w-4 h-4" />
                                <span>{location}</span>
                                <button onClick={() => setLocation("")} className="text-white/50 hover:text-white"><X className="w-3 h-3" /></button>
                            </div>
                        )}

                        <AnimatePresence>
                            {filePreviews.length > 0 && (
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 sm:mt-6 grid gap-3 sm:gap-4 justify-center items-center", filePreviews.length === 1 ? "grid-cols-1 max-w-[500px] mx-auto" : "grid-cols-2")}>
                                    {filePreviews.map((preview, index) => {
                                        const file = selectedFiles[index];
                                        const fileSize = file ? (file.size < 1024 * 1024
                                            ? `${(file.size / 1024).toFixed(0)} KB`
                                            : `${(file.size / (1024 * 1024)).toFixed(1)} MB`) : '';
                                        const fileName = file?.name?.split('.').pop()?.toUpperCase() || '';

                                        return (
                                            <div key={index} className="relative aspect-video w-full rounded-2xl sm:rounded-3xl overflow-hidden group/img border border-white/10 bg-black/40 shadow-2xl">
                                                {preview.type === 'video' ? (
                                                    <div className="relative w-full h-full bg-black">
                                                        <video
                                                            src={preview.url}
                                                            className="w-full h-full object-contain"
                                                            autoPlay
                                                            loop
                                                            muted
                                                            playsInline
                                                            onLoadedMetadata={(e) => {
                                                                // Store duration in dataset for display
                                                                const video = e.currentTarget;
                                                                const duration = video.duration;
                                                                const mins = Math.floor(duration / 60);
                                                                const secs = Math.floor(duration % 60);
                                                                video.dataset.duration = `${mins}:${secs.toString().padStart(2, '0')}`;
                                                                // Trigger re-render to show badge
                                                                e.currentTarget.dispatchEvent(new Event('durationLoaded'));
                                                            }}
                                                        />
                                                        {/* Video type badge */}
                                                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-violet-500/90 backdrop-blur-sm">
                                                            <Video className="w-3 h-3 text-white" />
                                                            <span className="text-[9px] font-bold text-white uppercase tracking-wider">Video</span>
                                                        </div>
                                                        {/* File info badges */}
                                                        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between">
                                                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white/90 flex items-center gap-1.5">
                                                                <Clock className="w-3 h-3" />
                                                                <span id={`duration-${index}`}>--:--</span>
                                                            </span>
                                                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/70">
                                                                {fileSize}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <img src={preview.url} alt="" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                                                        {/* Image file info badges */}
                                                        <div className="absolute bottom-2 left-2 right-2 sm:bottom-3 sm:left-3 sm:right-3 flex items-center justify-between opacity-0 group-hover/img:opacity-100 transition-opacity">
                                                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-bold text-white uppercase">
                                                                {fileName}
                                                            </span>
                                                            <span className="px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/70">
                                                                {fileSize}
                                                            </span>
                                                        </div>
                                                    </>
                                                )}
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />

                                                {/* Upload Progress Overlay */}
                                                {isUploading && preview.type === 'video' && (
                                                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                                                        <div className="relative w-16 h-16 mb-3">
                                                            <svg className="w-full h-full -rotate-90" style={{ animationDuration: '2s' }}>
                                                                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
                                                                <circle cx="32" cy="32" r="28" fill="none" stroke="#10b981" strokeWidth="4" strokeLinecap="round" strokeDasharray="176" strokeDashoffset={`${176 * (1 - uploadProgress / 100)}`} className="transition-all duration-300" />
                                                            </svg>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-xs font-bold text-white">{uploadProgress}%</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-bold text-white/80 uppercase tracking-widest">
                                                            Uploading...
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Edit Button - Only for images */}
                                                {
                                                    preview.type === 'image' && (
                                                        <button
                                                            onClick={() => setEditingImageIndex(index)}
                                                            className="absolute top-2 left-2 sm:top-3 sm:left-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl bg-primary/90 backdrop-blur-xl flex items-center gap-1.5 sm:gap-2 shadow-lg hover:bg-primary hover:scale-105 active:scale-95 transition-all text-white text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-white/20 z-10"
                                                        >
                                                            <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                            <span>Edit</span>
                                                        </button>
                                                    )
                                                }

                                                <button onClick={() => removeFile(index)} className="absolute top-2 right-2 sm:top-3 sm:right-3 w-8 h-8 sm:w-9 sm:h-9 rounded-xl sm:rounded-2xl bg-black/60 backdrop-blur-xl flex items-center justify-center hover:bg-rose-500 transition-all border border-white/10 z-10 shadow-lg">
                                                    <X className="w-4 h-4 text-white" />
                                                </button>
                                            </div >
                                        );
                                    })
                                    }
                                </motion.div >
                            )}
                        </AnimatePresence >
                    </div >
                </div >

                {/* Emoji Picker */}
                <AnimatePresence>
                    {
                        showEmojiPicker && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                                    {Object.keys(EMOJI_CATEGORIES).map(cat => (
                                        <button key={cat} onClick={() => setActiveEmojiCategory(cat as keyof typeof EMOJI_CATEGORIES)} className={cn("px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors", activeEmojiCategory === cat ? "bg-primary text-white" : "bg-white/5 text-white/60 hover:text-white")}>
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                                    {EMOJI_CATEGORIES[activeEmojiCategory].map(emoji => (
                                        <button key={emoji} onClick={() => setContent(prev => prev + emoji)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-lg">
                                            {emoji}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Hashtag Input */}
                <AnimatePresence>
                    {
                        showHashtagInput && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 flex items-center gap-2 bg-white/5 rounded-2xl p-3 border border-white/10">
                                <Hash className="w-4 h-4 text-emerald-400" />
                                <input type="text" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())} placeholder="Add hashtag..." className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/30" />
                                <Button size="sm" variant="ghost" onClick={addHashtag} className="text-emerald-400 h-8 px-3">Add</Button>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Scheduler UI */}
                <AnimatePresence>
                    {
                        showScheduler && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 bg-white/5 rounded-2xl p-4 border border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <Clock className="w-4 h-4 text-rose-400" />
                                    <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Schedule Post</span>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <input
                                        type="datetime-local"
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-rose-500/50 transition-colors w-full"
                                        min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
                                        onChange={(e) => setScheduledFor(e.target.value)}
                                        value={scheduledFor || ""}
                                    />
                                    <p className="text-[10px] text-white/40 font-medium">
                                        {scheduledFor ? `Vibe will be published on ${format(new Date(scheduledFor), "PPP 'at' p")}` : "Select a time to schedule this vibe."}
                                    </p>
                                    {scheduledFor && (
                                        <Button variant="ghost" size="sm" onClick={() => setScheduledFor(null)} className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 self-start h-8 px-3 text-[10px] uppercase font-black">
                                            Clear Schedule
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >

                {/* Poll Creator */}
                <AnimatePresence>
                    {
                        showPollCreator && (
                            <div className="mt-4">
                                <PollCreator
                                    poll={pollData}
                                    onPollChange={(poll) => {
                                        setPollData(poll);
                                        if (!poll) setShowPollCreator(false);
                                    }}
                                />
                            </div>
                        )
                    }
                </AnimatePresence >

                {/* AI Copilot Panel */}
                <AnimatePresence>
                    {
                        showAICopilot && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-4 bg-gradient-to-br from-primary/10 via-purple-500/5 to-rose-500/10 rounded-2xl p-4 border border-primary/20"
                            >
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Wand2 className="w-4 h-4 text-primary" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-black text-white uppercase tracking-wider">AI Content Copilot</span>
                                        <p className="text-[9px] text-white/50">Generate captions, hashtags, and ideas</p>
                                    </div>
                                </div>

                                {/* Topic Input */}
                                <div className="mb-4">
                                    <input
                                        type="text"
                                        value={aiTopicInput}
                                        onChange={(e) => setAiTopicInput(e.target.value)}
                                        placeholder="Enter topic or context (optional)..."
                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-primary/50 placeholder:text-white/30"
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleGenerateCaption}
                                        disabled={isGeneratingCaption}
                                        className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 text-[10px] font-black uppercase"
                                    >
                                        {isGeneratingCaption ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Sparkles className="w-3 h-3 mr-1" />}
                                        Captions
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleSuggestHashtags}
                                        disabled={isGeneratingHashtags}
                                        className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-black uppercase"
                                    >
                                        {isGeneratingHashtags ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Hash className="w-3 h-3 mr-1" />}
                                        Hashtags
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={handleGenerateIdeas}
                                        disabled={isGeneratingIdeas}
                                        className="bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-[10px] font-black uppercase"
                                    >
                                        {isGeneratingIdeas ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Lightbulb className="w-3 h-3 mr-1" />}
                                        Ideas
                                    </Button>
                                </div>

                                {/* Caption Suggestions */}
                                {aiCaptions.length > 0 && (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Caption Suggestions</p>
                                        <div className="space-y-2">
                                            {aiCaptions.map((caption, idx) => (
                                                <div key={idx} className="bg-white/5 rounded-xl p-3 group hover:bg-white/10 transition-colors">
                                                    <p className="text-sm text-white/80 mb-2">{caption}</p>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => applyCaption(caption)}
                                                            className="text-[9px] font-bold text-primary hover:underline uppercase"
                                                        >
                                                            Apply
                                                        </button>
                                                        <button
                                                            onClick={() => copyToClipboard(caption, idx)}
                                                            className="text-[9px] font-bold text-white/50 hover:text-white uppercase flex items-center gap-1"
                                                        >
                                                            {copiedIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                            {copiedIndex === idx ? "Copied" : "Copy"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hashtag Suggestions */}
                                {aiHashtags && (
                                    <div className="mb-4">
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Suggested Hashtags</p>
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {aiHashtags.hashtags.map((tag, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => applyHashtags([tag])}
                                                    className="px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/30 transition-colors"
                                                >
                                                    #{tag}
                                                </button>
                                            ))}
                                        </div>
                                        {aiHashtags.trending.length > 0 && (
                                            <>
                                                <p className="text-[9px] font-bold text-white/40 uppercase mb-1">Trending</p>
                                                <div className="flex flex-wrap gap-2">
                                                    {aiHashtags.trending.map((tag, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => applyHashtags([tag])}
                                                            className="px-3 py-1.5 rounded-full bg-rose-500/20 text-rose-400 text-xs font-bold hover:bg-rose-500/30 transition-colors"
                                                        >
                                                            #{tag} 🔥
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                        <button
                                            onClick={() => applyHashtags([...aiHashtags.hashtags, ...aiHashtags.trending])}
                                            className="mt-2 text-[9px] font-black text-primary hover:underline uppercase"
                                        >
                                            Add All Hashtags
                                        </button>
                                    </div>
                                )}

                                {/* Post Ideas */}
                                {aiIdeas.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-black text-white/60 uppercase tracking-wider mb-2">Post Ideas</p>
                                        <div className="space-y-3">
                                            {aiIdeas.map((idea, idx) => (
                                                <div key={idx} className="bg-white/5 rounded-xl p-3 hover:bg-white/10 transition-colors">
                                                    <p className="text-xs font-bold text-amber-400 mb-1">{idea.title}</p>
                                                    <p className="text-sm text-white/70 mb-2">{idea.caption}</p>
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {idea.hashtags.map((tag, tagIdx) => (
                                                            <span key={tagIdx} className="text-[9px] text-white/40">#{tag}</span>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => applyIdea(idea)}
                                                        className="text-[9px] font-bold text-primary hover:underline uppercase"
                                                    >
                                                        Use This Idea
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )
                    }
                </AnimatePresence >


                {/* Status Badges */}
                <AnimatePresence>
                    {
                        isExpanded && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-2 mt-4 sm:mt-6">
                                <div className="flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-2 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest hidden sm:inline">Trust_Verified</span>
                                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest sm:hidden">TRUST</span>
                                </div>
                                <div className="flex items-center gap-1.5 px-2 sm:px-4 py-1 sm:py-2 rounded-2xl bg-white/[0.03] border border-white/5">
                                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest hidden sm:inline">Neural_Boost</span>
                                    <span className="text-[9px] font-black text-white/50 uppercase tracking-widest sm:hidden">BOOST</span>
                                </div>
                            </motion.div>
                        )
                    }
                </AnimatePresence >
            </div >

            {/* Bottom Action Bar - ULTIMATE PREMIUM REDESIGN */}
            <div className="px-2 sm:px-8 py-3 sm:py-4 flex items-center justify-between gap-1 border-t border-white/5 bg-white/[0.02]">
                <div className="flex items-center gap-1 sm:gap-1.5">
                    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(99,102,241,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => imageInputRef.current?.click()}
                        disabled={selectedFiles.length >= 4 || hasVideo}
                        className={cn(
                            "w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 border border-transparent hover:border-indigo-500/20 group/icon relative overflow-hidden",
                            selectedFiles.length >= 4 || hasVideo ? "opacity-20 cursor-not-allowed" : "opacity-80 hover:opacity-100"
                        )}
                        title="Add photos"
                    >
                        <Image className="w-5 h-5 text-indigo-400 group-hover/icon:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(244,63,94,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => videoInputRef.current?.click()}
                        disabled={selectedFiles.length > 0}
                        className={cn(
                            "w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 border border-transparent hover:border-rose-500/20 group/icon relative overflow-hidden",
                            selectedFiles.length > 0 ? "opacity-20 cursor-not-allowed" : "opacity-80 hover:opacity-100"
                        )}
                        title="Add video"
                    >
                        <Video className="w-5 h-5 text-rose-400 group-hover/icon:scale-110 transition-transform" />
                        <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(245,158,11,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowHashtagInput(false); setShowLocationInput(false); }}
                        className="w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 border border-transparent hover:border-amber-500/20 group/icon opacity-80 hover:opacity-100 relative overflow-hidden"
                        title="Add emoji"
                    >
                        <Smile className={cn("w-5 h-5 text-amber-400 transition-all group-hover/icon:scale-110", showEmojiPicker && "text-amber-300")} />
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(16,185,129,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowHashtagInput(!showHashtagInput); setShowEmojiPicker(false); setShowLocationInput(false); setShowPollCreator(false); }}
                        className="w-11 h-11 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-500 border border-transparent hover:border-emerald-500/20 group/icon opacity-80 hover:opacity-100 relative overflow-hidden"
                        title="Add hashtag"
                    >
                        <Hash className={cn("w-5 h-5 text-emerald-400 transition-all group-hover/icon:scale-110", showHashtagInput && "text-emerald-300")} />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(14,165,233,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowLocationInput(!showLocationInput); setShowEmojiPicker(false); setShowHashtagInput(false); setShowPollCreator(false); }}
                        className="w-9 h-9 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-500 border border-transparent hover:border-sky-500/20 group/icon opacity-80 hover:opacity-100 relative overflow-hidden"
                        title="Add location"
                    >
                        <MapPin className={cn("w-5 h-5 text-sky-400 transition-all group-hover/icon:scale-110", showLocationInput && "text-sky-300")} />
                        <div className="absolute inset-0 bg-sky-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(139,92,246,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowPollCreator(!showPollCreator); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); setShowScheduler(false); }}
                        disabled={selectedFiles.length > 0}
                        className={cn(
                            "w-9 h-9 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-500 border border-transparent hover:border-violet-500/20 group/icon relative overflow-hidden",
                            selectedFiles.length > 0 ? "opacity-20 cursor-not-allowed" : "opacity-80 hover:opacity-100"
                        )}
                        title="Add poll"
                    >
                        <BarChart3 className={cn("w-5 h-5 text-violet-400 transition-all group-hover/icon:scale-110", showPollCreator && "text-violet-300")} />
                        <div className="absolute inset-0 bg-violet-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(244,63,94,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowScheduler(!showScheduler); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); setShowPollCreator(false); }}
                        className="w-9 h-9 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-500 border border-transparent hover:border-rose-500/20 group/icon opacity-80 hover:opacity-100 relative overflow-hidden"
                        title="Schedule post"
                    >
                        <Calendar className={cn("w-5 h-5 text-rose-400 transition-all group-hover/icon:scale-110", showScheduler && "text-rose-300")} />
                        <div className="absolute inset-0 bg-rose-500/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.05)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setShowDraftsManager(true)}
                        className="w-9 h-9 sm:w-11 sm:h-11 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-500 border border-transparent hover:border-white/10 group/icon opacity-80 hover:opacity-100 relative overflow-hidden"
                        title="View drafts"
                    >
                        <History className="w-5 h-5 text-slate-400 transition-all group-hover/icon:scale-110" />
                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: "rgba(129,140,248,0.1)" }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowAICopilot(!showAICopilot); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); setShowPollCreator(false); setShowScheduler(false); }}
                        className={cn(
                            "w-8 h-8 sm:w-11 sm:h-11 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all duration-500 group/icon relative overflow-hidden",
                            showAICopilot
                                ? "bg-primary/20 opacity-100 border-primary/40 shadow-[0_0_15px_rgba(129,140,248,0.2)]"
                                : "hover:border-primary/20 opacity-80 hover:opacity-100"
                        )}
                        title="AI Content Copilot"
                    >
                        <Wand2 className={cn("w-5 h-5 text-primary transition-all group-hover/icon:scale-110", showAICopilot && "animate-pulse")} />
                        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover/icon:opacity-100 transition-opacity" />
                        {/* Sonic Pulse Ring */}
                        {showAICopilot && (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1.5, opacity: 0 }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="absolute inset-0 border-2 border-primary/30 rounded-2xl"
                            />
                        )}
                    </motion.button>
                </div>

                <div className="flex items-center gap-2 sm:gap-4">
                    {isSavingDraft && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/5">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest hidden sm:inline">AUTOSAVING</span>
                        </div>
                    )}
                    <AnimatePresence>
                        {isExpanded && (
                            <div className="flex items-center gap-2 sm:gap-4">
                                <motion.button
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={handleManualSave}
                                    disabled={isSavingDraft}
                                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl sm:rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white border border-white/5"
                                    title="Save draft"
                                >
                                    {isSavingDraft ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                                </motion.button>
                                <motion.button
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    onClick={() => { setIsExpanded(false); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); }}
                                    className="text-[9px] sm:text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] sm:tracking-[0.2em] hover:text-white transition-colors px-1 sm:px-2 py-1"
                                >
                                    BACK
                                </motion.button>
                            </div>
                        )}
                    </AnimatePresence>

                    <Button
                        onClick={handleSubmit}
                        disabled={(!content.trim() && selectedFiles.length === 0) || isOverLimit || createPost.isPending || isUploading}
                        className={cn(
                            "relative group/btn h-9 sm:h-12 px-4 sm:px-10 rounded-full overflow-hidden transition-all duration-700",
                            "bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600 border border-white/20 shadow-[0_0_25px_rgba(129,140,248,0.3)]",
                            "hover:scale-[1.02] hover:shadow-[0_0_35px_rgba(129,140,248,0.5)] active:scale-[0.98]",
                            "disabled:opacity-50 disabled:scale-100 text-white"
                        )}
                    >
                        {/* Animated Gradient Background for Button */}
                        <div className={cn(
                            "absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 transition-opacity duration-700",
                            content.trim().length > 0 ? "opacity-100" : "opacity-40"
                        )} />

                        {/* Glass Overlay */}
                        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm opacity-0 group-hover/btn:opacity-100 transition-opacity" />

                        {/* Shimmer Effect */}
                        {content.trim().length > 0 && (
                            <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent animate-glowLine" />
                        )}

                        <div className="relative z-10 flex items-center gap-2 sm:gap-3">
                            {(createPost.isPending || isUploading) ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                                    <span className="text-[10px] font-bold uppercase tracking-widest">
                                        {isUploading ? `${uploadProgress}%` : "SENDING..."}
                                    </span>
                                </div>
                            ) : (
                                <>
                                    <Sparkles className={cn("w-4 h-4 transition-transform duration-500 group-hover/btn:rotate-12", content.trim().length > 0 ? "text-white" : "text-slate-600")} />
                                    <span className="font-black italic tracking-[0.2em] uppercase text-[10px] sm:text-[11px]">
                                        {scheduledFor ? "Schedule" : "POST"}
                                    </span>
                                </>
                            )}
                        </div>
                    </Button>
                </div>
            </div>

            {/* Image Editor Modal */}
            {
                editingImageIndex !== null && filePreviews[editingImageIndex]?.type === 'image' && (
                    <ImageEditor
                        imageUrl={filePreviews[editingImageIndex].url}
                        onApply={handleEditApply}
                        onCancel={() => setEditingImageIndex(null)}
                    />
                )
            }

            <DraftsManager
                isOpen={showDraftsManager}
                onClose={() => setShowDraftsManager(false)}
                onEditDraft={handleEditDraft}
            />
        </motion.div >
    );
}
