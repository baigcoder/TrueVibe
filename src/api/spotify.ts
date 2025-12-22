import { api } from './client';

export interface SpotifyStatus {
    connected: boolean;
    displayName?: string;
    spotifyUserId?: string;
}

export interface SpotifyTrack {
    id: string;
    name: string;
    artists: string;
    album: string;
    albumArt: string;
    duration: number;
    progress: number;
    uri: string;
}

export interface NowPlayingResponse {
    playing: boolean;
    track?: SpotifyTrack;
    error?: string;
}

export const spotifyApi = {
    getAuthUrl: async () => {
        const data = await api.get<{ authUrl: string }>('/spotify/auth');
        return data;
    },

    getMe: async () => {
        const data = await api.get<SpotifyStatus>('/spotify/me');
        return data;
    },

    getNowPlaying: async () => {
        const data = await api.get<NowPlayingResponse>('/spotify/now-playing');
        return data;
    },

    disconnect: async () => {
        const data = await api.post<{ success: boolean }>('/spotify/disconnect');
        return data;
    },

    // Playback controls (requires Spotify Premium)
    play: async () => {
        const data = await api.put<{ success: boolean }>('/spotify/play');
        return data;
    },

    pause: async () => {
        const data = await api.put<{ success: boolean }>('/spotify/pause');
        return data;
    },

    next: async () => {
        const data = await api.post<{ success: boolean }>('/spotify/next');
        return data;
    },

    previous: async () => {
        const data = await api.post<{ success: boolean }>('/spotify/previous');
        return data;
    },
};
