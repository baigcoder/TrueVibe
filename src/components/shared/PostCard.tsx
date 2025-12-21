import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { TrustBadge } from "./TrustBadge";
import {
    Heart, MessageCircle, Share2, MoreHorizontal, Bookmark,
    ShieldCheck, Sparkles, Trash2, Edit2, AlertCircle, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    useLikePost, useUnlikePost, useDeletePost,
    useUpdatePost, useRecordView
} from "@/api/hooks";
import { PostAnalytics } from "./PostAnalytics";
import { TipButton } from "./TipButton";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { CommentSection } from "./CommentSection";
import { Textarea } from "@/components/ui/textarea";

// Flexible post type that works with both mock data and API responses
export interface PostData {
    id?: string;
    _id?: string;
    userId?: string | { _id: string; name?: string; handle?: string; avatar?: string; userId?: string };
    author?: { _id: string; name?: string; handle?: string; avatar?: string; userId?: string };
    content: string;
    image?: string;
    media?: Array<{ url?: string; type?: string }>;
    video?: string;
    timestamp?: string;
    createdAt?: string;
    likes?: number | string[];  // Can be count OR array of user IDs
    likesCount?: number;
    comments?: unknown[];
    commentsCount?: number;
    shares?: number;
    sharesCount?: number;
    trustLevel?: 'authentic' | 'suspicious' | 'fake' | 'pending' | 'likely_fake' | 'AUTHENTIC' | 'SUSPICIOUS' | 'LIKELY_FAKE' | 'PENDING';
    trustScore?: number;
    isLiked?: boolean;
    isSaved?: boolean;
    // AI Analysis details
    aiAnalysis?: {
        fakeScore?: number;
        realScore?: number;
        classification?: string;
        confidence?: number;
        processingTimeMs?: number;
        framesAnalyzed?: number;
        mediaType?: 'image' | 'video';
    };
}

interface PostCardProps {
    post: PostData;
}

export function PostCard({ post }: PostCardProps) {
    const { profile } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);

    const likePost = useLikePost();
    const unlikePost = useUnlikePost();
    const deletePost = useDeletePost();
    const updatePost = useUpdatePost();
    const recordView = useRecordView();

    // Handle both userId as string (mock) or object (API)
    const author = typeof post.userId === 'object'
        ? post.userId
        : post.author
            ? post.author
            : null;

    const postId = post._id || post.id || '';

    // Get the post owner ID from all possible sources
    const getPostOwnerId = (): string | undefined => {
        // If userId is a populated object
        if (typeof post.userId === 'object' && post.userId) {
            return (post.userId as any)._id || (post.userId as any).id;
        }
        // If userId is a string
        if (typeof post.userId === 'string') {
            return post.userId;
        }
        // If author exists
        if (author?._id) {
            return author._id;
        }
        // Fallback to any user/userId field
        return (post as any).user || (post as any).userId;
    };

    const postOwnerId = getPostOwnerId();

    // Get current user's Supabase ID from profile
    // Profile.userId or Profile.supabaseId contains the Supabase user ID
    const currentUserSupabaseId = profile?.userId || profile?.supabaseId;

    // Ownership check: compare Supabase IDs
    // Also check profile._id as fallback in case the post.userId was populated with Profile object
    const isOwner = !!postOwnerId && (
        (!!currentUserSupabaseId && currentUserSupabaseId === postOwnerId) ||
        (!!profile?._id && profile._id === postOwnerId)
    );

    useEffect(() => {
        setEditContent(post.content);
    }, [post.content]);

    // Record view once on mount
    useEffect(() => {
        if (postId) {
            recordView.mutate(postId);
        }
    }, [postId]);

    const handleEditSave = async () => {
        if (!postId || !editContent.trim() || updatePost.isPending) return;
        try {
            await updatePost.mutateAsync({ postId, content: editContent.trim() });
            setIsEditing(false);
        } catch (error) {
            console.error("Failed to update post:", error);
        }
    };

    const handleLike = async () => {
        if (!postId) return;
        if (post.isLiked) {
            await unlikePost.mutateAsync(postId);
        } else {
            await likePost.mutateAsync(postId);
        }
    };

    const handleDelete = () => {
        if (!postId) return;
        setIsDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!postId) return;
        try {
            await deletePost.mutateAsync(postId);
            setIsDeleteDialogOpen(false);
        } catch (error) {
            console.error("Failed to delete post:", error);
        }
    };

    const userName = author?.name || 'Unknown User';
    const userHandle = author?.handle || 'unknown';
    const userAvatar = author?.avatar;
    const timestamp = post.timestamp || (post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Just now');

    // Handle different property names for counts
    // likes can be a number OR an array of user IDs
    const likesCount = typeof post.likes === 'number'
        ? post.likes
        : (post.likesCount ?? (Array.isArray(post.likes) ? post.likes.length : 0));
    const commentsCount = Array.isArray(post.comments) ? post.comments.length : (post.commentsCount ?? 0);

    // Normalize trust level (pending = still analyzing)
    const rawTrustLevel = (post.trustLevel?.toLowerCase() || 'authentic');
    const normalizedTrust = rawTrustLevel === 'pending'
        ? 'pending'
        : rawTrustLevel.includes('fake')
            ? (rawTrustLevel === 'likely_fake' ? 'likely_fake' : 'fake')
            : rawTrustLevel as 'authentic' | 'suspicious' | 'fake' | 'pending' | 'likely_fake';
    const trustScore = post.trustScore || (normalizedTrust === 'authentic' ? 95 : normalizedTrust === 'suspicious' ? 60 : 30);

    // Get image from media array or direct property
    const postImage = post.image || (post.media?.find(m => m.type === 'image')?.url);
    // Get video from media array or direct property
    const postVideo = post.video || (post.media?.find(m => m.type === 'video')?.url);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
            <Card className="bg-slate-900/80 backdrop-blur-xl border border-white/10 hover:bg-slate-900/90 hover:border-white/20 transition-all duration-500 overflow-hidden shadow-2xl rounded-[1.5rem] sm:rounded-[2rem]">
                <CardHeader className="flex flex-row items-start gap-3 sm:gap-4 p-4 sm:p-5 pb-3 space-y-0">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-secondary/20 rounded-full blur-md opacity-50 transition-all group-hover:bg-secondary/40" />
                        <Avatar className="h-11 w-11 border border-white/10 relative z-10">
                            <AvatarImage src={userAvatar} alt={userName} />
                            <AvatarFallback className="bg-slate-900 text-slate-400 font-bold italic text-xs">
                                {userName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-heading font-black italic uppercase text-sm tracking-[-0.02em] text-white truncate">{userName}</span>
                                    {normalizedTrust === 'authentic' && (
                                        <ShieldCheck className="w-3.5 h-3.5 text-secondary shadow-glow-secondary" />
                                    )}
                                </div>
                                <div className="flex items-center gap-2.5 mt-0.5">
                                    <span className="font-display font-bold uppercase text-[9px] tracking-[0.1em] text-slate-500 truncate">@{userHandle}</span>
                                    <span className="w-1 h-1 bg-white/10 rounded-full" />
                                    <span className="font-display font-black uppercase text-[8px] tracking-[0.05em] text-slate-600 truncate">{timestamp}</span>
                                </div>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-white/5 flex-shrink-0 transition-colors">
                                        <div className="relative">
                                            {(likePost.isPending || unlikePost.isPending) && (
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
                                                </div>
                                            )}
                                            <MoreHorizontal className="w-5 h-5" />
                                        </div>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-slate-900/90 backdrop-blur-xl border-white/10 glass-premium">
                                    {isOwner && (
                                        <DropdownMenuItem
                                            onClick={() => setIsEditing(true)}
                                            className="gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-white/5"
                                        >
                                            <Edit2 className="w-3.5 h-3.5" />
                                            Modify Signal
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem className="gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer hover:bg-white/5">
                                        <Bookmark className="w-3.5 h-3.5" />
                                        Save Signal
                                    </DropdownMenuItem>
                                    {isOwner && (
                                        <>
                                            <DropdownMenuSeparator className="bg-white/5" />
                                            <DropdownMenuItem
                                                onClick={handleDelete}
                                                className="gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-500"
                                            >
                                                {deletePost.isPending ? (
                                                    <div className="w-3.5 h-3.5 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
                                                ) : (
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                )}
                                                Erase Link
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {!isOwner && (
                                        <>
                                            <DropdownMenuSeparator className="bg-white/5" />
                                            <DropdownMenuItem className="gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer text-orange-500 hover:bg-orange-500/10 focus:bg-orange-500/10 focus:text-orange-500">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                Flag Vibe
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-5 pb-4 space-y-4">
                    {/* AI Analysis Badge - show for all non-authentic or when analysis exists */}
                    {(normalizedTrust !== 'authentic' || post.aiAnalysis) && (
                        <div className="flex items-center gap-2">
                            <TrustBadge
                                level={normalizedTrust}
                                score={Math.round(100 - (post.trustScore ?? (post.aiAnalysis?.fakeScore ? post.aiAnalysis.fakeScore * 100 : 0)))}
                                analysisDetails={post.aiAnalysis ? {
                                    fakeScore: post.aiAnalysis.fakeScore,
                                    realScore: post.aiAnalysis.realScore,
                                    framesAnalyzed: post.aiAnalysis.framesAnalyzed,
                                    processingTime: post.aiAnalysis.processingTimeMs,
                                    mediaType: post.aiAnalysis.mediaType || (postVideo ? 'video' : 'image'),
                                    classification: post.aiAnalysis.classification
                                } : undefined}
                            />
                        </div>
                    )}

                    {isEditing ? (
                        <div className="space-y-3 mt-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[100px] bg-white/[0.05] border-primary/30 rounded-2xl text-[15px] p-4 focus:ring-2 focus:ring-primary/20 transition-all resize-none font-sans"
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(post.content);
                                    }}
                                    className="h-9 px-5 text-[10px] font-black uppercase tracking-widest hover:bg-white/5 rounded-xl"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleEditSave}
                                    disabled={updatePost.isPending || !editContent.trim()}
                                    className="h-9 px-5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 text-[10px] font-black uppercase tracking-widest rounded-xl"
                                >
                                    {updatePost.isPending ? "Broadcasting..." : "Confirm Update"}
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[15px] leading-relaxed font-sans text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                    )}

                    {postImage && (
                        <div className="rounded-2xl overflow-hidden mt-4 bg-muted/20 border border-white/5 group relative">
                            <img
                                src={postImage}
                                alt="Post content"
                                className="w-full h-auto object-cover max-h-[350px] transition-all duration-700 group-hover:scale-[1.02]"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent transition-opacity group-hover:opacity-0" />
                        </div>
                    )}

                    {postVideo && (
                        <div className="rounded-2xl overflow-hidden mt-4 bg-black border border-white/5 relative">
                            <video
                                src={postVideo}
                                controls
                                playsInline
                                className="w-full h-auto max-h-[350px]"
                            />
                        </div>
                    )}

                    {/* Trust Score Indicator */}
                    {normalizedTrust === 'authentic' && (
                        <div className="flex items-center gap-2 pt-1">
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/5 border border-secondary/20 text-secondary transition-all hover:bg-secondary/10 group/trust">
                                <Sparkles className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                <span className="font-heading font-black italic uppercase text-[9px] tracking-[0.2em]">VERIFIED_INDEX: {trustScore}</span>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="px-3 sm:px-4 py-3 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleLike}
                            disabled={likePost.isPending || unlikePost.isPending}
                            className={cn(
                                "gap-2 px-3 h-10 rounded-xl text-slate-500 transition-all duration-300 hover:bg-rose-500/10 hover:text-rose-400 group",
                                post.isLiked && "text-rose-500 bg-rose-500/5"
                            )}
                        >
                            <Heart className={cn("w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110", post.isLiked && "fill-current scale-110")} />
                            <span className="font-display font-medium text-[11px] uppercase tracking-wider">{likesCount}</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowComments(!showComments)}
                            className={cn(
                                "gap-2 px-3 h-10 rounded-xl text-slate-500 transition-all duration-300 hover:bg-primary/10 hover:text-primary group",
                                showComments && "text-primary bg-primary/5"
                            )}
                        >
                            <MessageCircle className={cn("w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110", showComments && "fill-current scale-110")} />
                            <span className="font-display font-medium text-[11px] uppercase tracking-wider">{commentsCount}</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="gap-2 px-3 h-10 rounded-xl text-slate-500 transition-all duration-300 hover:bg-secondary/10 hover:text-secondary group">
                            <Share2 className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110" />
                        </Button>
                        {isOwner && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAnalytics(true)}
                                className="gap-2 px-3 h-10 rounded-xl text-slate-500 transition-all duration-300 hover:bg-primary/10 hover:text-primary group"
                                title="View Insights"
                            >
                                <BarChart3 className="w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110 shadow-glow-primary" />
                            </Button>
                        )}
                        <TipButton authorName={userName} />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                            "h-10 w-10 rounded-xl text-slate-500 transition-all duration-300 hover:bg-white/5 group",
                            post.isSaved && "text-accent bg-accent/5"
                        )}
                    >
                        <Bookmark className={cn("w-4.5 h-4.5 transition-transform duration-300 group-hover:scale-110", post.isSaved && "fill-current scale-110")} />
                    </Button>
                </CardFooter>

                <AnimatePresence>
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden bg-black/20"
                        >
                            <div className="p-4 pt-0">
                                <CommentSection postId={postId} />
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-[425px] bg-slate-900/95 backdrop-blur-2xl border-white/10 glass-premium p-0 overflow-hidden rounded-[2rem]">
                    <div className="p-8 space-y-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center mx-auto ring-1 ring-rose-500/20">
                            <Trash2 className="w-8 h-8 text-rose-500" />
                        </div>

                        <div className="space-y-2 text-center">
                            <h2 className="font-heading font-black italic uppercase text-2xl tracking-tight text-white">Erase Signal?</h2>
                            <p className="text-slate-400 text-sm font-medium leading-relaxed">
                                This action will permanently terminate the data link. This cannot be reversed.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2">
                            <Button
                                variant="ghost"
                                onClick={() => setIsDeleteDialogOpen(false)}
                                className="h-14 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 font-bold uppercase text-xs tracking-widest transition-all"
                            >
                                Maintain
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                disabled={deletePost.isPending}
                                className="h-14 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-rose-500/20 transition-all disabled:opacity-50"
                            >
                                {deletePost.isPending ? (
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Erasing...</span>
                                    </div>
                                ) : (
                                    "Erase Link"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <PostAnalytics
                postId={postId}
                isOpen={showAnalytics}
                onClose={() => setShowAnalytics(false)}
            />
        </motion.div>
    );
}
