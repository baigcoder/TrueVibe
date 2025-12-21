import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { authApi, usersApi, postsApi, commentsApi, feedApi, chatApi, analyticsApi, mediaApi, shortsApi, storiesApi, notificationApi, searchApi } from './client';

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
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId] });
        },
    });
}

export function useUnfollow() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (userId: string) => usersApi.unfollow(userId),
        onSuccess: (_, userId) => {
            queryClient.invalidateQueries({ queryKey: ['users', userId] });
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

// Suggested users hook - requires authentication
export function useSuggestedUsers(limit?: number) {

    return useQuery({
        queryKey: ['users', 'suggestions', limit],
        queryFn: () => usersApi.getSuggestions(limit),
        staleTime: 5 * 60 * 1000, // 5 minutes
        // Only fetch when authenticated
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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users', 'follow-requests'] });
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

// Aliases for follow/unfollow
export const useFollowUser = useFollow;
export const useUnfollowUser = useUnfollow;

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
    return useMutation({
        mutationFn: postsApi.create,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

export function useLikePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.like(postId),
        onMutate: async (postId) => {
            // Optimistic update
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            const previous = queryClient.getQueryData(['posts', postId]);
            queryClient.setQueryData(['posts', postId], (old: any) => ({
                ...old,
                data: {
                    ...old?.data,
                    post: {
                        ...old?.data?.post,
                        isLiked: true,
                        likesCount: (old?.data?.post?.likesCount || 0) + 1,
                    },
                },
            }));
            return { previous };
        },
        onError: (_, postId, context) => {
            queryClient.setQueryData(['posts', postId], context?.previous);
        },
    });
}

export function useUnlikePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.unlike(postId),
        onMutate: async (postId) => {
            await queryClient.cancelQueries({ queryKey: ['posts', postId] });
            const previous = queryClient.getQueryData(['posts', postId]);
            queryClient.setQueryData(['posts', postId], (old: any) => ({
                ...old,
                data: {
                    ...old?.data,
                    post: {
                        ...old?.data?.post,
                        isLiked: false,
                        likesCount: Math.max(0, (old?.data?.post?.likesCount || 1) - 1),
                    },
                },
            }));
            return { previous };
        },
        onError: (_, postId, context) => {
            queryClient.setQueryData(['posts', postId], context?.previous);
        },
    });
}

export function useDeletePost() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => postsApi.delete(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['feed'] });
        },
    });
}

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
    return useMutation({
        mutationFn: commentsApi.create,
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['comments', variables.postId] });
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
        mutationFn: ({ conversationId, content, replyTo }: { conversationId: string; content: string; replyTo?: string }) =>
            chatApi.sendMessage(conversationId, { content, replyTo }),
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['messages', variables.conversationId] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
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
        mutationFn: ({ serverId, channelId, content, replyTo }: { serverId: string; channelId: string; content: string; replyTo?: string }) =>
            chatApi.sendChannelMessage(serverId, channelId, { content, replyTo }),
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
        },
    });
}

export function useLikeShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => shortsApi.like(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['shorts', id] });
        },
    });
}

export function useUnlikeShort() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => shortsApi.unlike(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['shorts', id] });
        },
    });
}

export function useRecordShortView() {
    return useMutation({
        mutationFn: (id: string) => shortsApi.recordView(id),
    });
}

// ============ Stories Hooks ============

export function useStoriesFeed() {

    return useQuery({
        queryKey: ['stories', 'feed'],
        queryFn: storiesApi.getFeed,
        // Only fetch when authenticated
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
        // Only fetch when authenticated
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
