import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { api, authApi, usersApi, postsApi, commentsApi, feedApi, chatApi, analyticsApi, mediaApi, shortsApi, storiesApi, notificationApi, searchApi, highlightsApi } from './client';
import { useAuth } from '@/context/AuthContext';

// ============ Auth Hooks ============

export function useCurrentUser() {
    return useQuery({
        queryKey: ['auth', 'me'],
        queryFn: authApi.me,
        retry: false,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useLogin() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: authApi.login,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });
}

export function useRegister() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: authApi.register,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth'] });
        },
    });
}

export function useLogout() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: authApi.logout,
        onSuccess: () => {
            queryClient.clear();
        },
    });
}

// ============ User Hooks ============

export function useUser(id: string) {
    return useQuery({
        queryKey: ['users', id],
        queryFn: () => usersApi.getById(id),
        enabled: !!id,
    });
}

export function useUpdateProfile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: usersApi.updateProfile,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        },
    });
}

export function useFollow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => usersApi.follow(userId),
        onSuccess: (response: any, userId) => {
            console.log('[useFollow] Response:', response);

            // Invalidate multiple queries for real-time updates
            queryClient.invalidateQueries({ queryKey: ['users', userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'follow-requests'] });
            queryClient.invalidateQueries({ queryKey: ['users', 'suggestions'] });
        },
    });
}


export function useUnfollow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => usersApi.unfollow(userId),
        onSuccess: (_, userId) => {
            // Invalidate multiple queries for real-time updates
            queryClient.invalidateQueries({ queryKey: ['users', userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'profile', userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'suggestions'] });
        },
    });
}


// Alias for useUser for profile page
export function useProfile(userId: string) {
    return useQuery({
        queryKey: ['users', 'profile', userId],
        queryFn: () => usersApi.getById(userId),
        enabled: !!userId,
    });
}

export function useUserPosts(userId: string) {
    return useInfiniteQuery({
        queryKey: ['users', userId, 'posts'],
        queryFn: ({ pageParam }) => postsApi.getUserPosts(userId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!userId,
    });
}

export function useUserLikedPosts(userId: string) {
    return useInfiniteQuery({
        queryKey: ['users', userId, 'liked-posts'],
        queryFn: ({ pageParam }) => postsApi.getLikedPosts(userId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!userId,
    });
}

// Suggested users hook - requires authentication
export function useSuggestedUsers(limit?: number) {
    return useQuery({
        queryKey: ['users', 'suggestions', limit],
        queryFn: () => usersApi.getSuggestions(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Search users hook
export function useSearchUsers(query: string) {
    return useQuery({
        queryKey: ['users', 'search', query],
        queryFn: () => usersApi.search(query),
        enabled: query.length >= 2,
        staleTime: 30 * 1000, // 30 seconds
    });
}

// Follow requests hooks
export function useFollowRequests() {
    return useInfiniteQuery({
        queryKey: ['users', 'follow-requests'],
        queryFn: ({ pageParam }) => usersApi.getFollowRequests(pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
    });
}

export function useAcceptFollowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestId: string) => usersApi.acceptFollowRequest(requestId),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['users', 'follow-requests'] });
            queryClient.invalidateQueries({ queryKey: ['users', 'suggestions'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            // Invalidate requester's profile if we have their ID
            if ((data as any)?.data?.followerId) {
                queryClient.invalidateQueries({ queryKey: ['users', (data as any).data.followerId] });
            }
        },
    });
}


export function useRejectFollowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (requestId: string) => usersApi.rejectFollowRequest(requestId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'follow-requests'] });
        },
    });
}

// Cancel a pending follow request
export function useCancelFollowRequest() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (targetUserId: string) => usersApi.cancelFollowRequest(targetUserId),
        onSuccess: (_, targetUserId) => {
            queryClient.invalidateQueries({ queryKey: ['users', 'profile', targetUserId] });
            queryClient.invalidateQueries({ queryKey: ['users', targetUserId] });
        },
    });
}

// Get followers of a user
export function useFollowers(userId: string) {
    return useInfiniteQuery({
        queryKey: ['users', userId, 'followers'],
        queryFn: ({ pageParam }) => usersApi.getFollowers(userId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!userId,
    });
}

// Get users that someone is following
export function useFollowing(userId: string) {
    return useInfiniteQuery({
        queryKey: ['users', userId, 'following'],
        queryFn: ({ pageParam }) => usersApi.getFollowing(userId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!userId,
    });
}

// Aliases for follow/unfollow
export const useFollowUser = useFollow;
export const useUnfollowUser = useUnfollow;

// ============ Block Hooks ============

export function useBlockUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ userId, reason }: { userId: string; reason?: string }) =>
            usersApi.block(userId, reason),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['users', variables.userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'blocked'] });
        },
    });
}

export function useUnblockUser() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => usersApi.unblock(userId),
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId] });
            queryClient.invalidateQueries({ queryKey: ['users', 'blocked'] });
        },
    });
}

export function useCheckBlockStatus(userId: string) {
    return useQuery({
        queryKey: ['users', userId, 'block-status'],
        queryFn: () => usersApi.checkBlockStatus(userId),
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}


// ============ Post Hooks ============

export function usePost(id: string) {
    return useQuery({
        queryKey: ['posts', id],
        queryFn: () => postsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreatePost() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: postsApi.create,
        onMutate: async (newPostData) => {
            await queryClient.cancelQueries({ queryKey: ['feed'] });
            const previousFeeds = queryClient.getQueryData(['feed']);

            // Optimistically add the post to the feed
            // If the post has media, set trustLevel to 'pending' (analyzing)
            const hasMedia = !!(newPostData as any).mediaIds?.length || !!(newPostData as any).media?.length;
            const tempPost = {
                _id: 'temp-' + Date.now(),
                content: newPostData.content,
                createdAt: new Date().toISOString(),
                likesCount: 0,
                commentsCount: 0,
                isLiked: false,
                trustLevel: hasMedia ? 'pending' : 'authentic',
                trustScore: hasMedia ? 0 : 95,
                userId: profile ? {
                    _id: profile._id,
                    name: profile.name,
                    handle: profile.handle,
                    avatar: profile.avatar,
                } : undefined,
            };

            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                const newPages = [...old.pages];
                if (newPages.length > 0) {
                    newPages[0] = {
                        ...newPages[0],
                        data: {
                            ...newPages[0].data,
                            posts: [tempPost, ...newPages[0].data.posts],
                        },
                    };
                }
                return { ...old, pages: newPages };
            });

            return { previousFeeds };
        },
        onError: (_, __, context) => {
            if (context?.previousFeeds) queryClient.setQueriesData({ queryKey: ['feed'] }, context.previousFeeds);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

export function useLikePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.like(postId),
        onMutate: async (postId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            await queryClient.cancelQueries({ queryKey: ['feed'] });

            // Snapshot the previous values
            const previousPost = queryClient.getQueryData(['posts', postId]);
            const previousFeeds = queryClient.getQueryData(['feed']);

            // Optimistically update the single post query
            queryClient.setQueryData(['posts', postId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        post: {
                            ...old.data.post,
                            isLiked: true,
                            likesCount: (old.data.post.likesCount || 0) + 1,
                        },
                    },
                };
            });

            // Optimistically update all feeds
            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.map((post: any) =>
                                post._id === postId
                                    ? { ...post, isLiked: true, likesCount: (post.likesCount || 0) + 1 }
                                    : post
                            ),
                        },
                    })),
                };
            });

            return { previousPost, previousFeeds };
        },
        onError: (_, postId, context) => {
            if (context?.previousPost) queryClient.setQueryData(['posts', postId], context.previousPost);
            if (context?.previousFeeds) queryClient.setQueriesData({ queryKey: ['feed'] }, context.previousFeeds);
        },
        onSettled: (postId) => {
            queryClient.invalidateQueries({ queryKey: ['posts', postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

export function useUnlikePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.unlike(postId),
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            await queryClient.cancelQueries({ queryKey: ['feed'] });

            const previousPost = queryClient.getQueryData(['posts', postId]);
            const previousFeeds = queryClient.getQueryData(['feed']);

            queryClient.setQueryData(['posts', postId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        post: {
                            ...old.data.post,
                            isLiked: false,
                            likesCount: Math.max(0, (old.data.post.likesCount || 1) - 1),
                        },
                    },
                };
            });

            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.map((post: any) =>
                                post._id === postId
                                    ? { ...post, isLiked: false, likesCount: Math.max(0, (post.likesCount || 1) - 1) }
                                    : post
                            ),
                        },
                    })),
                };
            });

            return { previousPost, previousFeeds };
        },
        onError: (_, postId, context) => {
            if (context?.previousPost) queryClient.setQueryData(['posts', postId], context.previousPost);
            if (context?.previousFeeds) queryClient.setQueriesData({ queryKey: ['feed'] }, context.previousFeeds);
        },
        onSettled: (postId) => {
            queryClient.invalidateQueries({ queryKey: ['posts', postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

export function useDeletePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.delete(postId),
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['feed'] });
            const previousFeeds = queryClient.getQueryData(['feed']);

            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.filter((p: any) => (p._id || p.id || p.postId) !== postId),
                        },
                    })),
                };
            });

            return { previousFeeds };
        },
        onError: (_, __, context) => {
            if (context?.previousFeeds) queryClient.setQueriesData({ queryKey: ['feed'] }, context.previousFeeds);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

export function useUpdatePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, content }: { postId: string; content: string }) =>
            postsApi.update(postId, { content }),
        onMutate: async ({ postId, content }) => {
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            await queryClient.cancelQueries({ queryKey: ['feed'] });

            const previousPost = queryClient.getQueryData(['posts', postId]);
            const previousFeeds = queryClient.getQueryData(['feed']);

            // Update single post cache
            queryClient.setQueryData(['posts', postId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        post: {
                            ...old.data.post,
                            content,
                        },
                    },
                };
            });

            // Update feed cache
            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.map((post: any) =>
                                (post._id || post.id) === postId ? { ...post, content } : post
                            ),
                        },
                    })),
                };
            });

            return { previousPost, previousFeeds };
        },
        onError: (_, variables, context) => {
            if (context?.previousPost) queryClient.setQueryData(['posts', variables.postId], context.previousPost);
            if (context?.previousFeeds) queryClient.setQueriesData({ queryKey: ['feed'] }, context.previousFeeds);
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['posts', variables.postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

// Vote on a poll
export function useVotePoll() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, optionIndex }: { postId: string; optionIndex: number }) =>
            postsApi.votePoll(postId, optionIndex),
        onSuccess: (_, { postId }) => {
            queryClient.invalidateQueries({ queryKey: ['posts', postId] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

// Pin post to profile
export function usePinPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.pinPost(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Unpin post
export function useUnpinPost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.unpinPost(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['users'] });
        },
    });
}

// Get trending hashtags
export function useTrendingHashtags(limit?: number) {
    return useQuery({
        queryKey: ['hashtags', 'trending', limit],
        queryFn: () => postsApi.getTrendingHashtags(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

// Get posts by hashtag
export function useHashtagPosts(hashtag: string) {
    return useInfiniteQuery({
        queryKey: ['hashtags', hashtag, 'posts'],
        queryFn: ({ pageParam }) => postsApi.getHashtagPosts(hashtag, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!hashtag,
    });
}

// Quote a post
export function useQuotePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, content }: { postId: string; content: string }) =>
            postsApi.quotePost(postId, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

// ============ Draft Hooks ============

export function useSaveDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: any) => postsApi.saveDraft(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
        },
    });
}

export function useDrafts() {
    return useQuery({
        queryKey: ['drafts'],
        queryFn: postsApi.getDrafts,
    });
}

export function useDeleteDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => postsApi.deleteDraft(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
        },
    });
}

export function usePublishDraft() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => postsApi.publishDraft(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
            queryClient.invalidateQueries({ queryKey: ['feed'] });
            queryClient.invalidateQueries({ queryKey: ['posts'] });
        },
    });
}

// ============ Scheduling Hooks ============

export function useScheduledPosts() {
    return useQuery({
        queryKey: ['posts', 'scheduled'],
        queryFn: postsApi.getScheduledPosts,
    });
}

export const useCancelScheduledPost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: postsApi.cancelScheduledPost,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['posts', 'scheduled'] });
            queryClient.invalidateQueries({ queryKey: ['drafts'] });
        },
    });
};

export const useRecordView = () => {
    return useMutation({
        mutationFn: postsApi.recordView,
    });
};

export const usePostAnalytics = (postId: string) => {
    return useQuery({
        queryKey: ['posts', 'analytics', postId],
        queryFn: () => postsApi.getPostAnalytics(postId),
        enabled: !!postId && !postId.startsWith('temp-'),
    });
};

// ============ Feed Hooks ============

export function useFeed(type: 'main' | 'following' | 'trending' | 'trust-watch' = 'main') {
    const feedFn = {
        main: feedApi.getMain,
        following: feedApi.getFollowing,
        trending: feedApi.getTrending,
        'trust-watch': feedApi.getTrustWatch,
    }[type];

    return useInfiniteQuery({
        queryKey: ['feed', type],
        queryFn: ({ pageParam }) => feedFn(pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
    });
}

// ============ Comment Hooks ============

export function useComments(postId: string) {
    return useInfiniteQuery({
        queryKey: ['comments', postId],
        queryFn: ({ pageParam }) =>
            commentsApi.getForPost(postId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!postId,
    });
}

export function useCreateComment() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: commentsApi.create,
        onMutate: async (newComment) => {
            const queryKey = ['comments', newComment.postId];
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            const tempComment = {
                _id: 'temp-' + Date.now(),
                content: newComment.content,
                createdAt: new Date().toISOString(),
                likesCount: 0,
                userId: profile ? {
                    _id: profile._id,
                    name: profile.name,
                    handle: profile.handle,
                    avatar: profile.avatar,
                } : undefined,
            };

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                const newPages = [...old.pages];
                if (newPages.length > 0) {
                    newPages[0] = {
                        ...newPages[0],
                        data: {
                            ...newPages[0].data,
                            comments: [tempComment, ...newPages[0].data.comments],
                        },
                    };
                }
                return { ...old, pages: newPages };
            });

            // Optimistically update commentsCount in the feed
            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.map((post: any) =>
                                (post._id || post.id) === newComment.postId
                                    ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
                                    : post
                            ),
                        },
                    })),
                };
            });

            // Also update single post query if it exists
            queryClient.setQueryData(['posts', newComment.postId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        post: {
                            ...old.data.post,
                            commentsCount: (old.data.post.commentsCount || 0) + 1,
                        },
                    },
                };
            });

            return { previousComments };
        },
        onError: (_, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['comments', variables.postId], context.previousComments);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
        },
    });
}

export function useDeleteComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ commentId }: { commentId: string; postId: string }) => commentsApi.delete(commentId),
        onMutate: async ({ commentId, postId }) => {
            const queryKey = ['comments', postId];
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            comments: page.data.comments.filter((c: any) => (c._id || c.id) !== commentId),
                        },
                    })),
                };
            });

            // Optimistically decrement commentsCount in the feed
            queryClient.setQueriesData({ queryKey: ['feed'] }, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            posts: page.data.posts.map((post: any) =>
                                (post._id || post.id) === postId
                                    ? { ...post, commentsCount: Math.max(0, (post.commentsCount || 1) - 1) }
                                    : post
                            ),
                        },
                    })),
                };
            });

            // Also update single post query if it exists
            queryClient.setQueryData(['posts', postId], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        post: {
                            ...old.data.post,
                            commentsCount: Math.max(0, (old.data.post.commentsCount || 1) - 1),
                        },
                    },
                };
            });

            return { previousComments };
        },
        onError: (_, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['comments', variables.postId], context.previousComments);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
        },
    });
}

export function useEditComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ commentId, content }: { commentId: string; postId: string; content: string }) =>
            commentsApi.update(commentId, { content }),
        onMutate: async ({ commentId, postId, content }) => {
            const queryKey = ['comments', postId];
            await queryClient.cancelQueries({ queryKey });
            const previousComments = queryClient.getQueryData(queryKey);

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            comments: page.data.comments.map((c: any) =>
                                (c._id || c.id) === commentId ? { ...c, content } : c
                            ),
                        },
                    })),
                };
            });

            return { previousComments };
        },
        onError: (_, variables, context) => {
            if (context?.previousComments) {
                queryClient.setQueryData(['comments', variables.postId], context.previousComments);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
        },
    });
}

// Get replies to a comment
export function useReplies(commentId: string) {
    return useInfiniteQuery({
        queryKey: ['comments', 'replies', commentId],
        queryFn: ({ pageParam }) =>
            commentsApi.getReplies(commentId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!commentId,
    });
}

// Reply to a comment
export function useReplyToComment() {
    const queryClient = useQueryClient();
    const { profile } = useAuth();

    return useMutation({
        mutationFn: ({ parentId, postId, shortId, content }: {
            parentId: string;
            postId?: string;
            shortId?: string;
            content: string
        }) =>
            commentsApi.create({ parentId, postId, shortId, content }),
        onMutate: async ({ parentId, content }) => {
            // Optimistically add reply
            const queryKey = ['comments', 'replies', parentId];
            await queryClient.cancelQueries({ queryKey });
            const previousReplies = queryClient.getQueryData(queryKey);

            const tempReply = {
                _id: 'temp-' + Date.now(),
                content,
                parentId,
                createdAt: new Date().toISOString(),
                likesCount: 0,
                repliesCount: 0,
                userId: profile ? {
                    _id: profile._id,
                    name: profile.name,
                    handle: profile.handle,
                    avatar: profile.avatar,
                } : undefined,
            };

            queryClient.setQueryData(queryKey, (old: any) => {
                if (!old) return { pages: [{ data: { comments: [tempReply] } }], pageParams: [undefined] };
                const newPages = [...old.pages];
                if (newPages.length > 0) {
                    newPages[0] = {
                        ...newPages[0],
                        data: {
                            ...newPages[0].data,
                            comments: [tempReply, ...(newPages[0].data?.comments || [])],
                        },
                    };
                }
                return { ...old, pages: newPages };
            });

            return { previousReplies };
        },
        onError: (_, variables, context) => {
            if (context?.previousReplies) {
                queryClient.setQueryData(['comments', 'replies', variables.parentId], context.previousReplies);
            }
        },
        onSettled: (_, __, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', 'replies', variables.parentId] });
            if (variables.postId) {
                queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
            }
            if (variables.shortId) {
                queryClient.invalidateQueries({ queryKey: ['comments', 'short', variables.shortId] });
            }
        },
    });
}

// Like a comment
export function useLikeComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (commentId: string) => commentsApi.like(commentId),
        onMutate: async (commentId) => {
            // Optimistic update - increment likes
            await queryClient.cancelQueries({ queryKey: ['comments'] });

            // Update in all comment caches
            queryClient.setQueriesData({ queryKey: ['comments'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            comments: page.data?.comments?.map((c: any) =>
                                c._id === commentId
                                    ? { ...c, isLiked: true, likesCount: (c.likesCount || 0) + 1 }
                                    : c
                            ) || [],
                        },
                    })),
                };
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
        },
    });
}

// Unlike a comment
export function useUnlikeComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (commentId: string) => commentsApi.unlike(commentId),
        onMutate: async (commentId) => {
            await queryClient.cancelQueries({ queryKey: ['comments'] });

            queryClient.setQueriesData({ queryKey: ['comments'] }, (old: any) => {
                if (!old?.pages) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) => ({
                        ...page,
                        data: {
                            ...page.data,
                            comments: page.data?.comments?.map((c: any) =>
                                c._id === commentId
                                    ? { ...c, isLiked: false, likesCount: Math.max(0, (c.likesCount || 1) - 1) }
                                    : c
                            ) || [],
                        },
                    })),
                };
            });
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['comments'] });
        },
    });
}

// ============ Chat Hooks ============

export function useConversations() {
    return useQuery({
        queryKey: ['conversations'],
        queryFn: chatApi.getConversations,
    });
}

export function useMessages(conversationId: string) {
    return useInfiniteQuery({
        queryKey: ['messages', conversationId],
        queryFn: ({ pageParam }) =>
            chatApi.getMessages(conversationId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!conversationId,
    });
}

export function useSendMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ conversationId, content, media, replyTo }: { conversationId: string; content: string; media?: unknown[]; replyTo?: string }) =>
            chatApi.sendMessage(conversationId, { content, media, replyTo }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

export function useCreateConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: chatApi.createConversation,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
        },
    });
}

export function useDeleteConversation() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (conversationId: string) => chatApi.deleteConversation(conversationId),
        onMutate: async (conversationId) => {
            // Cancel outgoing refetches
            await queryClient.cancelQueries({ queryKey: ['conversations'] });

            // Snapshot the previous value
            const previousConversations = queryClient.getQueryData(['conversations']);

            // Optimistically remove the conversation from cache
            queryClient.setQueryData(['conversations'], (old: any) => {
                if (!old?.data?.conversations) return old;
                return {
                    ...old,
                    data: {
                        ...old.data,
                        conversations: old.data.conversations.filter(
                            (c: any) => c._id !== conversationId
                        ),
                    },
                };
            });

            return { previousConversations };
        },
        onError: (_, __, context) => {
            // Rollback on error
            if (context?.previousConversations) {
                queryClient.setQueryData(['conversations'], context.previousConversations);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
        },
    });
}

// ============ Server Hooks (Discord-like) ============

export function useServers() {
    return useQuery({
        queryKey: ['servers'],
        queryFn: chatApi.getServers,
    });
}

export function useDiscoverServers(search?: string) {
    return useQuery({
        queryKey: ['servers', 'discover', search],
        queryFn: () => chatApi.discoverServers(search ? { search } : undefined),
    });
}

export function useServer(id: string) {
    return useQuery({
        queryKey: ['servers', id],
        queryFn: () => chatApi.getServer(id),
        enabled: !!id,
    });
}

export function useCreateServer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: chatApi.createServer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
    });
}

export function useJoinServer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ serverId, inviteCode }: { serverId?: string; inviteCode?: string }) =>
            inviteCode && !serverId
                ? chatApi.joinViaInvite(inviteCode)
                : chatApi.joinServer(serverId!, inviteCode),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
    });
}

export function useLeaveServer() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: chatApi.leaveServer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['servers'] });
        },
    });
}

// ============ Channel Hooks ============

export function useChannels(serverId: string) {
    return useQuery({
        queryKey: ['channels', serverId],
        queryFn: () => chatApi.getChannels(serverId),
        enabled: !!serverId,
    });
}

export function useChannelMessages(serverId: string, channelId: string) {
    return useInfiniteQuery({
        queryKey: ['channelMessages', serverId, channelId],
        queryFn: ({ pageParam }) =>
            chatApi.getChannelMessages(serverId, channelId, pageParam ? { cursor: pageParam } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!serverId && !!channelId,
    });
}

export function useSendChannelMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ serverId, channelId, content, media, replyTo }: { serverId: string; channelId: string; content: string; media?: unknown[]; replyTo?: string }) =>
            chatApi.sendChannelMessage(serverId, channelId, { content, media, replyTo }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['channelMessages', variables.serverId, variables.channelId] });
            queryClient.invalidateQueries({ queryKey: ['channels', variables.serverId] });
        },
    });
}

export function usePinnedMessages(serverId: string, channelId: string) {
    return useQuery({
        queryKey: ['pinnedMessages', serverId, channelId],
        queryFn: () => chatApi.getPinnedMessages(serverId, channelId),
        enabled: !!serverId && !!channelId,
    });
}

// ============ Reaction Hooks ============

export function useAddReaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
            chatApi.addReaction(messageId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
        },
    });
}

export function useRemoveReaction() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ messageId, emoji }: { messageId: string; emoji: string }) =>
            chatApi.removeReaction(messageId, emoji),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
        },
    });
}

export function usePinMessage() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: chatApi.pinMessage,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pinnedMessages'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['channelMessages'] });
        },
    });
}

// ============ Analytics Hooks ============

export function useAnalyticsOverview() {
    return useQuery({
        queryKey: ['analytics', 'overview'],
        queryFn: analyticsApi.getOverview,
    });
}

export function useAnalyticsReach(period: string = '7d') {
    return useQuery({
        queryKey: ['analytics', 'reach', period],
        queryFn: () => analyticsApi.getReach(period),
    });
}

export function useAnalyticsEngagement() {
    return useQuery({
        queryKey: ['analytics', 'engagement'],
        queryFn: analyticsApi.getEngagement,
    });
}

export function useAnalyticsTrust() {
    return useQuery({
        queryKey: ['analytics', 'trust'],
        queryFn: analyticsApi.getTrust,
    });
}

// User's AI Reports for Analytics
export function useUserReports() {
    return useQuery({
        queryKey: ['user', 'reports'],
        queryFn: () => usersApi.getMyReports(),
    });
}

// Delete AI Report
export function useDeleteReport() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => api.delete(`/posts/${postId}/report`),
        onSuccess: () => {
            // Invalidate user reports cache to refresh the list
            queryClient.invalidateQueries({ queryKey: ['user', 'reports'] });
        },
    });
}

// ============ Media Hooks ============

export function useUploadUrl() {
    return useMutation({
        mutationFn: (folder?: string) => mediaApi.getUploadUrl(folder),
    });
}

export function useConfirmUpload() {
    return useMutation({
        mutationFn: mediaApi.confirmUpload,
    });
}

// ============ Shorts Hooks ============

export function useShortsFeed(params?: Record<string, string>) {
    return useInfiniteQuery({
        queryKey: ['shorts', 'feed', params],
        queryFn: ({ pageParam }) => shortsApi.getFeed(pageParam ? { ...params, cursor: pageParam } : params),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
    });
}

export function useTrendingShorts() {
    return useQuery({
        queryKey: ['shorts', 'trending'],
        queryFn: shortsApi.getTrending,
    });
}

export function useShort(id: string) {
    return useQuery({
        queryKey: ['shorts', id],
        queryFn: () => shortsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: shortsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shorts', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'trending'] });
        },
    });
}

export function useLikeShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => shortsApi.like(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['shorts', id] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'trending'] });
        },
    });
}

export function useUnlikeShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => shortsApi.unlike(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['shorts', id] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'trending'] });
        },
    });
}

export function useRecordShortView() {
    return useMutation({
        mutationFn: (id: string) => shortsApi.recordView(id),
    });
}

export function useDeleteShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => shortsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shorts', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'trending'] });
        },
    });
}

export function useUserShorts(userId: string) {
    return useQuery({
        queryKey: ['shorts', 'user', userId],
        queryFn: () => shortsApi.getUserShorts(userId),
        enabled: !!userId,
    });
}

// ============ Shorts Comment Hooks ============

export function useShortComments(shortId: string) {
    return useInfiniteQuery({
        queryKey: ['comments', 'short', shortId],
        queryFn: ({ pageParam }) =>
            commentsApi.getForShort(shortId, pageParam ? { cursor: pageParam as string } : undefined),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
        enabled: !!shortId,
    });
}

export function useCreateShortComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { shortId: string; content: string; parentId?: string }) =>
            commentsApi.create(data),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', 'short', variables.shortId] });
            queryClient.invalidateQueries({ queryKey: ['shorts', variables.shortId] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['shorts', 'trending'] });
        },
    });
}

// ============ Stories Hooks ============

export function useStoriesFeed() {
    return useQuery({
        queryKey: ['stories', 'feed'],
        queryFn: storiesApi.getFeed,
    });
}

export function useCreateStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: storiesApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
        },
    });
}

export function useViewStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storiesApi.view(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
        },
    });
}

export function useDeleteStory() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storiesApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
        },
    });
}

export function useStoryReact() {
    return useMutation({
        mutationFn: ({ id, emoji }: { id: string; emoji: string }) => storiesApi.react(id, emoji),
    });
}

export function useStoryLike() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => storiesApi.like(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'viewers'] });
        },
    });
}

export function useStoryComment() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, content }: { id: string; content: string }) => storiesApi.comment(id, content),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['stories', 'feed'] });
            queryClient.invalidateQueries({ queryKey: ['stories', 'viewers'] });
        },
    });
}

export function useStoryViewers(id?: string) {
    return useQuery({
        queryKey: ['stories', 'viewers', id],
        queryFn: () => storiesApi.getViewers(id!),
        enabled: !!id,
    });
}

// ============ Notification Hooks ============

export interface NotificationData {
    notifications: any[];
    cursor: string | null;
    hasMore: boolean;
}

export function useNotifications(limit = 20) {
    return useInfiniteQuery<any>({
        queryKey: ['notifications'],
        queryFn: ({ pageParam }) => notificationApi.getNotifications(pageParam as string | undefined, limit),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage: any) => lastPage?.data?.cursor || undefined,
    });
}

export function useMarkNotificationRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => notificationApi.markAsRead(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

export function useMarkAllNotificationsRead() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => notificationApi.markAllAsRead(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });
}

// ============ Search Hooks ============

export function useSearch(q: string, type: string = 'all', limit = 10) {
    return useQuery<any>({
        queryKey: ['search', q, type],
        queryFn: () => searchApi.search(q, type, limit),
        enabled: q.length >= 2,
    });
}

// ============ Story Highlights Hooks ============

export function useMyHighlights() {
    return useQuery({
        queryKey: ['highlights', 'me'],
        queryFn: highlightsApi.getMy,
    });
}

export function useUserHighlights(userId: string) {
    return useQuery({
        queryKey: ['highlights', 'user', userId],
        queryFn: () => highlightsApi.getUser(userId),
        enabled: !!userId,
    });
}

export function useHighlight(id: string) {
    return useQuery({
        queryKey: ['highlights', id],
        queryFn: () => highlightsApi.getById(id),
        enabled: !!id,
    });
}

export function useCreateHighlight() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (data: { title: string; coverImageUrl?: string }) => highlightsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['highlights', 'me'] });
        },
    });
}

export function useUpdateHighlight() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: { title?: string; coverImageUrl?: string } }) =>
            highlightsApi.update(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['highlights', id] });
            queryClient.invalidateQueries({ queryKey: ['highlights', 'me'] });
        },
    });
}

export function useDeleteHighlight() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => highlightsApi.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['highlights', 'me'] });
        },
    });
}

export function useAddStoryToHighlight() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ highlightId, storyId }: { highlightId: string; storyId: string }) =>
            highlightsApi.addStory(highlightId, storyId),
        onSuccess: (_, { highlightId }) => {
            queryClient.invalidateQueries({ queryKey: ['highlights', highlightId] });
            queryClient.invalidateQueries({ queryKey: ['highlights', 'me'] });
        },
    });
}

export function useRemoveStoryFromHighlight() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ highlightId, storyIndex }: { highlightId: string; storyIndex: number }) =>
            highlightsApi.removeStory(highlightId, storyIndex),
        onSuccess: (_, { highlightId }) => {
            queryClient.invalidateQueries({ queryKey: ['highlights', highlightId] });
            queryClient.invalidateQueries({ queryKey: ['highlights', 'me'] });
        },
    });
}

// ============ Gamification Hooks ============

export function useMyGamificationStats() {
    return useQuery({
        queryKey: ['gamification', 'me', 'stats'],
        queryFn: () => import('./client').then(m => m.gamificationApi.getMyStats()),
    });
}

export function useMyBadges() {
    return useQuery({
        queryKey: ['gamification', 'me', 'badges'],
        queryFn: () => import('./client').then(m => m.gamificationApi.getMyBadges()),
    });
}

export function useUserGamificationStats(userId: string) {
    return useQuery({
        queryKey: ['gamification', 'user', userId],
        queryFn: () => import('./client').then(m => m.gamificationApi.getUserStats(userId)),
        enabled: !!userId,
    });
}

export function useLeaderboard(type: 'xp' | 'streak' = 'xp', limit = 20) {
    return useQuery({
        queryKey: ['gamification', 'leaderboard', type, limit],
        queryFn: () => import('./client').then(m => m.gamificationApi.getLeaderboard(type, limit)),
    });
}

export function useRecordActivity() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ action, xpAmount }: { action: string; xpAmount?: number }) =>
            import('./client').then(m => m.gamificationApi.recordActivity(action, xpAmount)),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['gamification', 'me'] });
        },
    });
}

// ============ Trust Score Hooks ============

export function useTrustScore() {
    return useQuery({
        queryKey: ['trust', 'score'],
        queryFn: () => import('./client').then(m => m.trustApi.getScore()),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
}

export function useTrustHistory(days: number = 30) {
    return useQuery({
        queryKey: ['trust', 'history', days],
        queryFn: () => import('./client').then(m => m.trustApi.getHistory(days)),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
}

export function useRecalculateTrust() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: () => import('./client').then(m => m.trustApi.recalculate()),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['trust'] });
        },
    });
}
