import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import {
    Clock,
    FileText,
    Calendar,
    Trash2,
    Send,
    Image as ImageIcon,
    Video,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface DraftPost {
    _id: string;
    content: string;
    media?: Array<{ url: string; type: string }>;
    status: 'draft' | 'scheduled';
    scheduledFor?: string;
    createdAt: string;
    updatedAt: string;
}

type TabType = 'drafts' | 'scheduled';

export function DraftsScheduledSection() {
    const [activeTab, setActiveTab] = useState<TabType>('drafts');
    const [postToDelete, setPostToDelete] = useState<string | null>(null);
    const queryClient = useQueryClient();

    // Fetch drafts
    const { data: draftsData, isLoading: draftsLoading } = useQuery({
        queryKey: ['drafts'],
        queryFn: async () => {
            const response = await api.get('/posts/drafts') as { data: { data: { drafts: DraftPost[] } } };
            return response.data.data.drafts;
        },
    });

    // Fetch scheduled posts
    const { data: scheduledData, isLoading: scheduledLoading } = useQuery({
        queryKey: ['scheduledPosts'],
        queryFn: async () => {
            const response = await api.get('/posts/scheduled') as { data: { data: { scheduledPosts: DraftPost[] } } };
            return response.data.data.scheduledPosts;
        },
    });

    // Publish draft mutation
    const publishMutation = useMutation({
        mutationFn: async (postId: string) => {
            await api.post(`/posts/${postId}/publish`);
        },
        onSuccess: () => {
            toast.success('Post published!');
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
        onError: () => {
            toast.error('Failed to publish post');
        },
    });

    // Delete draft mutation
    const deleteMutation = useMutation({
        mutationFn: async (postId: string) => {
            await api.delete(`/posts/drafts/${postId}`);
        },
        onSuccess: () => {
            toast.success('Draft deleted');
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            setPostToDelete(null);
        },
        onError: () => {
            toast.error('Failed to delete draft');
        },
    });

    // Unschedule mutation
    const unscheduleMutation = useMutation({
        mutationFn: async (postId: string) => {
            await api.post(`/posts/${postId}/unschedule`);
        },
        onSuccess: () => {
            toast.success('Post moved to drafts');
            queryClient.invalidateQueries({ queryKey: ['scheduledPosts'] });
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
        },
        onError: () => {
            toast.error('Failed to unschedule post');
        },
    });

    const drafts = draftsData || [];
    const scheduled = scheduledData || [];
    const isLoading = activeTab === 'drafts' ? draftsLoading : scheduledLoading;
    const posts = activeTab === 'drafts' ? drafts : scheduled;

    return (
        <div className="space-y-6">
            {/* Header with Tabs */}
            <div className="flex items-center gap-4 border-b border-neutral-800">
                <button
                    onClick={() => setActiveTab('drafts')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === 'drafts'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Drafts</span>
                    {drafts.length > 0 && (
                        <span className="px-2 py-0.5 bg-neutral-800 rounded-full text-xs">
                            {drafts.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('scheduled')}
                    className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${activeTab === 'scheduled'
                        ? 'border-purple-500 text-purple-400'
                        : 'border-transparent text-neutral-400 hover:text-neutral-200'
                        }`}
                >
                    <Calendar className="w-4 h-4" />
                    <span className="font-medium">Scheduled</span>
                    {scheduled.length > 0 && (
                        <span className="px-2 py-0.5 bg-neutral-800 rounded-full text-xs">
                            {scheduled.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {isLoading ? (
                <div className="p-8 flex items-center justify-center">
                    <div className="w-8 h-8 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                </div>
            ) : posts.length === 0 ? (
                <div className="p-12 text-center">
                    {activeTab === 'drafts' ? (
                        <>
                            <FileText className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                            <p className="text-neutral-400">No drafts yet</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Start writing a post and save it as a draft to continue later
                            </p>
                        </>
                    ) : (
                        <>
                            <Calendar className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                            <p className="text-neutral-400">No scheduled posts</p>
                            <p className="text-sm text-neutral-500 mt-1">
                                Schedule posts to automatically publish at a specific time
                            </p>
                        </>
                    )}
                </div>
            ) : (
                <div className="space-y-3">
                    {posts.map((post, index) => (
                        <m.div
                            key={post._id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="p-4 bg-neutral-800/50 border border-neutral-700/50 rounded-xl"
                        >
                            <div className="flex gap-4">
                                {/* Media Preview */}
                                {post.media && post.media.length > 0 && (
                                    <div className="w-16 h-16 rounded-lg bg-neutral-700 overflow-hidden flex-shrink-0">
                                        {post.media[0].type === 'video' ? (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Video className="w-6 h-6 text-neutral-400" />
                                            </div>
                                        ) : (
                                            <img
                                                src={post.media[0].url}
                                                alt=""
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                )}

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <p className="text-white line-clamp-2">
                                        {post.content || (
                                            <span className="text-neutral-500 italic">
                                                No text content
                                            </span>
                                        )}
                                    </p>

                                    {/* Meta */}
                                    <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500">
                                        {post.status === 'scheduled' && post.scheduledFor && (
                                            <span className="flex items-center gap-1 text-purple-400">
                                                <Clock className="w-3.5 h-3.5" />
                                                {format(new Date(post.scheduledFor), 'MMM d, h:mm a')}
                                            </span>
                                        )}
                                        <span>
                                            Last edited{' '}
                                            {formatDistanceToNow(new Date(post.updatedAt), {
                                                addSuffix: true,
                                            })}
                                        </span>
                                        {post.media && post.media.length > 0 && (
                                            <span className="flex items-center gap-1">
                                                <ImageIcon className="w-3.5 h-3.5" />
                                                {post.media.length}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-start gap-2">
                                    {activeTab === 'drafts' && (
                                        <button
                                            onClick={() => publishMutation.mutate(post._id)}
                                            disabled={publishMutation.isPending}
                                            className="p-2 hover:bg-green-500/10 rounded-lg text-green-400 transition-colors"
                                            title="Publish now"
                                        >
                                            <Send className="w-4 h-4" />
                                        </button>
                                    )}
                                    {activeTab === 'scheduled' && (
                                        <button
                                            onClick={() => unscheduleMutation.mutate(post._id)}
                                            disabled={unscheduleMutation.isPending}
                                            className="p-2 hover:bg-amber-500/10 rounded-lg text-amber-400 transition-colors"
                                            title="Move to drafts"
                                        >
                                            <Clock className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setPostToDelete(post._id)}
                                        className="p-2 hover:bg-red-500/10 rounded-lg text-neutral-400 hover:text-red-400 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </m.div>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {postToDelete && (
                    <>
                        <m.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setPostToDelete(null)}
                            className="fixed inset-0 bg-black/60 z-50"
                        />
                        <m.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        >
                            <div className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-sm p-6 space-y-4">
                                <h3 className="text-lg font-semibold text-white">Delete Draft?</h3>
                                <p className="text-neutral-400">
                                    This action cannot be undone. The draft will be permanently deleted.
                                </p>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setPostToDelete(null)}
                                        className="flex-1 py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 rounded-xl font-medium text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => deleteMutation.mutate(postToDelete)}
                                        disabled={deleteMutation.isPending}
                                        className="flex-1 py-2.5 px-4 bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded-xl font-medium text-white transition-colors"
                                    >
                                        {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                    </button>
                                </div>
                            </div>
                        </m.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
