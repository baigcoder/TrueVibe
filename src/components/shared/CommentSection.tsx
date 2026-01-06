import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useComments, useCreateComment, useDeleteComment, useEditComment } from "@/api/hooks";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, MoreHorizontal, Trash2, Edit2 } from "lucide-react";
import { m } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface CommentSectionProps {
    postId: string;
}

export function CommentSection({ postId }: CommentSectionProps) {
    const { profile } = useAuth();
    const [content, setContent] = useState("");
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");

    const { data: commentData, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useComments(postId);
    const createComment = useCreateComment();
    const deleteComment = useDeleteComment();
    const editComment = useEditComment();

    const comments = commentData?.pages.flatMap((page: any) => page.data.comments) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || createComment.isPending) return;

        try {
            await createComment.mutateAsync({ postId, content: content.trim() });
            setContent("");
        } catch (error) {
            console.error("Failed to post comment:", error);
        }
    };

    const handleEditStart = (commentId: string, currentContent: string) => {
        setEditingCommentId(commentId);
        setEditContent(currentContent);
    };

    const handleEditSave = async (commentId: string) => {
        if (!editContent.trim() || editComment.isPending) return;
        try {
            await editComment.mutateAsync({ postId, commentId, content: editContent.trim() });
            setEditingCommentId(null);
        } catch (error) {
            console.error("Failed to edit comment:", error);
        }
    };

    const handleDelete = async (commentId: string) => {
        if (window.confirm("Are you sure you want to delete this comment?")) {
            try {
                await deleteComment.mutateAsync({ postId, commentId });
            } catch (error) {
                console.error("Failed to delete comment:", error);
            }
        }
    };

    return (
        <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4 border-t border-white/5 mt-3 sm:mt-4">
            {/* Comment Input */}
            <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3 items-start">
                <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border border-white/10 flex-shrink-0">
                    <AvatarImage src={profile?.avatar} />
                    <AvatarFallback className="text-[9px] sm:text-[10px] bg-slate-800">
                        {profile?.name?.[0] || "?"}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1 relative group min-w-0">
                    <Textarea
                        placeholder="Join the frequency..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[36px] sm:min-h-[40px] max-h-[100px] sm:max-h-[120px] bg-white/[0.03] border-white/10 focus:border-primary/30 focus:ring-primary/20 rounded-xl py-2 px-3 text-xs sm:text-sm placeholder:text-slate-500 transition-all resize-none pr-10"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                    />
                    <Button
                        type="submit"
                        disabled={!content.trim() || createComment.isPending}
                        className="absolute right-1.5 sm:right-2 bottom-1.5 sm:bottom-2 h-6 w-6 sm:h-7 sm:w-7 p-0 rounded-lg bg-primary/20 hover:bg-primary/30 text-primary border border-primary/20 disabled:opacity-30 transition-all"
                    >
                        {createComment.isPending ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                            <Send className="w-3 h-3" />
                        )}
                    </Button>
                </div>
            </form>

            {/* Comments List */}
            <div className="space-y-3 sm:space-y-4 max-h-[300px] sm:max-h-[400px] overflow-y-auto pr-1 sm:pr-2 custom-scrollbar">
                {isLoading ? (
                    <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-primary/40" />
                    </div>
                ) : comments.length === 0 ? (
                    <p className="text-center text-slate-500 text-[10px] sm:text-xs py-3 sm:py-4 font-medium uppercase tracking-widest opacity-50">
                        No signals received yet
                    </p>
                ) : (
                    comments.map((comment: any) => {
                        // Get author info from author field (preferred) or userId if populated
                        const commentAuthor = comment.author || (typeof comment.userId === 'object' ? comment.userId : null);
                        const authorName = commentAuthor?.name || 'Unknown';
                        const authorHandle = commentAuthor?.handle || 'user';
                        const authorAvatar = commentAuthor?.avatar;

                        return (
                            <m.div
                                key={comment._id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex gap-2 sm:gap-3 group/comment"
                            >
                                <Avatar className="w-6 h-6 sm:w-8 sm:h-8 border border-white/10 mt-0.5 sm:mt-1 flex-shrink-0">
                                    <AvatarImage src={authorAvatar} />
                                    <AvatarFallback className="text-[8px] sm:text-[10px] bg-slate-900">
                                        {authorName?.[0] || "?"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="bg-white/[0.03] border border-white/5 rounded-xl sm:rounded-2xl p-2 sm:p-3 hover:border-white/10 transition-colors relative">
                                        <div className="flex items-center justify-between gap-1 sm:gap-2 mb-0.5 sm:mb-1">
                                            <div className="flex items-center gap-1 sm:gap-2 min-w-0">
                                                <span className="text-[10px] sm:text-[11px] font-black italic uppercase text-slate-300 truncate tracking-tight">
                                                    {authorName}
                                                </span>
                                                <span className="text-[8px] sm:text-[9px] font-bold text-slate-500 uppercase tracking-widest hidden sm:inline">
                                                    @{authorHandle}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-bold text-slate-600 uppercase">
                                                    {formatDistanceToNow(new Date(comment.createdAt))} ago
                                                </span>
                                                {(() => {
                                                    // Get comment owner ID (Supabase ID)
                                                    const commentOwnerId = commentAuthor?.userId || commentAuthor?.supabaseId ||
                                                        (typeof comment.userId === 'string' ? comment.userId : comment.userId?._id);

                                                    // Get current user's Supabase ID
                                                    const currentUserSupabaseId = profile?.userId || profile?.supabaseId;

                                                    // Check ownership using Supabase ID, fallback to MongoDB _id
                                                    const isCommentOwner = !!commentOwnerId && (
                                                        (!!currentUserSupabaseId && currentUserSupabaseId === commentOwnerId) ||
                                                        (!!profile?._id && profile._id === commentOwnerId)
                                                    );

                                                    return isCommentOwner && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <button className="text-slate-600 hover:text-white transition-colors">
                                                                    <MoreHorizontal className="w-3.5 h-3.5" />
                                                                </button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="bg-slate-900/90 backdrop-blur-xl border-white/10 glass-premium">
                                                                <DropdownMenuItem
                                                                    onClick={() => handleEditStart(comment._id, comment.content)}
                                                                    className="gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer hover:bg-white/5"
                                                                >
                                                                    <Edit2 className="w-3 h-3" />
                                                                    Modify
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem
                                                                    onClick={() => handleDelete(comment._id)}
                                                                    className="gap-2 text-[10px] font-bold uppercase tracking-widest cursor-pointer text-rose-500 hover:bg-rose-500/10 focus:bg-rose-500/10 focus:text-rose-500"
                                                                >
                                                                    <Trash2 className="w-3 h-3" />
                                                                    Erase
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    );
                                                })()}
                                            </div>
                                        </div>

                                        {editingCommentId === comment._id ? (
                                            <div className="space-y-2 mt-2">
                                                <Textarea
                                                    value={editContent}
                                                    onChange={(e) => setEditContent(e.target.value)}
                                                    className="min-h-[60px] bg-white/[0.05] border-primary/30 rounded-xl text-sm p-2 focus:ring-1 focus:ring-primary/20"
                                                    autoFocus
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => setEditingCommentId(null)}
                                                        className="h-7 px-3 text-[9px] font-bold uppercase tracking-widest hover:bg-white/5"
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleEditSave(comment._id)}
                                                        className="h-7 px-3 bg-secondary/20 hover:bg-secondary/30 text-secondary border border-secondary/20 text-[9px] font-bold uppercase tracking-widest"
                                                    >
                                                        Save Changes
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 leading-relaxed font-sans">{comment.content}</p>
                                        )}
                                    </div>
                                </div>
                            </m.div>
                        );
                    })
                )}

                {hasNextPage && (
                    <button
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary/40 hover:text-primary transition-colors disabled:opacity-30"
                    >
                        {isFetchingNextPage ? "Decoding..." : "Load Older Signals"}
                    </button>
                )}
            </div>
        </div>
    );
}
