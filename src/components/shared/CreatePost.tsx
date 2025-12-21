import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Image, Video, Smile, MapPin, X, Loader2,
    ShieldCheck, Sparkles, Hash, Pencil, BarChart3,
    Calendar, Clock, Save, History
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCreatePost, useUploadUrl, useConfirmUpload, useSaveDraft, useDeleteDraft } from "@/api/hooks";
import { cn } from "@/lib/utils";
import { ImageEditor } from "./ImageEditor";
import { PollCreator } from "./Poll";
import { format } from "date-fns";
import { DraftsManager } from "./DraftsManager";
import { toast } from "sonner";

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

    const { user, profile } = useAuth();
    const createPost = useCreatePost();
    const getUploadUrl = useUploadUrl();
    const confirmUpload = useConfirmUpload();
    const saveDraft = useSaveDraft();
    const deleteDraft = useDeleteDraft();

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

    // Upload a single file to Cloudinary
    const uploadToCloudinary = async (file: File): Promise<string | null> => {
        try {
            // Compress images before upload
            const processedFile = await compressImage(file);

            const isVideo = processedFile.type.startsWith('video/');
            const uploadUrlRes = await getUploadUrl.mutateAsync('posts');
            const { uploadUrl, apiKey, timestamp, signature, folder, eager } = (uploadUrlRes as { data: { uploadUrl: string; apiKey: string; timestamp: number; signature: string; folder: string; eager?: string } }).data;

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

            const cloudRes = await fetch(uploadUrl, { method: 'POST', body: formData });

            if (!cloudRes.ok) {
                const errorText = await cloudRes.text();
                console.error('Cloudinary error:', cloudRes.status, errorText);
                throw new Error(`Upload failed: ${cloudRes.statusText}`);
            }

            const cloudData = await cloudRes.json();

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

            // Upload all files in PARALLEL for faster performance
            const uploadPromises = selectedFiles.map(file => uploadToCloudinary(file));
            const results = await Promise.all(uploadPromises);
            const mediaIds = results.filter((id): id is string => id !== null);

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
                "bg-white/[0.03] backdrop-blur-3xl rounded-[2.5rem] overflow-hidden relative shadow-2xl group/create transition-all duration-700",
                isExpanded && "bg-white/[0.05]",
                className
            )}
            style={{ touchAction: 'manipulation' }}
        >
            <div className={cn(
                "absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover/create:opacity-100 transition-opacity duration-1000",
                isExpanded && "opacity-100"
            )} />

            <div className="p-3 sm:p-4 md:p-6 relative">
                <div className="flex gap-3 sm:gap-5">
                    <div className="relative pt-1 flex-shrink-0">
                        <motion.div animate={{ scale: isExpanded ? 1.1 : 1, opacity: isExpanded ? 0.8 : 0.4 }} className="absolute inset-0 bg-secondary/30 rounded-full blur-xl" />
                        <Avatar className="w-10 h-10 sm:w-11 sm:h-11 relative ring-2 ring-white/5 group-hover/create:ring-secondary/30 transition-all duration-500">
                            <AvatarImage src={profile?.avatar} />
                            <AvatarFallback className="bg-slate-900 text-slate-500 font-black text-[10px]">
                                {profile?.name?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                        </Avatar>
                    </div>

                    <div className="flex-1 min-w-0">
                        <Textarea
                            placeholder="What's on your mind?"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            onFocus={() => setIsExpanded(true)}
                            className={cn(
                                "bg-transparent border-none resize-none text-white placeholder:text-slate-600 px-4 py-3 shadow-none ring-0",
                                "focus-visible:ring-0 focus:ring-0 text-[16px] font-medium leading-[1.6] placeholder:font-medium placeholder:text-[14px] transition-all duration-500",
                                isExpanded ? "min-h-[100px]" : "min-h-[3.5rem] flex items-center"
                            )}
                        />

                        <AnimatePresence>
                            {isExpanded && (
                                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="absolute top-6 right-6">
                                    <div className="relative w-10 h-10 flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90">
                                            <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                                            <circle cx="20" cy="20" r="16" fill="none" stroke={isOverLimit ? "#f43f5e" : progress > 80 ? "#f59e0b" : "#10b981"} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 16}`} strokeDashoffset={`${2 * Math.PI * 16 * (1 - progress / 100)}`} className="transition-all duration-500" />
                                        </svg>
                                        <span className={cn("absolute text-[8px] font-black", isOverLimit ? "text-rose-500" : "text-white/40")}>{isOverLimit ? `-${characterCount - maxCharacters}` : `${maxCharacters - characterCount}`}</span>
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
                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("mt-4 sm:mt-6 grid gap-2 sm:gap-3", filePreviews.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                                    {filePreviews.map((preview, index) => (
                                        <div key={index} className="relative aspect-video max-h-[200px] sm:max-h-[250px] rounded-2xl sm:rounded-3xl overflow-hidden group/img border border-white/5">
                                            {preview.type === 'video' ? (
                                                <div className="relative w-full h-full bg-black">
                                                    <video
                                                        src={preview.url}
                                                        className="w-full h-full object-contain"
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                    />
                                                </div>
                                            ) : (
                                                <img src={preview.url} alt="" className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-700" />
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity" />

                                            {/* Edit Button - Only for images */}
                                            {preview.type === 'image' && (
                                                <button
                                                    onClick={() => setEditingImageIndex(index)}
                                                    className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg sm:rounded-xl bg-white/10 backdrop-blur-xl flex items-center gap-1.5 sm:gap-2 opacity-0 group-hover/img:opacity-100 hover:bg-primary transition-all text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-widest"
                                                >
                                                    <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                                    <span className="hidden sm:inline">Edit</span>
                                                </button>
                                            )}

                                            <button onClick={() => removeFile(index)} className="absolute top-2 right-2 sm:top-3 sm:right-3 w-7 h-7 sm:w-8 sm:h-8 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-xl flex items-center justify-center hover:bg-rose-500 transition-colors">
                                                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Emoji Picker */}
                <AnimatePresence>
                    {showEmojiPicker && (
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
                    )}
                </AnimatePresence>

                {/* Hashtag Input */}
                <AnimatePresence>
                    {showHashtagInput && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-4 flex items-center gap-2 bg-white/5 rounded-2xl p-3 border border-white/10">
                            <Hash className="w-4 h-4 text-emerald-400" />
                            <input type="text" value={hashtagInput} onChange={(e) => setHashtagInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHashtag())} placeholder="Add hashtag..." className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder:text-white/30" />
                            <Button size="sm" variant="ghost" onClick={addHashtag} className="text-emerald-400 h-8 px-3">Add</Button>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Scheduler UI */}
                <AnimatePresence>
                    {showScheduler && (
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
                    )}
                </AnimatePresence>

                {/* Poll Creator */}
                <AnimatePresence>
                    {showPollCreator && (
                        <div className="mt-4">
                            <PollCreator
                                poll={pollData}
                                onPollChange={(poll) => {
                                    setPollData(poll);
                                    if (!poll) setShowPollCreator(false);
                                }}
                            />
                        </div>
                    )}
                </AnimatePresence>

                {/* Status Badges */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex flex-wrap gap-2 mt-6">
                            <div className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white/[0.03] border border-white/5">
                                <ShieldCheck className="w-3.5 h-3.5 text-secondary" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest hidden sm:inline">Trust_Verified</span>
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest sm:hidden">TRUST</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-2xl bg-white/[0.03] border border-white/5">
                                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest hidden sm:inline">Neural_Boost</span>
                                <span className="text-[9px] font-black text-white/50 uppercase tracking-widest sm:hidden">BOOST</span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bottom Action Bar */}
            <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
                    <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />

                    <button onClick={() => imageInputRef.current?.click()} disabled={selectedFiles.length >= 4 || hasVideo} className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5", selectedFiles.length >= 4 || hasVideo ? "opacity-20" : "opacity-60 hover:opacity-100")} title="Add photos">
                        <Image className="w-5 h-5 text-indigo-400" />
                    </button>

                    <button onClick={() => videoInputRef.current?.click()} disabled={selectedFiles.length > 0} className={cn("w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5", selectedFiles.length > 0 ? "opacity-20" : "opacity-60 hover:opacity-100")} title="Add video">
                        <Video className="w-5 h-5 text-rose-400" />
                    </button>

                    <button onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowHashtagInput(false); setShowLocationInput(false); }} className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100" title="Add emoji">
                        <Smile className={cn("w-5 h-5 text-amber-400", showEmojiPicker && "text-amber-300")} />
                    </button>

                    <button onClick={() => { setShowHashtagInput(!showHashtagInput); setShowEmojiPicker(false); setShowLocationInput(false); setShowPollCreator(false); }} className="w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100" title="Add hashtag">
                        <Hash className={cn("w-5 h-5 text-emerald-400", showHashtagInput && "text-emerald-300")} />
                    </button>

                    <button onClick={() => { setShowLocationInput(!showLocationInput); setShowEmojiPicker(false); setShowHashtagInput(false); setShowPollCreator(false); }} className="w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100" title="Add location">
                        <MapPin className={cn("w-5 h-5 text-sky-400", showLocationInput && "text-sky-300")} />
                    </button>

                    <button onClick={() => { setShowPollCreator(!showPollCreator); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); setShowScheduler(false); }} disabled={selectedFiles.length > 0} className={cn("w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5", selectedFiles.length > 0 ? "opacity-20" : "opacity-60 hover:opacity-100")} title="Add poll">
                        <BarChart3 className={cn("w-5 h-5 text-violet-400", showPollCreator && "text-violet-300")} />
                    </button>

                    <button onClick={() => { setShowScheduler(!showScheduler); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); setShowPollCreator(false); }} className="w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100" title="Schedule post">
                        <Calendar className={cn("w-5 h-5 text-rose-400", showScheduler && "text-rose-300")} />
                    </button>

                    <button onClick={() => setShowDraftsManager(true)} className="w-10 h-10 hidden sm:flex items-center justify-center rounded-2xl transition-all duration-300 hover:bg-white/5 opacity-60 hover:opacity-100" title="View drafts">
                        <History className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    {isSavingDraft && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl">
                            <Loader2 className="w-3 h-3 animate-spin text-white/40" />
                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Saving...</span>
                        </div>
                    )}
                    <AnimatePresence>
                        {isExpanded && (
                            <div className="flex items-center gap-3">
                                <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onClick={handleManualSave} disabled={isSavingDraft} className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-slate-400 hover:text-white" title="Save draft">
                                    {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                                </motion.button>
                                <motion.button initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} onClick={() => { setIsExpanded(false); setShowEmojiPicker(false); setShowHashtagInput(false); setShowLocationInput(false); }} className="text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-white transition-colors">
                                    Cancel
                                </motion.button>
                            </div>
                        )}
                    </AnimatePresence>

                    <Button onClick={handleSubmit} disabled={(!content.trim() && selectedFiles.length === 0) || isOverLimit || createPost.isPending || isUploading} className={cn("relative group/btn h-10 sm:h-12 px-4 sm:px-8 rounded-full overflow-hidden transition-all duration-500", "bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 border-none shadow-xl shadow-indigo-500/20", "hover:scale-[1.05] active:scale-[0.95] disabled:opacity-30 disabled:scale-100")}>
                        {(createPost.isPending || isUploading) ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin text-white" />
                                <span className="text-[9px] sm:text-[10px] font-black text-white uppercase hidden sm:inline">Uploading...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <Sparkles className="w-4 h-4 text-white animate-pulse" />
                                <span className="font-heading font-black italic tracking-tighter uppercase text-[10px] sm:text-[11px] text-white">
                                    {scheduledFor ? "Schedule" : "POST"}
                                </span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/20 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity" />
                    </Button>
                </div>
            </div>

            {/* Image Editor Modal */}
            {editingImageIndex !== null && filePreviews[editingImageIndex]?.type === 'image' && (
                <ImageEditor
                    imageUrl={filePreviews[editingImageIndex].url}
                    onApply={handleEditApply}
                    onCancel={() => setEditingImageIndex(null)}
                />
            )}

            <DraftsManager
                isOpen={showDraftsManager}
                onClose={() => setShowDraftsManager(false)}
                onEditDraft={handleEditDraft}
            />
        </motion.div >
    );
}
