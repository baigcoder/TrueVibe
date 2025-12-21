import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

interface RequestOptions extends RequestInit {
    params?: Record<string, string>;
}

// Cached token - updated via auth state change listener
let cachedToken: string | null = null;

// Subscribe to auth state changes to keep token cached
supabase.auth.onAuthStateChange((event, session) => {
    cachedToken = session?.access_token || null;
    console.log('Auth state changed:', event, cachedToken ? 'Token available' : 'No token');
});

// Initialize token from existing session (synchronously try localStorage first)
try {
    const storedSession = localStorage.getItem('sb-bsxhzhvgerdpdohtervp-auth-token');
    if (storedSession) {
        const parsed = JSON.parse(storedSession);
        cachedToken = parsed?.access_token || null;
        console.log('Token from localStorage:', cachedToken ? 'Available' : 'Not found');
    }
} catch (e) {
    console.log('Could not read token from localStorage');
}

// Also initialize from Supabase (async fallback)
supabase.auth.getSession().then(({ data: { session } }) => {
    if (session?.access_token) {
        cachedToken = session.access_token;
        console.log('Initial session from Supabase:', 'Token available');
    }
});

class ApiClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    // Allow manual token injection from AuthContext
    public setAuthToken(token: string | null) {
        cachedToken = token;
    }

    private async getAuthToken(): Promise<string | null> {
        // If we have a cached token, use it
        if (cachedToken) {
            return cachedToken;
        }
        // Otherwise, try to get fresh token from Supabase
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                cachedToken = session.access_token;
                return cachedToken;
            }
        } catch (e) {
            console.error('Failed to get auth token:', e);
        }
        return null;
    }

    private async request<T>(
        endpoint: string,
        options: RequestOptions = {}
    ): Promise<T> {
        const { params, ...fetchOptions } = options;

        let url = `${this.baseUrl}${endpoint}`;
        if (params) {
            const searchParams = new URLSearchParams(params);
            url += `?${searchParams.toString()}`;
        }

        // Get auth token (async to ensure we wait for it)
        const token = await this.getAuthToken();
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(fetchOptions.headers as Record<string, string> || {}),
        };

        // Add Authorization header if we have a token
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
            ...fetchOptions,
            credentials: 'include',
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Request failed');
        }

        return data;
    }

    async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET', params });
    }

    async post<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
        const token = await this.getAuthToken();
        const headers: Record<string, string> = {};

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        // Don't set Content-Type - let browser set it with boundary for multipart/form-data

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            method: 'POST',
            credentials: 'include',
            headers,
            body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'Request failed');
        }

        return data;
    }

    async put<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async patch<T>(endpoint: string, body?: unknown): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PATCH',
            body: body ? JSON.stringify(body) : undefined,
        });
    }

    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const api = new ApiClient(API_BASE_URL);

// Auth API
export const authApi = {
    register: (data: { email: string; password: string; name: string; handle: string }) =>
        api.post('/auth/register', data),
    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    refresh: () => api.post('/auth/refresh'),
    me: () => api.get('/auth/me'),
};

// Users API
export const usersApi = {
    getById: (id: string) => api.get(`/users/${id}`),
    updateProfile: (data: Record<string, unknown>) => api.patch('/users/me', data),
    updateSettings: (data: Record<string, unknown>) => api.put('/users/settings', data),
    follow: (id: string) => api.post(`/users/${id}/follow`),
    unfollow: (id: string) => api.delete(`/users/${id}/follow`),
    getFollowers: (id: string, params?: Record<string, string>) =>
        api.get(`/users/${id}/followers`, params),
    getFollowing: (id: string, params?: Record<string, string>) =>
        api.get(`/users/${id}/following`, params),
    search: (query: string) => api.get('/users', { q: query }),
    getSuggestions: (limit?: number) => api.get('/users/suggestions/for-you', limit ? { limit: String(limit) } : undefined),
    getFollowRequests: (params?: Record<string, string>) => api.get('/users/follow-requests', params),
    acceptFollowRequest: (id: string) => api.post(`/users/follow-requests/${id}/accept`),
    rejectFollowRequest: (id: string) => api.post(`/users/follow-requests/${id}/reject`),
    cancelFollowRequest: (targetUserId: string) => api.delete(`/users/${targetUserId}/follow-request`),
};


// Posts API
export const postsApi = {
    create: (data: { content: string; mediaIds?: string[]; visibility?: string }) =>
        api.post('/posts', data),
    getById: (id: string) => api.get(`/posts/${id}`),
    update: (id: string, data: { content: string }) => api.patch(`/posts/${id}`, data),
    delete: (id: string) => api.delete(`/posts/${id}`),
    like: (id: string) => api.post(`/posts/${id}/like`),
    unlike: (id: string) => api.delete(`/posts/${id}/like`),
    save: (id: string) => api.post(`/posts/${id}/save`),
    unsave: (id: string) => api.delete(`/posts/${id}/save`),
    repost: (id: string) => api.post(`/posts/${id}/repost`),
    getAIAnalysis: (id: string) => api.get(`/posts/${id}/ai-analysis`),
    getUserPosts: (userId: string, params?: Record<string, string>) =>
        api.get(`/posts/user/${userId}`, params),
    // Poll voting
    votePoll: (id: string, optionIndex: number) => api.post(`/posts/${id}/vote`, { optionIndex }),
    // Pin/Unpin
    pinPost: (id: string) => api.post(`/posts/${id}/pin`),
    unpinPost: (id: string) => api.delete(`/posts/${id}/pin`),
    // Hashtags
    getTrendingHashtags: (limit?: number) => api.get('/posts/hashtags/trending', limit ? { limit: String(limit) } : undefined),
    getHashtagPosts: (hashtag: string, params?: Record<string, string>) => api.get(`/posts/hashtags/${hashtag}`, params),
    // Quote post
    quotePost: (id: string, content: string) => api.post(`/posts/${id}/quote`, { content }),
    // Drafts
    saveDraft: (data: any) => api.post('/posts/drafts/save', data),
    getDrafts: () => api.get('/posts/drafts/list'),
    deleteDraft: (id: string) => api.delete(`/posts/drafts/${id}`),
    publishDraft: (id: string) => api.post(`/posts/drafts/${id}/publish`),
    // Scheduling
    getScheduledPosts: () => api.get('/posts/scheduled/list'),
    cancelScheduledPost: (id: string) => api.delete(`/posts/scheduled/${id}`),
    recordView: (id: string) => api.post(`/posts/${id}/view`),
    getPostAnalytics: (id: string) => api.get(`/posts/${id}/analytics`),
};

// Media API
export const mediaApi = {
    getUploadUrl: (folder?: string) => api.post('/media/upload-url', { folder }),
    confirmUpload: (data: Record<string, unknown>) => api.post('/media/confirm', data),
};

// Comments API
export const commentsApi = {
    create: (data: { postId?: string; shortId?: string; parentId?: string; content: string }) =>
        api.post('/comments', data),
    getForPost: (postId: string, params?: Record<string, string>) =>
        api.get(`/comments/post/${postId}`, params),
    getForShort: (shortId: string, params?: Record<string, string>) =>
        api.get(`/comments/short/${shortId}`, params),
    getReplies: (id: string, params?: Record<string, string>) =>
        api.get(`/comments/${id}/replies`, params),
    delete: (id: string) => api.delete(`/comments/${id}`),
    update: (id: string, data: { content: string }) => api.patch(`/comments/${id}`, data),
    like: (id: string) => api.post(`/comments/${id}/like`),
    unlike: (id: string) => api.delete(`/comments/${id}/like`),
    flag: (id: string, reason: string) => api.post(`/comments/${id}/flag`, { reason }),
};

// Feed API
export const feedApi = {
    getMain: (params?: Record<string, string>) => api.get('/feed', params),
    getFollowing: (params?: Record<string, string>) => api.get('/feed/following', params),
    getTrending: (params?: Record<string, string>) => api.get('/feed/trending', params),
    getTrustWatch: (params?: Record<string, string>) => api.get('/feed/trust-watch', params),
};

// Chat API
export const chatApi = {
    // DM Conversations
    getConversations: () => api.get('/chat/conversations'),
    createConversation: (data: { participantIds: string[]; type?: string; groupName?: string }) =>
        api.post('/chat/conversations', data),
    getConversation: (id: string) => api.get(`/chat/conversations/${id}`),
    getMessages: (id: string, params?: Record<string, string>) =>
        api.get(`/chat/conversations/${id}/messages`, params),
    sendMessage: (id: string, data: { content: string; media?: unknown[]; replyTo?: string }) =>
        api.post(`/chat/conversations/${id}/messages`, data),
    markAsRead: (id: string) => api.put(`/chat/conversations/${id}/read`),

    // Servers (Discord-like)
    getServers: () => api.get('/chat/servers'),
    discoverServers: (params?: Record<string, string>) => api.get('/chat/servers/discover', params),
    createServer: (data: { name: string; description?: string; icon?: string; isPublic?: boolean }) =>
        api.post('/chat/servers', data),
    getServer: (id: string) => api.get(`/chat/servers/${id}`),
    joinServer: (id: string, inviteCode?: string) =>
        api.post(`/chat/servers/${id}/join`, { inviteCode }),
    joinViaInvite: (inviteCode: string) =>
        api.post(`/chat/invite/${inviteCode}`),
    leaveServer: (id: string) => api.post(`/chat/servers/${id}/leave`),

    // Channels
    getChannels: (serverId: string) => api.get(`/chat/servers/${serverId}/channels`),
    createChannel: (serverId: string, data: { name: string; type?: string; topic?: string }) =>
        api.post(`/chat/servers/${serverId}/channels`, data),
    getChannelMessages: (serverId: string, channelId: string, params?: Record<string, string>) =>
        api.get(`/chat/servers/${serverId}/channels/${channelId}/messages`, params),
    sendChannelMessage: (serverId: string, channelId: string, data: { content: string; media?: unknown[]; replyTo?: string }) =>
        api.post(`/chat/servers/${serverId}/channels/${channelId}/messages`, data),
    getPinnedMessages: (serverId: string, channelId: string) =>
        api.get(`/chat/servers/${serverId}/channels/${channelId}/pinned`),

    // Reactions
    addReaction: (messageId: string, emoji: string) =>
        api.post(`/chat/messages/${messageId}/reactions`, { emoji }),
    removeReaction: (messageId: string, emoji: string) =>
        api.delete(`/chat/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`),
    pinMessage: (messageId: string) =>
        api.post(`/chat/messages/${messageId}/pin`),
};

// Analytics API
export const analyticsApi = {
    getOverview: () => api.get('/analytics/overview'),
    getReach: (period?: string) => api.get('/analytics/reach', period ? { period } : undefined),
    getEngagement: () => api.get('/analytics/engagement'),
    getTrust: () => api.get('/analytics/trust'),
    getPostAnalytics: (id: string) => api.get(`/analytics/posts/${id}`),
};

// Shorts API
export const shortsApi = {
    getFeed: (params?: Record<string, string>) => api.get('/shorts/feed', params),
    getTrending: () => api.get('/shorts/trending'),
    getUserShorts: (userId: string) => api.get(`/shorts/user/${userId}`),
    getById: (id: string) => api.get(`/shorts/${id}`),
    create: (formData: FormData) => api.postFormData('/shorts', formData),
    like: (id: string) => api.post(`/shorts/${id}/like`),
    unlike: (id: string) => api.delete(`/shorts/${id}/like`),
    recordView: (id: string) => api.post(`/shorts/${id}/view`),
    delete: (id: string) => api.delete(`/shorts/${id}`),
};

// Stories API
export const storiesApi = {
    getFeed: () => api.get('/stories/feed'),
    create: (formData: FormData) => api.postFormData('/stories', formData),
    view: (id: string) => api.post(`/stories/${id}/view`),
    like: (id: string) => api.post(`/stories/${id}/like`),
    comment: (id: string, content: string) => api.post(`/stories/${id}/comment`, { content }),
    react: (id: string, emoji: string) => api.post(`/stories/${id}/react`, { emoji }),
    getViewers: (id: string) => api.get(`/stories/${id}/viewers`),
    delete: (id: string) => api.delete(`/stories/${id}`),
};

// Notifications API
export const notificationApi = {
    getNotifications: (cursor?: string, limit: number = 20) =>
        api.get('/notifications', { cursor: cursor || '', limit: limit.toString() }),
    markAsRead: (id: string) => api.patch(`/notifications/${id}/read`),
    markAllAsRead: () => api.post('/notifications/read-all'),
};

// Search API
export const searchApi = {
    search: (q: string, type: string = 'all', limit: number = 10) =>
        api.get('/search', { q, type, limit: limit.toString() }),
};

