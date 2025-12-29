import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { TrustBadge } from "./TrustBadge";
import { AIReportModal } from "./AIReportModal";
import {
    Heart, MessageCircle, Share2, MoreHorizontal, Bookmark,
    ShieldCheck, Trash2, Edit2, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
    useLikePost, useUnlikePost, useDeletePost,
    useUpdatePost, useRecordView
} from "@/api/hooks";
import { useNavigate } from "@tanstack/react-router";
import { useAIReport } from "@/hooks/useAIReport";
import { useDownloadPDFReport, useEmailReport } from "@/hooks/useDownloadReport";
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
import { useAIAnalysisUpdate } from "@/context/SocketContext";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
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
    media?: Array<{ url?: string; type?: string; optimizedUrl?: string }>;
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
        // v5 enhanced fields
        facesDetected?: number;
        avgFaceScore?: number;
        avgFftScore?: number;
        avgEyeScore?: number;
        fftBoost?: number;
        eyeBoost?: number;
        temporalBoost?: number;
        analysisDetails?: {
            faceDetection?: { detected: boolean; confidence: number };
            audioAnalysis?: { detected: boolean; confidence: number };
            temporalConsistency?: number;
            compressionArtifacts?: number;
        };
    };
}

interface PostCardProps {
    post: PostData;
}

export function PostCard({ post }: PostCardProps) {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const [showComments, setShowComments] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(post.content);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [showAnalytics, setShowAnalytics] = useState(false);
    const [showReportModal, setShowReportModal] = useState(false);

    const likePost = useLikePost();
    const unlikePost = useUnlikePost();
    const deletePost = useDeletePost();
    const updatePost = useUpdatePost();
    const recordView = useRecordView();
    const queryClient = useQueryClient();

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

    // Record view once on mount (only for real posts with valid MongoDB ObjectIds)
    useEffect(() => {
        // Skip if postId is missing or is a temp ID (mock posts)
        if (postId && !postId.startsWith('temp-') && /^[a-f\d]{24}$/i.test(postId)) {
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

    // Listen for AI analysis completion and refresh the post
    useAIAnalysisUpdate(useCallback(({ postId: updatePostId }) => {
        if (updatePostId === post._id || updatePostId === postId) {
            console.log(`🔔 AI Analysis complete for post: ${updatePostId}, refetching...`);
            // Force immediate refetch to get updated aiAnalysis data
            queryClient.invalidateQueries({ queryKey: ['posts', updatePostId], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['feed'], refetchType: 'all' });
            queryClient.invalidateQueries({ queryKey: ['hashtags'], refetchType: 'all' });
        }
    }, [post._id, postId, queryClient]));

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

    // Get image from media array or direct property (prefer optimized for images too)
    const imageMedia = post.media?.find(m => m.type === 'image');
    const postImage = post.image || imageMedia?.optimizedUrl || imageMedia?.url;
    // Get video from media array or direct property - use optimizedUrl for faster playback
    const videoMedia = post.media?.find(m => m.type === 'video');
    const postVideo = post.video || videoMedia?.optimizedUrl || videoMedia?.url;

    // AI Report hook - available for any post with completed analysis
    // Check if analysis is complete by looking at aiAnalysis data presence
    const hasCompletedAnalysis = post.aiAnalysis !== undefined && post.aiAnalysis !== null;
    const canGenerateReport = hasCompletedAnalysis && normalizedTrust !== 'pending';
    const { report, isLoading: isLoadingReport, isGenerating, error: reportError, generateReport } = useAIReport(
        postId,
        canGenerateReport
    );

    const handleGenerateReport = async () => {
        setShowReportModal(true);
        if (!report) {
            try {
                await generateReport();
            } catch (error) {
                console.error('Failed to generate report:', error);
                toast.error("Failed to generate report. Please try again.");
            }
        }
    };

    // Email and Download hooks for TrustBadge
    const { downloadPDF, isDownloading } = useDownloadPDFReport();
    const { emailReport, isEmailing } = useEmailReport();

    const handleEmailReport = () => {
        if (!report || !postId) {
            toast.error("Generate the report first before emailing.");
            return;
        }
        emailReport({
            postId,
            analysisResults: {
                fake_score: 1 - (report.report.confidence || 0.5),
                real_score: report.report.confidence || 0.5,
                processing_time_ms: 0,
                model_version: report.modelUsed || 'v7'
            },
            reportContent: {
                verdict: report.report.verdict,
                confidence: report.report.confidence,
                summary: report.report.summary,
                detectionBreakdown: report.report.detectionBreakdown,
                technicalDetails: report.report.technicalDetails,
                recommendations: report.report.recommendations
            }
        });
    };

    const handleDownloadReport = () => {
        if (!report || !postId) {
            toast.error("Generate the report first before downloading.");
            return;
        }
        downloadPDF({
            postId,
            contentType: 'feed',
            analysisResults: {
                fake_score: 1 - (report.report.confidence || 0.5),
                real_score: report.report.confidence || 0.5,
                processing_time_ms: 0,
                model_version: report.modelUsed || 'v7'
            },
            reportContent: {
                verdict: report.report.verdict,
                confidence: report.report.confidence,
                summary: report.report.summary,
                detectionBreakdown: report.report.detectionBreakdown,
                technicalDetails: report.report.technicalDetails,
                recommendations: report.report.recommendations
            }
        });
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="group/post relative"
        >
            <Card className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 hover:border-white/20 transition-all duration-700 overflow-hidden shadow-2xl rounded-[2rem] sm:rounded-[2.5rem] relative">
                {/* Technical Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-grid-white/[0.02] pointer-events-none" />

                {/* Post Glow Accent */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-[100px] pointer-events-none group-hover/post:bg-primary/20 transition-colors duration-1000" />

                <CardHeader className="flex flex-row items-start gap-3 sm:gap-4 p-4 sm:p-6 pb-2 sm:pb-4 space-y-0 relative z-10">
                    <div className="relative group/avatar cursor-pointer" onClick={() => navigate({ to: `/app/profile/${postOwnerId}` })}>
                        {/* Avatar Ring Animation */}
                        <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary via-secondary to-accent opacity-0 group-hover/avatar:opacity-100 blur-sm transition-all duration-700 animate-spin-slow" />
                        <div className="absolute -inset-0.5 rounded-2xl bg-slate-950 z-0" />

                        <Avatar className="h-12 w-12 border border-white/10 rounded-xl relative z-10 transition-transform duration-500 group-hover/avatar:scale-95">
                            <AvatarImage src={userAvatar} alt={userName} className="object-cover" />
                            <AvatarFallback className="bg-slate-900 text-primary font-black italic text-sm">
                                {userName[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>

                        {/* Status Signal */}
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-lg border-2 border-[#030712] shadow-[0_0_10px_rgba(16,185,129,0.5)] z-20" />
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="font-black italic uppercase text-sm tracking-tight text-white truncate hover:text-primary transition-colors cursor-pointer" onClick={() => navigate({ to: `/app/profile/${postOwnerId}` })}>
                                        {userName}
                                    </span>
                                    {normalizedTrust === 'authentic' && (
                                        <div className="p-0.5 bg-secondary/20 rounded-md border border-secondary/30">
                                            <ShieldCheck className="w-3 h-3 text-secondary drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] font-medium text-slate-500">@{userHandle}</span>
                                    <span className="text-slate-600">·</span>
                                    <span className="text-[10px] text-slate-500">{timestamp}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-1">
                                {isOwner && (
                                    <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-semibold text-primary mr-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                                        Your Post
                                    </div>
                                )}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <motion.button
                                            whileHover={{ scale: 1.05, backgroundColor: "rgba(255,255,255,0.05)" }}
                                            whileTap={{ scale: 0.95 }}
                                            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:text-white transition-colors"
                                        >
                                            <MoreHorizontal className="w-5 h-5" />
                                        </motion.button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56 bg-slate-950/90 backdrop-blur-3xl border-white/10 rounded-2xl p-2 shadow-2xl">
                                        {isOwner && (
                                            <DropdownMenuItem
                                                onClick={() => setIsEditing(true)}
                                                className="gap-3 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors"
                                            >
                                                <Edit2 className="w-4 h-4 text-primary" />
                                                Modify_Signal
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuItem className="gap-3 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors">
                                            <Bookmark className="w-4 h-4 text-accent" />
                                            Archive_Core
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                            onClick={() => {
                                                navigator.clipboard.writeText(window.location.origin + `/app/post/${postId}`);
                                                toast.success("Signal link copied to clipboard");
                                            }}
                                            className="gap-3 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-white/5 focus:bg-white/5 transition-colors"
                                        >
                                            <Share2 className="w-4 h-4 text-secondary" />
                                            Copy_Protocol
                                        </DropdownMenuItem>

                                        {((isOwner || (profile as any)?.role === 'admin')) && (
                                            <>
                                                <DropdownMenuSeparator className="bg-white/5 my-2" />
                                                <DropdownMenuItem
                                                    onClick={handleDelete}
                                                    className="gap-3 py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-500 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Terminate_Link
                                                </DropdownMenuItem>
                                            </>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-5 relative z-10">
                    {/* AI Logic Analysis - Technical Implementation */}
                    {((postImage || postVideo) || normalizedTrust !== 'authentic' || post.aiAnalysis) && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="relative group/trust"
                        >
                            <TrustBadge
                                level={normalizedTrust}
                                score={Math.round(100 - (post.trustScore ?? (post.aiAnalysis?.fakeScore ? post.aiAnalysis.fakeScore * 100 : 0)))}
                                analysisDetails={post.aiAnalysis ? {
                                    fakeScore: post.aiAnalysis.fakeScore ?? 0,
                                    realScore: post.aiAnalysis.realScore ?? 0,
                                    framesAnalyzed: post.aiAnalysis.framesAnalyzed,
                                    processingTime: post.aiAnalysis.processingTimeMs,
                                    mediaType: post.aiAnalysis.mediaType || (postVideo ? 'video' : 'image'),
                                    classification: post.aiAnalysis.classification,
                                    faceDetection: post.aiAnalysis.analysisDetails?.faceDetection,
                                    audioAnalysis: post.aiAnalysis.analysisDetails?.audioAnalysis,
                                    temporalConsistency: post.aiAnalysis.analysisDetails?.temporalConsistency,
                                    compressionArtifacts: post.aiAnalysis.analysisDetails?.compressionArtifacts,
                                    facesDetected: post.aiAnalysis.facesDetected,
                                    avgFaceScore: post.aiAnalysis.avgFaceScore,
                                    avgFftScore: post.aiAnalysis.avgFftScore,
                                    avgEyeScore: post.aiAnalysis.avgEyeScore,
                                    fftBoost: post.aiAnalysis.fftBoost,
                                    eyeBoost: post.aiAnalysis.eyeBoost,
                                    temporalBoost: post.aiAnalysis.temporalBoost
                                } : undefined}
                                onGenerateReport={handleGenerateReport}
                                isGeneratingReport={isGenerating}
                                onEmailReport={report ? handleEmailReport : undefined}
                                isEmailing={isEmailing}
                                onDownloadReport={report ? handleDownloadReport : undefined}
                                isDownloading={isDownloading}
                            />
                        </motion.div>
                    )}

                    {isEditing ? (
                        <div className="space-y-4 pt-2">
                            <div className="relative">
                                <div className="absolute inset-0 bg-primary/5 blur-xl pointer-events-none" />
                                <Textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="min-h-[120px] bg-white/[0.05] border-white/10 rounded-2xl text-base p-5 focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none font-medium leading-relaxed"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02, backgroundColor: "rgba(255,255,255,0.05)" }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => {
                                        setIsEditing(false);
                                        setEditContent(post.content);
                                    }}
                                    className="h-11 px-6 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white rounded-xl transition-all"
                                >
                                    ABORT
                                </motion.button>
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleEditSave}
                                    disabled={updatePost.isPending || !editContent.trim()}
                                    className="h-11 px-8 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-[0_0_20px_rgba(129,140,248,0.3)] hover:shadow-primary/50 transition-all disabled:opacity-50"
                                >
                                    {updatePost.isPending ? "SYNCING..." : "DEPLOY_UPDATE"}
                                </motion.button>
                            </div>
                        </div>
                    ) : (
                        <p className="text-[14px] sm:text-[16px] leading-[1.6] font-medium text-slate-200 whitespace-pre-wrap tracking-tight selection:bg-primary/30">
                            {post.content}
                        </p>
                    )}

                    {postImage && (
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ duration: 0.4 }}
                            className="rounded-[2rem] overflow-hidden mt-2 bg-slate-900 border border-white/10 group/img relative shadow-2xl"
                        >
                            <img
                                src={postImage}
                                alt="Post content"
                                className="w-full h-auto object-cover max-h-[500px] transition-all duration-1000 group-hover/img:scale-105"
                                loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-60 pointer-events-none" />

                            {/* Image Metadata Overlay */}
                            <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover/img:opacity-100 transition-opacity duration-500">
                                <div className="px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 text-[8px] font-black text-white/80 uppercase tracking-widest">
                                    IMG_DATA: VERIFIED
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {postVideo && (
                        <div className="rounded-[2rem] overflow-hidden mt-2 bg-black border border-white/10 relative shadow-2xl group/vid">
                            <video
                                src={postVideo}
                                controls
                                playsInline
                                className="w-full h-auto max-h-[500px] bg-black"
                            />
                            {/* Video Technical Label */}
                            <div className="absolute top-4 right-4 px-3 py-1.5 bg-rose-500/20 backdrop-blur-md rounded-full border border-rose-500/30 text-[10px] font-semibold text-rose-400 opacity-0 group-hover/vid:opacity-100 transition-opacity flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Playing
                            </div>
                        </div>
                    )}

                </CardContent>

                <CardFooter className="px-3 sm:px-6 py-3 sm:py-4 bg-white/[0.02] border-t border-white/5 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleLike}
                            disabled={likePost.isPending || unlikePost.isPending}
                            className={cn(
                                "flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 h-9 sm:h-11 rounded-xl sm:rounded-2xl transition-all duration-500 group/btn",
                                post.isLiked
                                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                    : "bg-white/5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 border border-white/5"
                            )}
                        >
                            {likePost.isPending || unlikePost.isPending ? (
                                <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                            ) : (
                                <Heart className={cn("w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 transition-all duration-500 group-hover/btn:scale-110", post.isLiked && "fill-current drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]")} />
                            )}
                            <span className="text-[10px] sm:text-[11px] font-black tracking-widest">{likesCount}</span>
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowComments(!showComments)}
                            className={cn(
                                "flex items-center gap-1.5 sm:gap-2.5 px-2.5 sm:px-4 h-9 sm:h-11 rounded-xl sm:rounded-2xl transition-all duration-500 group/btn",
                                showComments
                                    ? "bg-primary/15 text-primary border border-primary/30"
                                    : "bg-white/5 text-slate-400 hover:bg-primary/10 hover:text-primary border border-white/5"
                            )}
                        >
                            <MessageCircle className={cn("w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 transition-all duration-500 group-hover/btn:scale-110", showComments && "fill-current drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]")} />
                            <span className="text-[10px] sm:text-[11px] font-black tracking-widest">{commentsCount}</span>
                        </motion.button>

                        <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />

                        <div className="hidden sm:flex items-center gap-2">
                            {isOwner && (
                                <motion.button
                                    whileHover={{ scale: 1.05, backgroundColor: "rgba(129,140,248,0.1)" }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setShowAnalytics(true)}
                                    className="h-11 w-11 flex items-center justify-center rounded-2xl bg-white/5 text-slate-400 hover:text-primary border border-white/5 transition-all"
                                    title="View Insights"
                                >
                                    <BarChart3 className="w-4.5 h-4.5" />
                                </motion.button>
                            )}
                            <TipButton authorName={userName} />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.1, color: "#FDE047" }}
                        whileTap={{ scale: 0.9 }}
                        className={cn(
                            "h-9 w-9 sm:h-11 sm:w-11 flex items-center justify-center rounded-xl sm:rounded-2xl transition-all",
                            post.isSaved
                                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                : "bg-white/5 text-slate-400 hover:bg-white/10 border border-white/5"
                        )}
                    >
                        <Bookmark className={cn("w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 transition-all", post.isSaved && "fill-current")} />
                    </motion.button>
                </CardFooter>

                <AnimatePresence mode="wait">
                    {showComments && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.5, ease: [0.04, 0.62, 0.23, 0.98] }}
                            className="bg-black/40 border-t border-white/5 relative z-10"
                        >
                            <div className="p-2 sm:p-4">
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

            {/* AI Report Modal */}
            <AIReportModal
                isOpen={showReportModal}
                onClose={() => setShowReportModal(false)}
                report={report || null}
                isLoading={isLoadingReport}
                isGenerating={isGenerating}
                onGenerate={generateReport}
                error={reportError}
                postId={post._id}
                contentType={post.media?.[0]?.type === 'video' || post.aiAnalysis?.mediaType === 'video' ? 'short' : 'feed'}
            />
        </motion.div>
    );
}
