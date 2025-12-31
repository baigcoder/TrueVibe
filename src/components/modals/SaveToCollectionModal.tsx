import { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, FolderPlus as CollectionIcon, Plus, Folder } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';

interface Collection {
    _id: string;
    name: string;
    postsCount: number;
    isPrivate: boolean;
}

interface SaveToCollectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
}

export function SaveToCollectionModal({
    isOpen,
    onClose,
    postId,
}: SaveToCollectionModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const queryClient = useQueryClient();

    // Fetch user's collections
    const { data: collectionsData, isLoading } = useQuery({
        queryKey: ['collections'],
        queryFn: async () => {
            const response = await api.get('/collections') as { data: { data: { collections: Collection[] } } };
            return response.data.data.collections;
        },
        enabled: isOpen,
    });

    // Create collection mutation
    const createCollectionMutation = useMutation({
        mutationFn: async (name: string) => {
            const response = await api.post('/collections', { name, isPrivate: true }) as { data: { data: { collection: Collection } } };
            return response.data.data.collection;
        },
        onSuccess: (newCollection) => {
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            setIsCreating(false);
            setNewCollectionName('');
            // Auto-add post to new collection
            addToCollectionMutation.mutate(newCollection._id);
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error?.message || 'Failed to create collection');
        },
    });

    // Add to collection mutation
    const addToCollectionMutation = useMutation({
        mutationFn: async (collectionId: string) => {
            await api.post(`/collections/${collectionId}/posts/${postId}`);
            return collectionId;
        },
        onSuccess: () => {
            toast.success('Saved to collection');
            queryClient.invalidateQueries({ queryKey: ['collections'] });
            onClose();
        },
        onError: (error: any) => {
            const message = error.response?.data?.error?.message;
            if (message?.includes('already')) {
                toast.info('Already in this collection');
            } else {
                toast.error(message || 'Failed to save to collection');
            }
        },
    });

    const handleCreateCollection = () => {
        const name = newCollectionName.trim();
        if (!name) {
            toast.error('Please enter a collection name');
            return;
        }
        createCollectionMutation.mutate(name);
    };

    const collections = collectionsData || [];

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <m.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <m.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', duration: 0.3 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    >
                        <div className="bg-neutral-900 rounded-2xl border border-neutral-800 w-full max-w-sm overflow-hidden shadow-xl">
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-neutral-800">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/10 rounded-full">
                                        <CollectionIcon className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <h2 className="text-lg font-semibold text-white">Save to Collection</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-neutral-800 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-neutral-400" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="max-h-[50vh] overflow-y-auto">
                                {isLoading ? (
                                    <div className="p-8 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                    </div>
                                ) : (
                                    <div className="p-2">
                                        {/* Create New Collection */}
                                        {isCreating ? (
                                            <div className="p-3 space-y-3">
                                                <input
                                                    type="text"
                                                    value={newCollectionName}
                                                    onChange={(e) => setNewCollectionName(e.target.value)}
                                                    placeholder="Collection name..."
                                                    maxLength={100}
                                                    autoFocus
                                                    className="w-full px-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCreateCollection();
                                                        if (e.key === 'Escape') setIsCreating(false);
                                                    }}
                                                />
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => setIsCreating(false)}
                                                        className="flex-1 py-2 px-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium text-neutral-300 transition-colors"
                                                    >
                                                        Cancel
                                                    </button>
                                                    <button
                                                        onClick={handleCreateCollection}
                                                        disabled={createCollectionMutation.isPending}
                                                        className="flex-1 py-2 px-3 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 rounded-lg text-sm font-medium text-white transition-colors"
                                                    >
                                                        {createCollectionMutation.isPending ? 'Creating...' : 'Create'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => setIsCreating(true)}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/50 rounded-xl transition-colors group"
                                            >
                                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                                                    <Plus className="w-6 h-6 text-white" />
                                                </div>
                                                <span className="font-medium text-white group-hover:text-purple-400 transition-colors">
                                                    Create new collection
                                                </span>
                                            </button>
                                        )}

                                        {/* Divider */}
                                        {collections.length > 0 && (
                                            <div className="my-2 h-px bg-neutral-800" />
                                        )}

                                        {/* Collections List */}
                                        {collections.map((collection) => (
                                            <button
                                                key={collection._id}
                                                onClick={() => addToCollectionMutation.mutate(collection._id)}
                                                disabled={addToCollectionMutation.isPending}
                                                className="w-full flex items-center gap-3 p-3 hover:bg-neutral-800/50 rounded-xl transition-colors group"
                                            >
                                                <div className="w-12 h-12 rounded-lg bg-neutral-800 flex items-center justify-center">
                                                    <Folder className="w-6 h-6 text-neutral-400" />
                                                </div>
                                                <div className="flex-1 text-left">
                                                    <p className="font-medium text-white group-hover:text-purple-400 transition-colors">
                                                        {collection.name}
                                                    </p>
                                                    <p className="text-sm text-neutral-500">
                                                        {collection.postsCount} {collection.postsCount === 1 ? 'post' : 'posts'}
                                                    </p>
                                                </div>
                                                {addToCollectionMutation.isPending && addToCollectionMutation.variables === collection._id && (
                                                    <div className="w-5 h-5 border-2 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                                                )}
                                            </button>
                                        ))}

                                        {collections.length === 0 && !isCreating && (
                                            <p className="text-center text-neutral-500 py-4 text-sm">
                                                No collections yet. Create one to organize your saved posts.
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </m.div>
                </>
            )}
        </AnimatePresence>
    );
}
