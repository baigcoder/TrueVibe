import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Heart, MessageCircle, ChevronDown, ChevronUp, MoreHorizontal, Trash2, Loader2, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useReplies, useReplyToComment, useLikeComment, useUnlikeComment, useDeleteComment } from '@/api/hooks';
import { formatDistanceToNow } from 'date-fns';
import { Link } from '@tanstack/react-router';

interface Comment {
    _id: string;
    content: string;
    createdAt: string;
    likesCount: number;
    repliesCount: number;
    isLiked?: boolean;
    userId: {
        _id: string;
        name: string;
        handle?: string;
        avatar?: string;
    };
    parentId?: string;
}

interface ThreadedCommentProps {
    comment: Comment;
    postId?: string;
    shortId?: string;
    depth?: number;
    maxDepth?: number;
}

export function ThreadedComment({
    comment,
    postId,
    shortId,
    depth = 0,
    maxDepth = 3
}: ThreadedCommentProps) {
    const [showReplies, setShowReplies] = useState(false);
    const [showReplyInput, setShowReplyInput] = useState(false);
    const [replyContent, setReplyContent] = useState('');
    const [showMenu, setShowMenu] = useState(false);

    const { user } = useAuth();
    const isOwner = user?.id === comment.userId._id;

    const { data: repliesData, isLoading: loadingReplies, fetchNextPage, hasNextPage } = useReplies(
        showReplies ? comment._id : ''
    );
    const replyMutation = useReplyToComment();
    const likeMutation = useLikeComment();
    const unlikeMutation = useUnlikeComment();
    const deleteMutation = useDeleteComment();

    const replies = repliesData?.pages.flatMap(page => (page as any)?.data?.comments || []) || [];

    const handleLike = () => {
        if (comment.isLiked) {
            unlikeMutation.mutate(comment._id);
        } else {
            likeMutation.mutate(comment._id);
        }
    };

    const handleReply = async () => {
        if (!replyContent.trim()) return;

        await replyMutation.mutateAsync({
            parentId: comment._id,
            postId,
            shortId,
            content: replyContent.trim(),
        });

        setReplyContent('');
        setShowReplyInput(false);
        setShowReplies(true);
    };

    const handleDelete = async () => {
        if (postId) {
            await deleteMutation.mutateAsync({ commentId: comment._id, postId });
        }
        setShowMenu(false);
    };

    const formatTime = (date: string) => {
        try {
            return formatDistanceToNow(new Date(date), { addSuffix: true });
        } catch {
            return 'recently';
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                "group",
                depth > 0 && "ml-6 sm:ml-10 pl-4 border-l-2 border-white/10"
            )}
        >
            {/* Comment Content */}
            <div className="py-3">
                <div className="flex gap-3">
                    {/* Avatar */}
                    <Link to="/app/profile/$id" params={{ id: comment.userId._id }}>
                        <Avatar className="w-8 h-8 ring-1 ring-white/10">
                            <AvatarImage src={comment.userId.avatar} />
                            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                                {comment.userId.name?.[0]?.toUpperCase() || '?'}
                            </AvatarFallback>
                        </Avatar>
                    </Link>

                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-1">
                            <Link
                                to="/app/profile/$id"
                                params={{ id: comment.userId._id }}
                                className="font-semibold text-sm text-white hover:underline truncate"
                            >
                                {comment.userId.name}
                            </Link>
                            {comment.userId.handle && (
                                <span className="text-xs text-white/40">@{comment.userId.handle}</span>
                            )}
                            <span className="text-xs text-white/30">·</span>
                            <span className="text-xs text-white/30">{formatTime(comment.createdAt)}</span>

                            {isOwner && (
                                <div className="relative ml-auto">
                                    <button
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="p-1 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontal className="w-4 h-4 text-white/50" />
                                    </button>

                                    <AnimatePresence>
                                        {showMenu && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-xl p-1 shadow-xl z-10"
                                            >
                                                <button
                                                    onClick={handleDelete}
                                                    disabled={deleteMutation.isPending}
                                                    className="flex items-center gap-2 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs font-medium w-full"
                                                >
                                                    {deleteMutation.isPending ? (
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-3 h-3" />
                                                    )}
                                                    Delete
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>

                        {/* Content */}
                        <p className="text-sm text-white/80 whitespace-pre-wrap break-words">
                            {comment.content}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center gap-4 mt-2">
                            <button
                                onClick={handleLike}
                                disabled={likeMutation.isPending || unlikeMutation.isPending}
                                className={cn(
                                    "flex items-center gap-1.5 text-xs transition-colors",
                                    comment.isLiked
                                        ? "text-rose-400"
                                        : "text-white/40 hover:text-rose-400"
                                )}
                            >
                                <Heart
                                    className={cn("w-3.5 h-3.5", comment.isLiked && "fill-current")}
                                />
                                <span>{comment.likesCount || 0}</span>
                            </button>

                            {depth < maxDepth && (
                                <button
                                    onClick={() => setShowReplyInput(!showReplyInput)}
                                    className="flex items-center gap-1.5 text-xs text-white/40 hover:text-primary transition-colors"
                                >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>Reply</span>
                                </button>
                            )}

                            {comment.repliesCount > 0 && (
                                <button
                                    onClick={() => setShowReplies(!showReplies)}
                                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                                >
                                    {showReplies ? (
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    ) : (
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    )}
                                    <span>
                                        {comment.repliesCount} {comment.repliesCount === 1 ? 'reply' : 'replies'}
                                    </span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Reply Input */}
                <AnimatePresence>
                    {showReplyInput && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-3 ml-11"
                        >
                            <div className="flex gap-2">
                                <Textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder={`Reply to @${comment.userId.handle || comment.userId.name}...`}
                                    className="bg-white/5 border-white/10 text-white text-sm min-h-[60px] resize-none"
                                    maxLength={1000}
                                />
                                <Button
                                    size="sm"
                                    onClick={handleReply}
                                    disabled={!replyContent.trim() || replyMutation.isPending}
                                    className="bg-primary hover:bg-primary/90 h-auto self-end"
                                >
                                    {replyMutation.isPending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Nested Replies */}
            <AnimatePresence>
                {showReplies && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {loadingReplies ? (
                            <div className="flex justify-center py-4 ml-11">
                                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                {replies.map((reply: Comment) => (
                                    <ThreadedComment
                                        key={reply._id}
                                        comment={reply}
                                        postId={postId}
                                        shortId={shortId}
                                        depth={depth + 1}
                                        maxDepth={maxDepth}
                                    />
                                ))}

                                {hasNextPage && (
                                    <button
                                        onClick={() => fetchNextPage()}
                                        className="ml-11 text-xs text-primary hover:underline py-2"
                                    >
                                        Load more replies...
                                    </button>
                                )}
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default ThreadedComment;
