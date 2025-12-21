import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
    Clock, Calendar, Trash2, Send, History,
    Loader2, AlertCircle, Pencil
} from "lucide-react";
import { useDrafts, useScheduledPosts, useDeleteDraft, usePublishDraft, useCancelScheduledPost } from "@/api/hooks";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface DraftsManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onEditDraft?: (draft: any) => void;
}

export function DraftsManager({ isOpen, onClose, onEditDraft }: DraftsManagerProps) {
    const [activeTab, setActiveTab] = useState<'drafts' | 'scheduled'>('drafts');
    const { data: draftsRes, isLoading: isLoadingDrafts, refetch: refetchDrafts } = useDrafts();
    const { data: scheduledRes, isLoading: isLoadingScheduled, refetch: refetchScheduled } = useScheduledPosts();

    const deleteDraft = useDeleteDraft();
    const publishDraft = usePublishDraft();
    const cancelScheduled = useCancelScheduledPost();

    const drafts = (draftsRes as any)?.data?.drafts || [];
    const scheduled = (scheduledRes as any)?.data?.scheduled || [];

    const handleDeleteDraft = async (id: string) => {
        try {
            await deleteDraft.mutateAsync(id);
            toast.success("Draft deleted successfully");
            refetchDrafts();
        } catch (error) {
            toast.error("Failed to delete draft");
        }
    };

    const handlePublishDraft = async (id: string) => {
        try {
            await publishDraft.mutateAsync(id);
            toast.success("Published successfully!");
            refetchDrafts();
            onClose();
        } catch (error) {
            toast.error("Failed to publish draft");
        }
    };

    const handleCancelScheduled = async (id: string) => {
        try {
            await cancelScheduled.mutateAsync(id);
            toast.success("Post canceled and moved to drafts");
            refetchScheduled();
            refetchDrafts();
        } catch (error) {
            toast.error("Failed to cancel scheduled post");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-slate-900/95 backdrop-blur-3xl border-white/10 p-0 text-white overflow-hidden rounded-[2.5rem]">
                <div className="p-6 sm:p-8">
                    <DialogHeader className="mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2.5 rounded-2xl bg-primary/10 border border-primary/20">
                                <History className="w-5 h-5 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-black italic uppercase tracking-tighter">Vibe Studio</DialogTitle>
                        </div>
                        <DialogDescription className="text-slate-400 font-medium">Manage your unfinished thoughts and future vibes.</DialogDescription>
                    </DialogHeader>

                    {/* Tabs */}
                    <div className="flex p-1.5 bg-white/5 rounded-2xl mb-6">
                        <button
                            onClick={() => setActiveTab('drafts')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === 'drafts' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <History className="w-4 h-4" />
                            Drafts ({drafts.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('scheduled')}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                activeTab === 'scheduled' ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <Calendar className="w-4 h-4" />
                            Scheduled ({scheduled.length})
                        </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                        <AnimatePresence mode="wait">
                            {activeTab === 'drafts' ? (
                                <motion.div
                                    key="drafts"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-4"
                                >
                                    {isLoadingDrafts ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                            <p className="text-xs font-black text-slate-500 uppercase tracking-widest italic">Syncing drafts...</p>
                                        </div>
                                    ) : drafts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                            <AlertCircle className="w-10 h-10 text-slate-700 mb-4" />
                                            <p className="text-sm font-bold text-slate-500 italic">No drafts found. Start creating!</p>
                                        </div>
                                    ) : (
                                        drafts.map((draft: any) => (
                                            <div key={draft._id} className="group p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all">
                                                <div className="flex justify-between items-start mb-3">
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                                        Last saved {format(new Date(draft.lastSavedAt), "MMM d, HH:mm")}
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleDeleteDraft(draft._id)} className="p-2 rounded-xl bg-rose-500/10 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-500 hover:text-white">
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => onEditDraft?.(draft)} className="p-2 rounded-xl bg-sky-500/10 text-sky-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-sky-500 hover:text-white">
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <p className="text-sm text-slate-100 line-clamp-3 mb-5 font-medium leading-relaxed">{draft.content || <span className="italic text-slate-600">No text content</span>}</p>
                                                <div className="flex items-center justify-between mt-auto">
                                                    <div className="flex gap-2">
                                                        {draft.media?.length > 0 && <span className="px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">Media</span>}
                                                        {draft.poll && <span className="px-2 py-1 rounded-lg bg-violet-500/20 text-violet-400 text-[10px] font-black uppercase">Poll</span>}
                                                    </div>
                                                    <Button onClick={() => handlePublishDraft(draft._id)} size="sm" className="bg-primary hover:bg-primary/80 rounded-xl px-5 h-9 text-[10px] font-black uppercase tracking-widest">
                                                        <Send className="w-3.5 h-3.5 mr-2" />
                                                        Publish
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="scheduled"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="space-y-4"
                                >
                                    {isLoadingScheduled ? (
                                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                                        </div>
                                    ) : scheduled.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 bg-white/5 rounded-3xl border border-dashed border-white/10">
                                            <Calendar className="w-10 h-10 text-slate-700 mb-4" />
                                            <p className="text-sm font-bold text-slate-500 italic">No scheduled vibes found.</p>
                                        </div>
                                    ) : (
                                        scheduled.map((post: any) => (
                                            <div key={post._id} className="group p-5 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all">
                                                <div className="flex items-center gap-2 mb-4 p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                                    <Clock className="w-4 h-4 text-rose-500" />
                                                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">
                                                        Scheduled for {format(new Date(post.scheduledFor), "PPP 'at' p")}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-100 line-clamp-2 mb-4 font-medium italic">{post.content}</p>
                                                <div className="flex justify-end gap-3">
                                                    <button onClick={() => handleCancelScheduled(post._id)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-rose-400 text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
