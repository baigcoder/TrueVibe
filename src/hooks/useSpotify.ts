import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { spotifyApi } from '@/api/spotify';
import { toast } from 'sonner';

export const useSpotify = () => {
    const queryClient = useQueryClient();

    const { data: status, isLoading: isStatusLoading } = useQuery({
        queryKey: ['spotify-status'],
        queryFn: spotifyApi.getMe,
        retry: false,
    });

    const { data: nowPlaying, isLoading: isNowPlayingLoading } = useQuery({
        queryKey: ['spotify-now-playing'],
        queryFn: spotifyApi.getNowPlaying,
        enabled: status?.connected === true,
        refetchInterval: 5000, // Poll every 5s for more responsive updates
    });

    const connectMutation = useMutation({
        mutationFn: spotifyApi.getAuthUrl,
        onSuccess: (data) => {
            if (data.authUrl) {
                window.location.href = data.authUrl;
            }
        },
        onError: () => {
            toast.error('Failed to initiate Spotify connection');
        }
    });

    const disconnectMutation = useMutation({
        mutationFn: spotifyApi.disconnect,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spotify-status'] });
            toast.success('Spotify disconnected');
        },
        onError: () => {
            toast.error('Failed to disconnect Spotify');
        }
    });

    // Playback control mutations
    const playMutation = useMutation({
        mutationFn: spotifyApi.play,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spotify-now-playing'] });
        },
        onError: () => {
            toast.error('Playback requires Spotify Premium');
        }
    });

    const pauseMutation = useMutation({
        mutationFn: spotifyApi.pause,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spotify-now-playing'] });
        },
        onError: () => {
            toast.error('Playback requires Spotify Premium');
        }
    });

    const nextMutation = useMutation({
        mutationFn: spotifyApi.next,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spotify-now-playing'] });
        },
        onError: () => {
            toast.error('Playback requires Spotify Premium');
        }
    });

    const previousMutation = useMutation({
        mutationFn: spotifyApi.previous,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['spotify-now-playing'] });
        },
        onError: () => {
            toast.error('Playback requires Spotify Premium');
        }
    });

    return {
        status,
        nowPlaying,
        isLoading: isStatusLoading || isNowPlayingLoading,
        connect: connectMutation.mutate,
        isConnecting: connectMutation.isPending,
        disconnect: disconnectMutation.mutate,
        isDisconnecting: disconnectMutation.isPending,
        // Playback controls
        play: playMutation.mutate,
        pause: pauseMutation.mutate,
        next: nextMutation.mutate,
        previous: previousMutation.mutate,
        isPlaying: nowPlaying?.playing ?? false,
    };
};

