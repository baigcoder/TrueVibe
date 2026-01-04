import { useState, useRef, useCallback } from "react";
import { PostCard, type PostData } from "@/components/shared/PostCard";
import { CreatePost } from "@/components/shared/CreatePost";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, Users, Eye, Plus, Play, X, Upload, Loader2, Image, Video, Heart } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { m, AnimatePresence } from "framer-motion";
import { useFeed, useStoriesFeed, useViewStory, useCreateStory } from "@/api/hooks";
import { StoryViewer } from "@/components/stories/StoryViewer";
import { toast } from "sonner";
import { FollowingTab, TrendingTab, TrustWatchTab } from "@/components/feed";

type FeedType = 'main' | 'following' | 'trending' | 'trust-watch';

const feedTabs = [
    { id: 'main', label: 'For You', icon: TrendingUp },
    { id: 'following', label: 'Following', icon: Users },
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'trust-watch', label: 'Trust Watch', icon: Eye },
];

export default function FeedPage() {
    const [activeFeed, setActiveFeed] = useState<FeedType>('main');
    const [viewerOpen, setViewerOpen] = useState(false);
    const [viewerStories, setViewerStories] = useState<any[]>([]);
    const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
    const [storyUploadOpen, setStoryUploadOpen] = useState(false);
    const [selectedStoryFile, setSelectedStoryFile] = useState<File | null>(null);
    const [storyPreviewUrl, setStoryPreviewUrl] = useState<string | null>(null);
    const [storyCaption, setStoryCaption] = useState("");
    const [isUploadingStory, setIsUploadingStory] = useState(false);
    const storyFileInputRef = useRef<HTMLInputElement>(null);
    const { profile } = useAuth();

    const { data: feedData, isLoading } = useFeed(activeFeed);
    const { data: storiesData } = useStoriesFeed();
    const viewStory = useViewStory();
    const createStoryMutation = useCreateStory();
    const posts: PostData[] = (feedData?.pages as any[])?.flatMap(p => p?.data?.posts || []) || [];

    const storyFeed = (storiesData as any)?.data?.storyFeed || [];
    const myStoryGroup = storyFeed.find((s: any) => s.user?._id === profile?._id || s.user?.supabaseId === profile?.supabaseId);
    const otherStories = storyFeed.filter((s: any) => s.user?._id !== profile?._id && s.user?.supabaseId !== profile?.supabaseId);

    // Handle story click to open viewer
    const handleStoryClick = (storyGroup: any) => {
        const stories = storyGroup.stories.map((s: any) => ({
            ...s,
            user: storyGroup.user,
        }));
        setViewerStories(stories);
        setViewerInitialIndex(0);
        setViewerOpen(true);
    };

    // Handle story viewed
    const handleStoryViewed = useCallback((storyId: string) => {
        viewStory.mutate(storyId);
    }, [viewStory]);

    // Handle story file selection
    const handleStoryFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedStoryFile(file);
            const url = URL.createObjectURL(file);
            setStoryPreviewUrl(url);
            setStoryUploadOpen(true);
        }
    };

    // Compress image for faster upload (max 1920px, 80% quality)
    const compressImage = async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/') || file.size < 100 * 1024) {
            return file;
        }

        return new Promise((resolve) => {
            const img = document.createElement('img') as HTMLImageElement;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
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
                            console.log(`📦 Story compressed: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB`);
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    },
                    'image/jpeg',
                    0.8
                );
            };
            img.onerror = () => resolve(file);
            img.src = URL.createObjectURL(file);
        });
    };

    // Handle story upload
    const handleStoryUpload = async () => {
        if (!selectedStoryFile) {
            toast.error("Please select a file first");
            return;
        }

        setIsUploadingStory(true);
        const toastId = toast.loading("Uploading story...");

        try {
            // Compress image before upload for faster transfer
            const processedFile = await compressImage(selectedStoryFile);

            const formData = new FormData();
            formData.append('media', processedFile);
            if (storyCaption) formData.append('caption', storyCaption);

            await createStoryMutation.mutateAsync(formData);

            toast.success("Story shared successfully!", { id: toastId });

            // Reset
            setSelectedStoryFile(null);
            setStoryPreviewUrl(null);
            setStoryCaption("");
            setStoryUploadOpen(false);
        } catch (error: any) {
            console.error('Failed to upload story:', error);
            const message = error.message || error?.response?.data?.error?.message || "Failed to upload story. Please try again.";
            toast.error(message, { id: toastId });
        } finally {
            setIsUploadingStory(false);
        }
    };

    return (
        <div className="w-full max-w-full overflow-x-hidden flex flex-col gap-4 lg:gap-6 max-w-2xl mx-auto py-2 lg:py-6 pb-24 lg:pb-6">
            {/* Gen-Z Stories Section - Floating Tiles */}
            <div className="relative group mb-2">
                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                    {/* Hidden file input for story upload */}
                    <input
                        ref={storyFileInputRef}
                        type="file"
                        accept="image/*,video/*"
                        onChange={handleStoryFileSelect}
                        className="hidden"
                    />

                    {/* Your Vibe / My Story Card - ULTIMATE PREMIUM DESIGN */}
                    <m.div
                        whileHover={{ y: -8, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => myStoryGroup ? handleStoryClick(myStoryGroup) : storyFileInputRef.current?.click()}
                        className={cn(
                            "relative w-24 h-36 sm:w-32 sm:h-48 lg:w-36 lg:h-56 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] group/vibe transition-all duration-700",
                            myStoryGroup
                                ? "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] ring-1 ring-white/10"
                                : "border border-white/5 bg-slate-900/50 shadow-xl"
                        )}
                    >
                        {/* Background Layer with Mesh Gradient & Noise */}
                        {myStoryGroup ? (
                            <div className="absolute inset-0 bg-[#030712]">
                                {myStoryGroup.stories[0].mediaUrl ? (
                                    <div className="relative w-full h-full">
                                        <img
                                            src={myStoryGroup.stories[0].mediaUrl}
                                            className="w-full h-full object-cover group-hover/vibe:scale-110 transition-transform duration-1000 opacity-60 mix-blend-luminosity"
                                            alt=""
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).style.opacity = '0';
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-transparent to-black" />
                                    </div>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-purple-600/20 to-secondary/30 animate-gradient-xy" />
                                )}
                                {/* Technical Texture Overlay */}
                                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-grid-pattern" />
                            </div>
                        ) : (
                            <div className="absolute inset-0 overflow-hidden">
                                {/* Mesh Gradient Background */}
                                <div className="absolute inset-0 bg-[#030712]" />
                                <div className="absolute -top-[20%] -left-[20%] w-[140%] h-[140%] bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.15),transparent_50%),radial-gradient(circle_at_80%_20%,rgba(244,63,94,0.15),transparent_50%),radial-gradient(circle_at_20%_80%,rgba(168,85,247,0.15),transparent_50%)] animate-pulse" />

                                {/* Animated Gradient Accent */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/80 via-purple-500/80 to-rose-500/80 mix-blend-overlay opacity-90" />

                                {/* Noise & Grid Texture */}
                                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-grid-pattern" />
                            </div>
                        )}

                        {/* Content Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-4 lg:p-5 py-5 sm:py-6 lg:py-8">
                            <div className="flex justify-between w-full items-start">
                                {myStoryGroup ? (
                                    <m.div
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="px-2.5 py-1 rounded-xl bg-white/10 backdrop-blur-2xl border border-white/10 flex items-center gap-1.5 transition-all group-hover/vibe:bg-white/20"
                                    >
                                        <Eye className="w-3 h-3 text-primary animate-pulse" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">
                                            {myStoryGroup.stories.reduce((acc: number, s: any) => acc + (s.viewers?.length || 0), 0)}
                                        </span>
                                    </m.div>
                                ) : <div />}

                                <m.div
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        storyFileInputRef.current?.click();
                                    }}
                                    className="w-8 h-8 sm:w-9 sm:h-9 lg:w-10 lg:h-10 rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-2xl flex items-center justify-center border border-white/20 transition-all shadow-2xl group/plus relative"
                                >
                                    {/* Inner Glow for Plus Button */}
                                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-hover/plus:opacity-100 transition-opacity" />
                                    <Plus className="w-5 h-5 text-white relative z-10" />
                                </m.div>
                            </div>

                            <div className="flex flex-col items-center gap-3 w-full">
                                <div className={cn(
                                    "p-1 rounded-[1.8rem] lg:rounded-[2rem] transition-all duration-700 relative",
                                    myStoryGroup?.hasUnwatched
                                        ? "bg-gradient-to-tr from-primary via-purple-500 to-rose-400 animate-gradient-xy shadow-[0_0_20px_rgba(var(--primary-rgb),0.4)]"
                                        : myStoryGroup
                                            ? "bg-white/20"
                                            : "p-0"
                                )}>
                                    <div className="p-0.5 bg-[#030712] rounded-[1.7rem] lg:rounded-[1.9rem]">
                                        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-[1.4rem] lg:rounded-[1.6rem] border border-white/10 ring-1 ring-white/5 transition-transform duration-500 group-hover/vibe:scale-105">
                                            <AvatarImage src={profile?.avatar} className="object-cover" />
                                            <AvatarFallback className="bg-slate-900 text-white font-black text-xs sm:text-sm uppercase italic">
                                                {profile?.name?.[0]}
                                            </AvatarFallback>
                                        </Avatar>
                                    </div>
                                </div>
                                <div className="text-center w-full px-1">
                                    <span className="text-[10px] sm:text-[11px] lg:text-[12px] font-black text-white uppercase tracking-[0.2em] lg:tracking-[0.25em] drop-shadow-2xl mb-1 block">
                                        {myStoryGroup ? 'Your Vibe' : 'ADD'}
                                    </span>
                                    {myStoryGroup && (
                                        <div className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/20 border border-primary/30">
                                            <span className="text-[8px] font-black text-primary uppercase tracking-widest whitespace-nowrap">
                                                {myStoryGroup.stories.length} POSTS
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Status Pulse for My Story */}
                        {myStoryGroup?.hasUnwatched && (
                            <div className="absolute top-4 right-4 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary-rgb),0.8)] z-20" />
                        )}
                    </m.div>

                    {/* Community Stories - PREMIUM CARDS */}
                    {otherStories.map((storyGroup: any) => (
                        <m.div
                            key={storyGroup.user._id || storyGroup.user.supabaseId}
                            whileHover={{ y: -8, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleStoryClick(storyGroup)}
                            className={cn(
                                "relative w-24 h-36 sm:w-32 sm:h-48 lg:w-36 lg:h-56 flex-shrink-0 cursor-pointer overflow-hidden rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] border border-white/10 group/story shadow-2xl transition-all duration-700 bg-slate-950",
                                storyGroup.hasUnwatched ? "ring-2 ring-primary/50 ring-offset-2 ring-offset-[#030712]" : ""
                            )}
                        >
                            {/* Story Preview or Thumbnail */}
                            <div className="absolute inset-0 overflow-hidden">
                                {storyGroup.stories[0].mediaType === 'image' ? (
                                    <img
                                        src={storyGroup.stories[0].mediaUrl}
                                        alt=""
                                        className="w-full h-full object-cover group-hover/story:scale-110 transition-transform duration-1000 grayscale group-hover/story:grayscale-0"
                                    />
                                ) : (
                                    <div className="w-full h-full relative">
                                        <video
                                            src={storyGroup.stories[0].mediaUrl}
                                            className="w-full h-full object-cover grayscale group-hover/story:grayscale-0"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                                            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 flex items-center justify-center group-hover/story:scale-110 transition-transform">
                                                <Play className="w-5 h-5 text-white/80 ml-0.5" />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Overlay Gradient Layered */}
                            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />
                            <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover/story:opacity-100 transition-opacity duration-700" />

                            {/* User Info Overlay */}
                            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between z-10">
                                <div className="flex justify-between items-center">
                                    {storyGroup.hasUnwatched ? (
                                        <div className="px-2 py-0.5 rounded-lg bg-primary/30 backdrop-blur-2xl border border-primary/40 flex items-center gap-1 shadow-lg shadow-primary/20">
                                            <div className="w-1 h-1 bg-white rounded-full animate-pulse" />
                                            <span className="text-[8px] font-black text-white uppercase tracking-tighter">NEW</span>
                                        </div>
                                    ) : <div />}

                                    <div className="w-7 h-7 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center opacity-0 group-hover/story:opacity-100 transition-all duration-500 hover:bg-rose-500/20 hover:border-rose-500/30">
                                        <Heart className="w-4 h-4 text-white/80" />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-2.5">
                                    <div className={cn(
                                        "w-11 h-11 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-[1.2rem] sm:rounded-[1.4rem] p-0.5 transition-all duration-700 group-hover/story:scale-110",
                                        storyGroup.hasUnwatched
                                            ? "bg-gradient-to-tr from-primary via-purple-500 to-rose-400 animate-gradient-xy p-1 shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)]"
                                            : "bg-white/20"
                                    )}>
                                        <div className="p-0.5 bg-[#030712] rounded-[1.1rem] sm:rounded-[1.3rem]">
                                            <Avatar className="w-full h-full rounded-[0.9rem] sm:rounded-[1.1rem]">
                                                <AvatarImage src={storyGroup.user.avatar} className="object-cover" />
                                                <AvatarFallback className="bg-slate-800 text-white font-black text-[10px] uppercase italic">
                                                    {storyGroup.user.name?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>
                                    </div>

                                    <div className="text-center w-full">
                                        <span className="text-[9px] sm:text-[10px] lg:text-[11px] font-black text-white uppercase tracking-[0.15em] drop-shadow-2xl block truncate px-1 italic">
                                            {storyGroup.user.name.split(' ')[0]}
                                        </span>
                                        <span className="text-[7px] sm:text-[8px] font-bold text-white/40 uppercase tracking-tighter mt-0.5 block">
                                            {storyGroup.stories.length} VIBES
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </m.div>
                    ))}
                </div>
            </div>

            {/* Feed Tabs - ULTIMATE PREMIUM DESIGN */}
            <div className="mx-2 p-1.5 bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[2.5rem] flex items-center gap-1.5 overflow-x-auto scrollbar-hide shadow-[0_20px_50px_-12px_rgba(0,0,0,0.9)] sticky top-2 z-40 relative group/navbar">
                {/* Subtle Technical Grid Overlay */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none bg-grid-pattern" />

                {feedTabs.map((tab, index) => (
                    <m.button
                        key={tab.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setActiveFeed(tab.id as FeedType)}
                        className={cn(
                            "flex items-center gap-2.5 px-6 py-3.5 rounded-[2rem] flex-shrink-0 text-[10px] font-black transition-all duration-500 uppercase tracking-[0.2em] relative overflow-hidden group outline-none",
                            activeFeed === tab.id
                                ? "text-white"
                                : "text-slate-500 hover:text-white"
                        )}
                    >
                        {/* Active Background Pill */}
                        {activeFeed === tab.id && (
                            <m.div
                                layoutId="activeTabPill"
                                className="absolute inset-0 bg-white/[0.07] border border-white/10 rounded-[1.6rem]"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            >
                                {/* Inner Glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-secondary/5" />
                                {/* Bottom Indicator */}
                                <div className="absolute bottom-0 inset-x-4 h-[1.5px] bg-gradient-to-r from-transparent via-primary to-transparent opacity-80" />
                            </m.div>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <tab.icon className={cn(
                            "w-3.5 h-3.5 relative z-10 transition-all duration-500",
                            activeFeed === tab.id
                                ? "text-primary scale-110 drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]"
                                : "text-slate-600 group-hover:text-slate-400"
                        )} />

                        <span className={cn(
                            "relative z-10 transition-all font-black",
                            activeFeed === tab.id ? "italic tracking-[0.25em]" : ""
                        )}>
                            {tab.label}
                        </span>
                    </m.button>
                ))}
            </div>

            {/* Create Post Component - Only show on main feed */}
            {activeFeed === 'main' && (
                <m.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="relative"
                >
                    <CreatePost />
                </m.div>
            )}

            {/* Tab Content */}
            {activeFeed === 'following' ? (
                <FollowingTab />
            ) : activeFeed === 'trending' ? (
                <TrendingTab />
            ) : activeFeed === 'trust-watch' ? (
                <TrustWatchTab />
            ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-32">
                    <div className="relative">
                        <div className="w-20 h-20 rounded-full border-2 border-primary/10 border-t-primary animate-spin" />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-2 h-2 bg-secondary rounded-full animate-ping" />
                        </div>
                    </div>
                    <p className="mt-8 text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Synchronizing Vibe...</p>
                </div>
            ) : posts.length === 0 ? (
                <m.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[#0c0c0e]/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-12 lg:p-20 text-center relative overflow-hidden group mx-3 sm:mx-0"
                >
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/20 rounded-full blur-[100px] group-hover:bg-primary/30 transition-colors duration-1000" />
                    <div className="relative">
                        <div className="w-16 h-16 sm:w-24 sm:h-24 lg:w-28 lg:h-28 mx-auto mb-6 sm:mb-8 lg:mb-10 rounded-2xl sm:rounded-[2rem] lg:rounded-[2.5rem] bg-gradient-to-br from-primary/20 to-secondary/20 border border-white/10 flex items-center justify-center shadow-inner">
                            <TrendingUp className="w-6 h-6 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-primary drop-shadow-[0_0_15px_rgba(129,140,248,0.5)]" />
                        </div>
                        <h3 className="font-heading font-extrabold text-xl sm:text-3xl lg:text-4xl text-white mb-3 sm:mb-4 tracking-tighter uppercase italic text-center">Offline Vibe</h3>
                        <p className="text-slate-500 font-medium mb-6 sm:mb-8 lg:mb-10 max-w-xs sm:max-w-sm mx-auto leading-relaxed text-[11px] sm:text-base px-2">
                            No active signals in this frequency. Be the catalyst and initiate the first broadcast.
                        </p>
                        <Button className="bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white font-bold rounded-xl sm:rounded-2xl px-6 sm:px-8 lg:px-10 h-11 sm:h-14 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-[9px] sm:text-sm border border-primary/20">
                            <Plus className="w-3.5 h-3.5 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                            Launch Content
                        </Button>
                    </div>
                </m.div>
            ) : (
                <AnimatePresence mode="popLayout">
                    <div className="space-y-8">
                        {posts.map((post, index) => (
                            <m.div
                                key={post._id}
                                initial={{ opacity: 0, y: 40, filter: "blur(10px)" }}
                                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ delay: index * 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <PostCard post={post} />
                            </m.div>
                        ))}
                    </div>
                </AnimatePresence>
            )}

            {/* Story Viewer Modal */}
            {viewerOpen && viewerStories.length > 0 && (
                <StoryViewer
                    stories={viewerStories}
                    initialIndex={viewerInitialIndex}
                    onClose={() => setViewerOpen(false)}
                    onStoryViewed={handleStoryViewed}
                />
            )}

            {/* Story Upload Dialog */}
            <AnimatePresence>
                {storyUploadOpen && (
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4"
                        onClick={() => setStoryUploadOpen(false)}
                    >
                        <m.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-sm bg-[#0c0c0e]/95 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-white/10">
                                <h3 className="text-white font-heading font-black text-lg">Add Story</h3>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setStoryUploadOpen(false)}
                                    className="text-white/70 hover:text-white"
                                >
                                    <X className="w-5 h-5" />
                                </Button>
                            </div>

                            {/* Preview */}
                            <div className="flex justify-center bg-black/20 p-2">
                                <div className="aspect-[9/16] w-full max-w-[280px] sm:max-w-sm max-h-[60vh] bg-black rounded-2xl overflow-hidden relative flex items-center justify-center shadow-2xl border border-white/5">
                                    {storyPreviewUrl && selectedStoryFile && (
                                        selectedStoryFile.type.startsWith('video/') ? (
                                            <video
                                                src={storyPreviewUrl}
                                                className="w-full h-full object-contain"
                                                autoPlay
                                                muted
                                                loop
                                                playsInline
                                            />
                                        ) : (
                                            <img
                                                src={storyPreviewUrl}
                                                alt="Story preview"
                                                className="w-full h-full object-contain"
                                            />
                                        )
                                    )}
                                    <div className="absolute top-3 left-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg flex items-center gap-1.5 border border-white/10">
                                        {selectedStoryFile?.type.startsWith('video/') ? (
                                            <Video className="w-3.5 h-3.5 text-primary" />
                                        ) : (
                                            <Image className="w-3.5 h-3.5 text-secondary" />
                                        )}
                                        <span className="text-[10px] font-black text-white uppercase tracking-tight">
                                            {selectedStoryFile?.type.startsWith('video/') ? 'Video' : 'Photo'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Caption & Actions */}
                            <div className="p-4 space-y-4">
                                <input
                                    type="text"
                                    value={storyCaption}
                                    onChange={(e) => setStoryCaption(e.target.value)}
                                    placeholder="Add a caption..."
                                    maxLength={200}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/40 focus:outline-none focus:border-primary/50"
                                />
                                <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
                                    <span>⏰ Story expires in 24 hours</span>
                                </div>
                                <Button
                                    onClick={handleStoryUpload}
                                    disabled={isUploadingStory}
                                    className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-white font-bold rounded-xl py-3 h-12 uppercase tracking-widest text-[11px]"
                                >
                                    {isUploadingStory ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Uploading...
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Share Story
                                        </>
                                    )}
                                </Button>
                            </div>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
