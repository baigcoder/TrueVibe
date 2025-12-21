import { Request, Response, NextFunction } from 'express';
import { Profile } from '../users/Profile.model.js';
import {
    NotFoundError,
} from '../../shared/middleware/error.middleware.js';

/**
 * Sync user profile from Supabase to backend
 * Called when user signs in via Supabase Auth
 */
export const syncProfile = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { supabaseId, email, name, avatar } = req.body;
        const userId = req.auth?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
            });
            return;
        }

        // Find or create profile using supabaseId
        let profile = await Profile.findOne({
            $or: [
                { supabaseId },
                { clerkId: supabaseId }, // Backward compatibility
            ]
        });

        if (!profile) {
            // Generate a handle from name or email
            const baseHandle = (name || email?.split('@')[0] || 'user')
                .toLowerCase()
                .replace(/[^a-z0-9_]/g, '')
                .slice(0, 20);

            // Check if handle exists and append random suffix if needed
            let handle = baseHandle;
            let attempts = 0;
            while (await Profile.findOne({ handle }) && attempts < 5) {
                handle = `${baseHandle}${Math.floor(Math.random() * 9999)}`;
                attempts++;
            }

            console.log('[Sync] Creating new profile:', { supabaseId, name, avatar: avatar ? 'provided' : 'none', handle });

            profile = await Profile.create({
                supabaseId,
                clerkId: supabaseId, // For backward compatibility
                userId: supabaseId,
                name: name || 'User',
                handle,
                avatar: avatar || '',
                trustScore: 50,
            });
        } else {
            // Update existing profile - always update name and avatar from OAuth
            console.log('[Sync] Updating existing profile:', {
                supabaseId,
                oldName: profile.name,
                newName: name,
                oldAvatar: profile.avatar ? 'exists' : 'none',
                newAvatar: avatar ? 'provided' : 'none'
            });

            // Always update name if provided
            if (name) profile.name = name;

            // Always update avatar if provided (allows OAuth to update profile pic)
            if (avatar) profile.avatar = avatar;

            // Ensure supabaseId is set
            if (!profile.supabaseId) profile.supabaseId = supabaseId;

            await profile.save();
        }

        res.json({
            success: true,
            data: { profile },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get current user profile
 */
export const getCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.auth?.userId;

        if (!userId) {
            res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not authenticated' }
            });
            return;
        }

        const profile = await Profile.findOne({
            $or: [
                { supabaseId: userId },
                { clerkId: userId },
            ]
        });

        if (!profile) {
            throw new NotFoundError('Profile');
        }

        res.json({
            success: true,
            data: {
                user: {
                    id: userId,
                    supabaseId: userId,
                },
                profile,
            },
        });
    } catch (error) {
        next(error);
    }
};
