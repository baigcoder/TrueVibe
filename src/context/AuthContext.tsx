import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useSocket } from './SocketContext';

interface Profile {
    _id: string;
    userId?: string;  // Supabase user ID
    supabaseId?: string;  // Alternative Supabase ID field
    name: string;
    handle: string;
    avatar?: string;
    bio?: string;
    location?: string;
    website?: string;
    verified?: boolean;
    followers?: number;
    following?: number;
    followersCount?: number;
    followingCount?: number;
    trustScore?: number;
}

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    signUp: (email: string, password: string, name: string) => Promise<{ error: Error | null }>;
    signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
    signOut: () => Promise<void>;
    getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { connect, disconnect } = useSocket();

    // Track if we've already synced to prevent repeated calls
    const hasSyncedRef = useRef(false);
    const syncingRef = useRef(false);

    // Sync profile with backend (with deduplication)
    const syncProfile = useCallback(async (currentUser: User, accessToken: string) => {
        // Prevent duplicate sync calls
        if (hasSyncedRef.current || syncingRef.current) {
            console.log('Profile sync skipped - already synced or in progress');
            return;
        }

        syncingRef.current = true;
        try {
            // Fetch fresh user data from Supabase to ensure we have complete metadata
            const { data: { user: freshUser } } = await supabase.auth.getUser();
            const userToSync = freshUser || currentUser;

            // Extract user metadata - Google OAuth stores data in different fields
            const metadata = userToSync.user_metadata || {};
            const identities = userToSync.identities || [];
            const googleIdentity = identities.find(i => i.provider === 'google');
            const googleData = googleIdentity?.identity_data || {};

            console.log('[Sync Debug] Fresh user fetched:', !!freshUser);
            console.log('[Sync Debug] User metadata:', metadata);
            console.log('[Sync Debug] Google identity data:', googleData);
            console.log('[Sync Debug] Identities:', identities.map(i => ({ provider: i.provider, id: i.id })));

            // Try multiple possible name fields (Google OAuth uses different ones)
            const name = googleData.full_name ||
                googleData.name ||
                metadata.full_name ||
                metadata.name ||
                metadata.preferred_username ||
                userToSync.email?.split('@')[0] ||
                'User';

            // Try multiple possible avatar fields (Google uses 'picture')
            const avatar = googleData.avatar_url ||
                googleData.picture ||
                metadata.avatar_url ||
                metadata.picture ||
                identities[0]?.identity_data?.avatar_url ||
                identities[0]?.identity_data?.picture ||
                '';

            console.log('[Sync Debug] Extracted name:', name);
            console.log('[Sync Debug] Extracted avatar:', avatar);

            const response = await fetch(`${API_URL}/auth/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    supabaseId: userToSync.id,
                    email: userToSync.email,
                    name,
                    avatar: avatar || undefined,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('[Sync Debug] Profile sync response:', data);
                setProfile(data.data?.profile || null);
                hasSyncedRef.current = true;
                console.log('[Sync Debug] Profile set:', data.data?.profile);
            } else {
                const errorText = await response.text();
                console.error('[Sync Debug] Profile sync failed:', response.status, errorText);
            }
        } catch (error) {
            console.error('[Sync Debug] Failed to sync profile:', error);
        } finally {
            syncingRef.current = false;
        }
    }, []);

    // Initialize auth state
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user && currentSession.access_token) {
                syncProfile(currentSession.user, currentSession.access_token);
                connect(currentSession.access_token);
            }

            setIsLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, currentSession) => {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (event === 'SIGNED_IN' && currentSession?.user && currentSession.access_token) {
                    // Reset sync flag to force fresh sync on each login (ensures OAuth data is updated)
                    hasSyncedRef.current = false;
                    syncProfile(currentSession.user, currentSession.access_token);
                    connect(currentSession.access_token);
                } else if (event === 'SIGNED_OUT') {
                    setProfile(null);
                    disconnect();
                }
            }
        );

        return () => {
            subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncProfile]); // connect/disconnect are stable refs from SocketContext

    const signUp = async (email: string, password: string, name: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
            },
        });
        return { error: error as Error | null };
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        return { error: error as Error | null };
    };

    const signOut = async () => {
        // Reset sync tracking so next login can sync fresh
        hasSyncedRef.current = false;
        syncingRef.current = false;

        // Clear state immediately
        setUser(null);
        setSession(null);
        setProfile(null);

        // Disconnect socket (don't await, just trigger)
        try {
            disconnect();
        } catch (e) {
            console.error('Socket disconnect error:', e);
        }

        // Sign out from Supabase with timeout protection
        try {
            await Promise.race([
                supabase.auth.signOut(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))
            ]);
        } catch (e) {
            console.error('Supabase signOut error:', e);
        }
    };

    const getToken = async () => {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        return currentSession?.access_token ?? null;
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                session,
                profile,
                isLoading,
                isAuthenticated: !!user,
                signUp,
                signIn,
                signOut,
                getToken,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}
