import { useState, useRef } from "react";
import { useParams, useNavigate } from "@tanstack/react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PostCard, type PostData } from "@/components/shared/PostCard";
import {
    MapPin, Link as LinkIcon, Calendar, Loader2, ShieldCheck,
    MessageCircle, Camera, Edit3, Grid3X3, Heart,
    UserPlus, UserMinus, Video, Play, Sparkles, Lock, X
} from "lucide-react";
import { useProfile, useUserPosts, useFollowUser, useUnfollowUser, useUserShorts, useCancelFollowRequest } from "@/api/hooks";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { FollowersModal } from "@/components/modals/FollowersModal";
import { ImageCropModal } from "@/components/ImageCropModal";
import { toast } from "sonner";
import { api } from "@/api/client";

interface ProfileData {
    _id: string;
    userId?: string;
    name: string;
    handle: string;
    avatar?: string;
    coverImage?: string;
    bio?: string;
    location?: string;
    website?: string;
    verified?: boolean;
    trustScore?: number;
    followersCount?: number;
    followingCount?: number;
    isFollowing?: boolean;
    createdAt?: string;
    postsCount?: number;
}

interface PostsPage {
    data?: {
        posts?: PostData[];
    };
}

export default function ProfilePage() {
    const params = useParams({ strict: false }) as { id?: string };
    const id = params.id;
    const navigate = useNavigate();
    const { profile: currentUserProfile, user, isLoading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState('posts');
    const [followersModalOpen, setFollowersModalOpen] = useState(false);
    const [followersModalType, setFollowersModalType] = useState<'followers' | 'following'>('followers');
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const [cropModalOpen, setCropModalOpen] = useState(false);
    const [isUploadingCover, setIsUploadingCover] = useState(false);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const isOwnProfile = !id || id === 'me' || id === currentUserProfile?._id;
    const userId = isOwnProfile ? (currentUserProfile?._id || user?.id) : id;

    const cancelRequestMutation = useCancelFollowRequest();

    // Cover image upload handler
    const handleCoverFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                toast.error('Please select an image file');
                return;
            }
            if (file.size > 10 * 1024 * 1024) {
                toast.error('Image must be less than 10MB');
                return;
            }
            setCoverImageFile(file);
            setCropModalOpen(true);
        }
        // Reset input so same file can be selected again
        if (e.target) e.target.value = '';
    };

    const handleCoverSave = async (blob: Blob) => {
        setIsUploadingCover(true);
        try {
            const formData = new FormData();
            formData.append('coverImage', blob, 'cover.jpg');

            const response = await api.patch('/users/me/cover', formData) as { success: boolean; error?: { message: string } };
            if (response.success) {
                toast.success('Cover image updated!');
                // Refresh profile data
                window.location.reload();
            } else {
                throw new Error(response.error?.message || 'Failed to upload');
            }
        } catch (error: any) {
            console.error('Cover upload failed:', error);
            toast.error(error.message || 'Failed to upload cover image');
        } finally {
            setIsUploadingCover(false);
            setCoverImageFile(null);
        }
    };


    const { data: profileData, isLoading: loadingProfile } = useProfile(
        isOwnProfile ? '' : (userId || '')
    );
    const { data: postsData, isLoading: loadingPosts } = useUserPosts(userId || '');
    const { data: shortsData, isLoading: loadingShorts } = useUserShorts(userId || '');
    const followMutation = useFollowUser();
    const unfollowMutation = useUnfollowUser();

    // Fix: Extract profile from data.profile (backend returns { data: { profile, isFollowing, hasPendingRequest } })
    const profileResponse = profileData as { data?: { profile?: ProfileData; isFollowing?: boolean; hasPendingRequest?: boolean; isOwner?: boolean } } | undefined;
    const apiProfile: ProfileData | null = profileResponse?.data?.profile || null;
    const apiIsFollowing = profileResponse?.data?.isFollowing ?? false;
    const hasPendingRequest = profileResponse?.data?.hasPendingRequest ?? false;


    const supabaseUserProfile: ProfileData | null = user ? {
        _id: user.id,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'User',
        handle: user.email?.split('@')[0]?.toLowerCase().replace(/[^a-z0-9_]/g, '') || 'user',
        avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
        bio: '',
        trustScore: 50,
        followersCount: 0,
        followingCount: 0,
    } : null;

    const profile: ProfileData | null = isOwnProfile
        ? (currentUserProfile ? {
            _id: currentUserProfile._id,
            name: currentUserProfile.name,
            handle: currentUserProfile.handle,
            avatar: currentUserProfile.avatar,
            coverImage: currentUserProfile.coverImage,
            bio: currentUserProfile.bio,
            location: currentUserProfile.location,
            website: currentUserProfile.website,
            verified: currentUserProfile.verified,
            trustScore: currentUserProfile.trustScore,
            followersCount: currentUserProfile.followersCount || currentUserProfile.followers,
            followingCount: currentUserProfile.followingCount || currentUserProfile.following,
            userId: currentUserProfile.userId,
            isFollowing: false, // Own profile, not applicable
        } : supabaseUserProfile)
        : apiProfile ? { ...apiProfile, isFollowing: apiIsFollowing } : null;

    const posts: PostData[] = (postsData?.pages as PostsPage[] | undefined)?.flatMap(p => p?.data?.posts || []) || [];
    const userShorts = (shortsData as { data?: { shorts?: any[] } })?.data?.shorts || [];

    // Debug profile data
    console.log('[ProfilePage] Debug:', { userId, isOwnProfile, profileData, apiProfile, profile, hasPendingRequest });

    const isLoading = isOwnProfile ? (authLoading && !user) : loadingProfile;


    const handleFollow = async () => {
        if (!userId) return;
        try {
            if (profile?.isFollowing) {
                await unfollowMutation.mutateAsync(userId);
            } else {
                await followMutation.mutateAsync(userId);
            }
        } catch (error) {
            console.error('Follow action failed:', error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center min-h-[60vh] gap-4">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                <p className="text-slate-400 font-medium">Loading profile...</p>
            </div>
        );
    }

    const displayProfile = profile || {
        _id: '',
        name: 'User',
        handle: 'user',
        avatar: '',
        bio: '',
        trustScore: 0,
        followersCount: 0,
        followingCount: 0,
        postsCount: 0,
    };

    // Determine if content should be locked (not own profile AND not following AND not pending)
    const isFollowing = profile?.isFollowing || false;
    // Content stays locked even if pending request
    const isContentLocked = !isOwnProfile && !isFollowing;

    const openFollowersModal = (type: 'followers' | 'following') => {
        setFollowersModalType(type);
        setFollowersModalOpen(true);
    };

    const handleCancelRequest = async () => {
        if (!userId) return;
        try {
            await cancelRequestMutation.mutateAsync(userId);
            toast.success('Follow request cancelled');
        } catch (error) {
            toast.error('Failed to cancel request');
        }
    };

    const joinDate = profile?.createdAt
        ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'Recently';

    const trustScore = displayProfile.trustScore ?? 50;
    const stats = [
        { label: 'Posts', value: isContentLocked ? '—' : (displayProfile.postsCount || posts.length || 0), clickable: false },
        { label: 'Followers', value: displayProfile.followersCount || 0, clickable: !isContentLocked, onClick: () => openFollowersModal('followers') },
        { label: 'Following', value: isContentLocked ? '—' : (displayProfile.followingCount || 0), clickable: !isContentLocked, onClick: () => openFollowersModal('following') },
    ];

    return (
        <>
            <div className="max-w-6xl mx-auto pb-24 lg:pb-8 relative">
                {/* Header / Cover Area */}
                <div className="relative mb-16 px-4 md:px-0">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="h-40 sm:h-56 md:h-72 lg:h-80 rounded-2xl sm:rounded-[2rem] md:rounded-[2.5rem] relative overflow-hidden group shadow-[0_32px_80px_-20px_rgba(0,0,0,0.6)]"
                    >
                        {/* Cover Image or Aurora Background */}
                        {displayProfile.coverImage ? (
                            <img
                                src={displayProfile.coverImage}
                                alt="Cover"
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#030712] via-[#0a0f1a] to-[#050918]">
                                <div className="absolute -top-[20%] -left-[10%] w-[80%] h-[80%] bg-indigo-500/30 rounded-full blur-[120px] opacity-40" />
                                <div className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-emerald-500/20 rounded-full blur-[100px] opacity-30" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

                        {/* Cover Actions */}
                        <div className="absolute bottom-3 sm:bottom-4 md:bottom-6 right-3 sm:right-4 md:right-6 flex gap-2 sm:gap-3 z-30">
                            {isOwnProfile ? (
                                <>
                                    <Button
                                        size="icon"
                                        onClick={() => coverInputRef.current?.click()}
                                        disabled={isUploadingCover}
                                        className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 rounded-xl sm:rounded-2xl w-9 h-9 sm:w-11 sm:h-11 shadow-2xl"
                                        title="Change cover"
                                    >
                                        {isUploadingCover ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Camera className="w-4 h-4" />
                                        )}
                                    </Button>
                                    <input
                                        ref={coverInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleCoverFileSelect}
                                        className="hidden"
                                    />
                                    <Button
                                        onClick={() => navigate({ to: '/app/settings' })}
                                        className="bg-white/10 backdrop-blur-xl border border-white/20 text-white hover:bg-white/20 rounded-xl sm:rounded-2xl h-9 sm:h-11 px-3 sm:px-6 gap-1.5 sm:gap-2.5 font-bold text-[10px] sm:text-xs shadow-2xl transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
                                        <span className="hidden sm:inline">Edit Profile</span>
                                        <span className="sm:hidden">Edit</span>
                                    </Button>
                                </>
                            ) : (
                                <div className="flex gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate({ to: '/app/chat', search: { userId: profile?.userId || profile?._id } })}
                                        className={cn(
                                            "backdrop-blur-xl border rounded-2xl w-11 h-11 shadow-2xl transition-all hover:scale-110",
                                            isFollowing
                                                ? "bg-white/10 border-white/20 hover:bg-white/20 text-white"
                                                : "bg-primary/20 border-primary/30 text-primary hover:bg-primary/30"
                                        )}
                                        title={isFollowing ? "Send message" : "Follow to message"}
                                    >
                                        <MessageCircle className="w-5 h-5" />
                                    </Button>
                                    <Button
                                        onClick={hasPendingRequest ? handleCancelRequest : handleFollow}
                                        disabled={followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending}
                                        className={cn(
                                            "rounded-2xl h-11 px-8 gap-2.5 font-bold text-xs shadow-2xl transition-all",
                                            isFollowing
                                                ? "bg-white/10 border border-white/20 text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                                : hasPendingRequest
                                                    ? "bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/30"
                                                    : "bg-primary text-white shadow-primary/30 hover:scale-105 active:scale-95"
                                        )}
                                    >
                                        {followMutation.isPending || unfollowMutation.isPending || cancelRequestMutation.isPending ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : isFollowing ? (
                                            <>
                                                <UserMinus className="w-4 h-4" />
                                                Following
                                            </>
                                        ) : hasPendingRequest ? (
                                            <>
                                                <X className="w-4 h-4" />
                                                Cancel Request
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="w-4 h-4" />
                                                Follow
                                            </>
                                        )}
                                    </Button>

                                </div>
                            )}
                        </div>
                    </motion.div>

                    {/* Avatar Section */}
                    <div className="absolute -bottom-12 sm:-bottom-14 md:-bottom-16 left-3 sm:left-6 md:left-12 z-40">
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="relative group"
                        >
                            <Avatar className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 lg:w-48 lg:h-48 border-4 sm:border-[6px] md:border-[8px] border-[#020617] rounded-2xl sm:rounded-[2rem] md:rounded-[3rem] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.5)] transition-transform duration-500 group-hover:scale-105">
                                <AvatarImage src={displayProfile.avatar} className="object-cover" />
                                <AvatarFallback className="text-2xl sm:text-4xl md:text-5xl bg-gradient-to-br from-primary via-indigo-600 to-primary text-white font-bold italic">
                                    {displayProfile.name?.[0]?.toUpperCase() || '?'}
                                </AvatarFallback>
                            </Avatar>
                            {isOwnProfile && (
                                <button
                                    className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-primary text-white shadow-xl shadow-primary/40 border border-primary/50 z-10 hover:scale-110 active:scale-95 transition-transform"
                                >
                                    <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                                </button>
                            )}
                        </motion.div>
                    </div>
                </div>

                {/* Profile Info & Content Grid */}
                <div className="px-4 sm:px-6 md:px-12 mt-14 sm:mt-16 md:mt-20">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 lg:gap-12">
                        {/* Profile Stats & Bio Column */}
                        <div className="lg:col-span-4 space-y-6 sm:space-y-8 lg:space-y-10">
                            <section className="space-y-6">
                                <div>
                                    <div className="flex items-center gap-2 sm:gap-3 mb-1">
                                        <h1 className="font-bold text-2xl sm:text-3xl md:text-4xl text-white tracking-tight">
                                            {displayProfile.name}
                                        </h1>
                                        {displayProfile.verified && (
                                            <div className="bg-primary/20 p-1 rounded-full border border-primary/20">
                                                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-primary fill-primary/10" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm sm:text-base text-slate-500 font-medium">@{displayProfile.handle}</span>
                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">Member</span>
                                    </div>
                                </div>

                                {/* Trust Level Card */}
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-7 group relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -mr-10 -mt-10" />
                                    <div className="flex items-center justify-between mb-5">
                                        <div className="flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-primary" />
                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Trust Level</span>
                                        </div>
                                        <div className={cn(
                                            "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest",
                                            trustScore >= 80 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-primary/10 text-primary border border-primary/20"
                                        )}>
                                            {trustScore >= 80 ? "Certified" : "Authentic"}
                                        </div>
                                    </div>
                                    <div className="flex items-end gap-2.5 mb-5">
                                        <span className="text-5xl font-bold text-white tracking-tighter tabular-nums">{trustScore}</span>
                                        <span className="text-sm font-bold text-slate-500 mb-2">/ 100</span>
                                    </div>
                                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${trustScore}%` }}
                                            transition={{ duration: 1.2, ease: "easeOut" }}
                                            className={cn("h-full rounded-full relative", trustScore >= 80 ? "bg-gradient-to-r from-emerald-500 to-primary" : "bg-primary")}
                                        >
                                            <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                        </motion.div>
                                    </div>
                                </motion.div>

                                {/* Bio & Links */}
                                <div className="space-y-6 px-2">
                                    {displayProfile.bio && (
                                        <p className="text-slate-300 font-medium leading-[1.6] text-base">
                                            {displayProfile.bio}
                                        </p>
                                    )}

                                    <div className="grid grid-cols-1 gap-4">
                                        {displayProfile.location && (
                                            <div className="flex items-center gap-3.5 text-slate-400 font-medium text-sm">
                                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-primary" />
                                                </div>
                                                {displayProfile.location}
                                            </div>
                                        )}
                                        {displayProfile.website && (
                                            <a
                                                href={displayProfile.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-3.5 text-slate-400 font-medium text-sm hover:text-primary transition-colors group"
                                            >
                                                <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center transition-colors group-hover:border-primary/50 group-hover:bg-primary/5">
                                                    <LinkIcon className="w-4 h-4" />
                                                </div>
                                                {(displayProfile.website as string).replace(/^https?:\/\//, '')}
                                            </a>
                                        )}
                                        <div className="flex items-center gap-3.5 text-slate-400 font-medium text-sm">
                                            <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                                                <Calendar className="w-4 h-4 text-slate-500" />
                                            </div>
                                            Joined {joinDate}
                                        </div>
                                    </div>
                                </div>

                                {/* Stats Card */}
                                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-3 flex gap-2">
                                    {stats.map((stat) => (
                                        <div
                                            key={stat.label}
                                            onClick={stat.clickable ? stat.onClick : undefined}
                                            className={cn(
                                                "flex-1 py-4 text-center rounded-2xl transition-colors",
                                                stat.clickable
                                                    ? "hover:bg-white/10 cursor-pointer active:scale-95"
                                                    : "hover:bg-white/5"
                                            )}
                                        >
                                            <div className="text-2xl font-bold text-white tabular-nums tracking-tight">
                                                {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">{stat.label}</div>
                                        </div>
                                    ))}
                                </div>

                            </section>
                        </div>

                        {/* Content Column */}
                        <div className="lg:col-span-8">
                            {isContentLocked ? (
                                /* Locked Content Overlay */
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-[3rem] p-16 text-center relative overflow-hidden"
                                >
                                    {/* Background effects */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

                                    <div className="relative z-10">
                                        <motion.div
                                            initial={{ scale: 0.8 }}
                                            animate={{ scale: 1 }}
                                            transition={{ type: "spring", bounce: 0.3 }}
                                            className="w-28 h-28 mx-auto mb-8 rounded-[2.5rem] bg-white/5 border border-white/10 flex items-center justify-center"
                                        >
                                            <Lock className="w-12 h-12 text-slate-500" />
                                        </motion.div>

                                        <h3 className="font-heading font-black text-3xl text-white mb-4 tracking-tight italic uppercase">
                                            Profile Locked
                                        </h3>
                                        <p className="text-slate-400 text-base max-w-sm mx-auto leading-relaxed mb-8">
                                            Follow <span className="text-primary font-bold">@{displayProfile.handle}</span> to see their posts, shorts, and full profile information.
                                        </p>

                                        <Button
                                            onClick={handleFollow}
                                            disabled={followMutation.isPending}
                                            className="bg-gradient-to-r from-primary via-primary to-secondary text-white rounded-2xl h-14 px-12 gap-3 font-bold text-sm uppercase tracking-wider shadow-xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            {followMutation.isPending ? (
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                            ) : (
                                                <>
                                                    <UserPlus className="w-5 h-5" />
                                                    Follow to Unlock
                                                </>
                                            )}
                                        </Button>

                                        <div className="flex items-center justify-center gap-6 mt-10 text-slate-500">
                                            <div className="flex items-center gap-2">
                                                <Grid3X3 className="w-4 h-4" />
                                                <span className="text-sm font-medium">Posts Hidden</span>
                                            </div>
                                            <div className="w-1 h-1 rounded-full bg-slate-600" />
                                            <div className="flex items-center gap-2">
                                                <Video className="w-4 h-4" />
                                                <span className="text-sm font-medium">Shorts Hidden</span>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-2xl p-1.5 flex h-auto mb-10">
                                        <TabsTrigger
                                            value="posts"
                                            className="flex-1 gap-2.5 py-3 hover:text-white transition-all rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                                        >
                                            <Grid3X3 className="w-4 h-4" />
                                            Posts
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="shorts"
                                            className="flex-1 gap-2.5 py-3 hover:text-white transition-all rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                                        >
                                            <Video className="w-4 h-4" />
                                            Shorts
                                        </TabsTrigger>
                                        <TabsTrigger
                                            value="likes"
                                            className="flex-1 gap-2.5 py-3 hover:text-white transition-all rounded-xl font-bold text-sm data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg"
                                        >
                                            <Heart className="w-4 h-4" />
                                            Likes
                                        </TabsTrigger>
                                    </TabsList>

                                    <AnimatePresence mode="wait">
                                        <TabsContent value="posts" key="posts" className="mt-0 outline-none">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="space-y-6"
                                            >
                                                {loadingPosts ? (
                                                    <div className="flex justify-center py-20">
                                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                    </div>
                                                ) : posts.length === 0 ? (
                                                    <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-24 text-center">
                                                        <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Grid3X3 className="w-10 h-10 text-slate-600" />
                                                        </div>
                                                        <h3 className="font-bold text-2xl text-white mb-3 tracking-tight">No posts yet</h3>
                                                        <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                                                            {isOwnProfile ? "Share your first post with the community!" : "This user hasn't shared anything yet."}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    posts.map((post, index) => (
                                                        <motion.div
                                                            key={post._id}
                                                            initial={{ opacity: 0, scale: 0.98, y: 20 }}
                                                            whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                                            viewport={{ once: true }}
                                                            transition={{ delay: index * 0.05 }}
                                                        >
                                                            <PostCard post={post} />
                                                        </motion.div>
                                                    ))
                                                )}
                                            </motion.div>
                                        </TabsContent>

                                        <TabsContent value="shorts" key="shorts" className="mt-0 outline-none">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                            >
                                                {loadingShorts ? (
                                                    <div className="flex justify-center py-20">
                                                        <Loader2 className="w-10 h-10 animate-spin text-primary" />
                                                    </div>
                                                ) : userShorts.length === 0 ? (
                                                    <div className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-24 text-center">
                                                        <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10">
                                                            <Video className="w-10 h-10 text-slate-600" />
                                                        </div>
                                                        <h3 className="font-bold text-2xl text-white mb-3 tracking-tight">No shorts</h3>
                                                        <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                                                            {isOwnProfile ? "Post your first short to get started!" : "No video shorts available here."}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                                                        {userShorts.map((short: any, index: number) => (
                                                            <motion.div
                                                                key={short._id}
                                                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                                                whileInView={{ opacity: 1, scale: 1, y: 0 }}
                                                                viewport={{ once: true }}
                                                                transition={{ delay: index * 0.05 }}
                                                                onClick={() => navigate({ to: '/app/shorts', search: { id: short._id } })}
                                                                className="aspect-[9/16] relative rounded-[2.5rem] overflow-hidden bg-slate-900 border border-white/10 cursor-pointer group shadow-2xl"
                                                            >
                                                                {short.thumbnailUrl ? (
                                                                    <img
                                                                        src={short.thumbnailUrl}
                                                                        alt={short.caption}
                                                                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full bg-gradient-to-br from-[#0f172a] to-[#020617] flex items-center justify-center">
                                                                        <Video className="w-10 h-10 text-primary/10" />
                                                                    </div>
                                                                )}

                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-70 group-hover:opacity-60 transition-opacity" />

                                                                <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between z-20">
                                                                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10">
                                                                        <Play className="w-3.5 h-3.5 text-white fill-white" />
                                                                        <span className="text-[11px] font-bold text-white tabular-nums">
                                                                            {short.viewsCount > 1000 ? (short.viewsCount / 1000).toFixed(1) + 'K' : short.viewsCount}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 bg-black/50 backdrop-blur-xl px-3 py-1.5 rounded-xl border border-white/10">
                                                                        <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                                                        <span className="text-[11px] font-bold text-white tabular-nums">
                                                                            {short.likesCount > 1000 ? (short.likesCount / 1000).toFixed(1) + 'K' : short.likesCount}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-500">
                                                                    <div className="w-16 h-16 rounded-full bg-primary/20 backdrop-blur-2xl border border-primary/40 flex items-center justify-center scale-75 group-hover:scale-100 transition-transform">
                                                                        <Play className="w-7 h-7 text-white fill-white ml-1.5" />
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        </TabsContent>

                                        <TabsContent value="likes" key="likes" className="mt-0 outline-none">
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-white/[0.03] border border-white/10 rounded-[3rem] p-24 text-center"
                                            >
                                                <div className="w-24 h-24 mx-auto mb-8 rounded-[2rem] bg-white/5 flex items-center justify-center border border-white/10">
                                                    <Heart className="w-10 h-10 text-slate-600" />
                                                </div>
                                                <h3 className="font-bold text-2xl text-white mb-3 tracking-tight">Privacy Protected</h3>
                                                <p className="text-slate-400 text-sm max-w-[280px] mx-auto leading-relaxed">
                                                    {isOwnProfile ? "Your liked posts are only visible to you." : "This user's resonance history is private."}
                                                </p>
                                            </motion.div>
                                        </TabsContent>
                                    </AnimatePresence>
                                </Tabs>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Followers/Following Modal */}
            <FollowersModal
                isOpen={followersModalOpen}
                onClose={() => setFollowersModalOpen(false)}
                userId={userId || ''}
                type={followersModalType}
                currentUserId={currentUserProfile?._id}
            />

            {/* Cover Image Crop Modal */}
            <ImageCropModal
                isOpen={cropModalOpen}
                onClose={() => {
                    setCropModalOpen(false);
                    setCoverImageFile(null);
                }}
                onSave={handleCoverSave}
                imageFile={coverImageFile}
                aspectRatio={16 / 5}
                title="Edit Cover Image"
            />
        </>
    );
}
