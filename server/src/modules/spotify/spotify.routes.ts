import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { Profile } from '../users/Profile.model.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Type definitions for Spotify API responses
interface SpotifyTokenResponse {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
}

interface SpotifyProfile {
    id: string;
    display_name: string;
    email?: string;
}

interface SpotifyTrack {
    id: string;
    name: string;
    artists: Array<{ name: string }>;
    album: {
        name: string;
        images: Array<{ url: string }>;
    };
    duration_ms: number;
    uri: string;
}

interface SpotifyNowPlaying {
    is_playing: boolean;
    progress_ms: number;
    item: SpotifyTrack | null;
}

// Spotify OAuth configuration
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || 'http://localhost:5000/api/v1/spotify/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Scopes for Spotify API access
const SCOPES = [
    'user-read-private',
    'user-read-email',
    'user-read-playback-state',
    'user-read-currently-playing',
    'user-modify-playback-state',
    'streaming',
].join(' ');

// Store state tokens temporarily (in production, use Redis)
const stateStore = new Map<string, { userId: string; expiresAt: number }>();

/**
 * GET /auth - Initiate Spotify OAuth flow
 */
router.get('/auth', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        // Generate state token
        const state = crypto.randomBytes(16).toString('hex');
        stateStore.set(state, {
            userId,
            expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
        });

        // Clean up expired states
        for (const [key, value] of stateStore.entries()) {
            if (value.expiresAt < Date.now()) {
                stateStore.delete(key);
            }
        }

        const authUrl = new URL('https://accounts.spotify.com/authorize');
        authUrl.searchParams.append('client_id', SPOTIFY_CLIENT_ID);
        authUrl.searchParams.append('response_type', 'code');
        authUrl.searchParams.append('redirect_uri', SPOTIFY_REDIRECT_URI);
        authUrl.searchParams.append('scope', SCOPES);
        authUrl.searchParams.append('state', state);

        res.json({ authUrl: authUrl.toString() });
    } catch (error) {
        console.error('Spotify auth error:', error);
        res.status(500).json({ error: 'Failed to initiate Spotify auth' });
    }
});

/**
 * GET /callback - Handle Spotify OAuth callback
 */
router.get('/callback', async (req: Request, res: Response) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.redirect(`${FRONTEND_URL}/app/settings?spotify_error=${error}`);
        }

        if (!state || typeof state !== 'string') {
            return res.redirect(`${FRONTEND_URL}/app/settings?spotify_error=invalid_state`);
        }

        const stateData = stateStore.get(state);
        if (!stateData || stateData.expiresAt < Date.now()) {
            stateStore.delete(state);
            return res.redirect(`${FRONTEND_URL}/app/settings?spotify_error=expired_state`);
        }

        stateStore.delete(state);
        const { userId } = stateData;

        // Exchange code for tokens
        const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code as string,
                redirect_uri: SPOTIFY_REDIRECT_URI,
            }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Spotify token error:', errorData);
            return res.redirect(`${FRONTEND_URL}/app/settings?spotify_error=token_exchange_failed`);
        }

        const tokens = await tokenResponse.json() as SpotifyTokenResponse;
        const { access_token, refresh_token, expires_in } = tokens;

        // Get user profile from Spotify
        const profileResponse = await fetch('https://api.spotify.com/v1/me', {
            headers: {
                'Authorization': `Bearer ${access_token}`,
            },
        });

        const spotifyProfile = await profileResponse.json() as SpotifyProfile;

        // Update user profile with Spotify data
        await Profile.findOneAndUpdate(
            { userId },
            {
                spotifyAccessToken: access_token,
                spotifyRefreshToken: refresh_token,
                spotifyTokenExpiry: new Date(Date.now() + expires_in * 1000),
                spotifyUserId: spotifyProfile.id,
                spotifyDisplayName: spotifyProfile.display_name,
                spotifyConnected: true,
            }
        );

        res.redirect(`${FRONTEND_URL}/app/settings?spotify_connected=true`);
    } catch (error) {
        console.error('Spotify callback error:', error);
        res.redirect(`${FRONTEND_URL}/app/settings?spotify_error=callback_failed`);
    }
});

/**
 * GET /me - Get Spotify connection status
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected) {
            return res.json({ connected: false });
        }

        res.json({
            connected: true,
            displayName: profile.spotifyDisplayName,
            spotifyUserId: profile.spotifyUserId,
        });
    } catch (error) {
        console.error('Spotify me error:', error);
        res.status(500).json({ error: 'Failed to get Spotify status' });
    }
});

/**
 * GET /now-playing - Get currently playing track
 */
router.get('/now-playing', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected || !profile.spotifyAccessToken) {
            return res.json({ playing: false });
        }

        // Check if token needs refresh
        if (profile.spotifyTokenExpiry && new Date() >= profile.spotifyTokenExpiry) {
            const refreshed = await refreshSpotifyToken(profile);
            if (!refreshed) {
                return res.json({ playing: false, error: 'Token refresh failed' });
            }
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
            headers: {
                'Authorization': `Bearer ${profile.spotifyAccessToken}`,
            },
        });

        if (response.status === 204 || !response.ok) {
            return res.json({ playing: false });
        }

        const data = await response.json() as SpotifyNowPlaying;

        if (!data.item) {
            return res.json({ playing: false });
        }

        res.json({
            playing: data.is_playing,
            track: {
                id: data.item.id,
                name: data.item.name,
                artists: data.item.artists.map((a) => a.name).join(', '),
                album: data.item.album.name,
                albumArt: data.item.album.images[0]?.url,
                duration: data.item.duration_ms,
                progress: data.progress_ms,
                uri: data.item.uri,
            },
        });
    } catch (error) {
        console.error('Spotify now-playing error:', error);
        res.status(500).json({ error: 'Failed to get now playing' });
    }
});

/**
 * PUT /play - Resume playback (requires Spotify Premium)
 */
router.put('/play', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected || !profile.spotifyAccessToken) {
            return res.status(400).json({ error: 'Spotify not connected' });
        }

        // Check if token needs refresh
        if (profile.spotifyTokenExpiry && new Date() >= profile.spotifyTokenExpiry) {
            const refreshed = await refreshSpotifyToken(profile);
            if (!refreshed) {
                return res.status(401).json({ error: 'Token refresh failed' });
            }
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/play', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${profile.spotifyAccessToken}`,
            },
        });

        if (response.status === 204 || response.ok) {
            return res.json({ success: true });
        }

        const errorData = await response.json() as { error?: { message?: string } };
        res.status(response.status).json({ error: errorData.error?.message || 'Playback failed' });
    } catch (error) {
        console.error('Spotify play error:', error);
        res.status(500).json({ error: 'Failed to resume playback' });
    }
});

/**
 * PUT /pause - Pause playback (requires Spotify Premium)
 */
router.put('/pause', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected || !profile.spotifyAccessToken) {
            return res.status(400).json({ error: 'Spotify not connected' });
        }

        // Check if token needs refresh
        if (profile.spotifyTokenExpiry && new Date() >= profile.spotifyTokenExpiry) {
            const refreshed = await refreshSpotifyToken(profile);
            if (!refreshed) {
                return res.status(401).json({ error: 'Token refresh failed' });
            }
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/pause', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${profile.spotifyAccessToken}`,
            },
        });

        if (response.status === 204 || response.ok) {
            return res.json({ success: true });
        }

        const errorData = await response.json() as { error?: { message?: string } };
        res.status(response.status).json({ error: errorData.error?.message || 'Pause failed' });
    } catch (error) {
        console.error('Spotify pause error:', error);
        res.status(500).json({ error: 'Failed to pause playback' });
    }
});

/**
 * POST /next - Skip to next track (requires Spotify Premium)
 */
router.post('/next', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected || !profile.spotifyAccessToken) {
            return res.status(400).json({ error: 'Spotify not connected' });
        }

        // Check if token needs refresh
        if (profile.spotifyTokenExpiry && new Date() >= profile.spotifyTokenExpiry) {
            const refreshed = await refreshSpotifyToken(profile);
            if (!refreshed) {
                return res.status(401).json({ error: 'Token refresh failed' });
            }
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/next', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${profile.spotifyAccessToken}`,
            },
        });

        if (response.status === 204 || response.ok) {
            return res.json({ success: true });
        }

        const errorData = await response.json() as { error?: { message?: string } };
        res.status(response.status).json({ error: errorData.error?.message || 'Skip failed' });
    } catch (error) {
        console.error('Spotify next error:', error);
        res.status(500).json({ error: 'Failed to skip to next track' });
    }
});

/**
 * POST /previous - Go to previous track (requires Spotify Premium)
 */
router.post('/previous', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;
        const profile = await Profile.findOne({ userId });

        if (!profile?.spotifyConnected || !profile.spotifyAccessToken) {
            return res.status(400).json({ error: 'Spotify not connected' });
        }

        // Check if token needs refresh
        if (profile.spotifyTokenExpiry && new Date() >= profile.spotifyTokenExpiry) {
            const refreshed = await refreshSpotifyToken(profile);
            if (!refreshed) {
                return res.status(401).json({ error: 'Token refresh failed' });
            }
        }

        const response = await fetch('https://api.spotify.com/v1/me/player/previous', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${profile.spotifyAccessToken}`,
            },
        });

        if (response.status === 204 || response.ok) {
            return res.json({ success: true });
        }

        const errorData = await response.json() as { error?: { message?: string } };
        res.status(response.status).json({ error: errorData.error?.message || 'Previous failed' });
    } catch (error) {
        console.error('Spotify previous error:', error);
        res.status(500).json({ error: 'Failed to go to previous track' });
    }
});

/**
 * POST /disconnect - Disconnect Spotify account
 */
router.post('/disconnect', authenticate, async (req: Request, res: Response) => {
    try {
        const userId = req.user?.userId;

        await Profile.findOneAndUpdate(
            { userId },
            {
                $unset: {
                    spotifyAccessToken: 1,
                    spotifyRefreshToken: 1,
                    spotifyTokenExpiry: 1,
                    spotifyUserId: 1,
                    spotifyDisplayName: 1,
                },
                spotifyConnected: false,
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Spotify disconnect error:', error);
        res.status(500).json({ error: 'Failed to disconnect Spotify' });
    }
});

/**
 * Helper: Refresh Spotify access token
 */
async function refreshSpotifyToken(profile: any): Promise<boolean> {
    try {
        if (!profile.spotifyRefreshToken) return false;

        const response = await fetch('https://accounts.spotify.com/api/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: profile.spotifyRefreshToken,
            }),
        });

        if (!response.ok) return false;

        const data = await response.json() as SpotifyTokenResponse;

        await Profile.findByIdAndUpdate(profile._id, {
            spotifyAccessToken: data.access_token,
            spotifyTokenExpiry: new Date(Date.now() + data.expires_in * 1000),
            ...(data.refresh_token && { spotifyRefreshToken: data.refresh_token }),
        });

        return true;
    } catch (error) {
        console.error('Spotify token refresh error:', error);
        return false;
    }
}

export default router;

