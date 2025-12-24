import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { Badge, UserAchievement, UserStats, calculateLevel, XP_PER_LEVEL } from './Gamification.model.js';
import { Profile } from '../users/Profile.model.js';

const router = Router();

// Get my gamification stats
router.get('/me/stats', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        let stats = await UserStats.findOne({ userId });

        // Create stats if not exists
        if (!stats) {
            stats = await UserStats.create({ userId });
        }

        // Calculate next level XP
        const currentLevelXP = XP_PER_LEVEL(stats.level);
        let xpIntoLevel = stats.xp;
        for (let i = 1; i < stats.level; i++) {
            xpIntoLevel -= XP_PER_LEVEL(i);
        }

        res.json({
            success: true,
            data: {
                stats: {
                    ...stats.toObject(),
                    xpToNextLevel: currentLevelXP,
                    xpProgress: xpIntoLevel,
                    progressPercent: Math.round((xpIntoLevel / currentLevelXP) * 100),
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get my badges
router.get('/me/badges', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        const achievements = await UserAchievement.find({ userId })
            .populate('badgeId')
            .sort({ earnedAt: -1 });

        const earnedBadges = achievements
            .filter(a => a.badgeId)
            .map(a => ({
                ...(a.badgeId as any).toObject(),
                earnedAt: a.earnedAt,
            }));

        res.json({
            success: true,
            data: { badges: earnedBadges },
        });
    } catch (error) {
        next(error);
    }
});

// Get user's public profile with gamification
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        const [stats, achievements] = await Promise.all([
            UserStats.findOne({ userId }),
            UserAchievement.find({ userId }).populate('badgeId').limit(10),
        ]);

        const badges = achievements
            .filter(a => a.badgeId)
            .map(a => ({
                ...(a.badgeId as any).toObject(),
                earnedAt: a.earnedAt,
            }));

        res.json({
            success: true,
            data: {
                level: stats?.level || 1,
                xp: stats?.xp || 0,
                currentStreak: stats?.currentStreak || 0,
                badges: badges.slice(0, 6), // Show top 6 badges
                badgeCount: badges.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get all available badges
router.get('/badges', async (req, res, next) => {
    try {
        const badges = await Badge.find({ isActive: true }).sort({ tier: 1, category: 1 });

        res.json({
            success: true,
            data: { badges },
        });
    } catch (error) {
        next(error);
    }
});

// Get leaderboard
router.get('/leaderboard', async (req, res, next) => {
    try {
        const { limit = '20', type = 'xp' } = req.query;

        const sortField = type === 'streak' ? 'currentStreak' : 'xp';

        const topUsers = await UserStats.find()
            .sort({ [sortField]: -1 })
            .limit(parseInt(limit as string, 10));

        // Get profiles for top users
        const userIds = topUsers.map(u => u.userId);
        const profiles = await Profile.find({
            $or: [
                { userId: { $in: userIds } },
                { supabaseId: { $in: userIds } },
            ]
        });

        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p.userId?.toString(), p);
            if (p.supabaseId) profileMap.set(p.supabaseId, p);
        });

        const leaderboard = topUsers.map((stats, index) => {
            const profile = profileMap.get(stats.userId);
            return {
                rank: index + 1,
                userId: stats.userId,
                name: profile?.name || 'Unknown',
                handle: profile?.handle,
                avatar: profile?.avatar,
                level: stats.level,
                xp: stats.xp,
                currentStreak: stats.currentStreak,
            };
        });

        res.json({
            success: true,
            data: { leaderboard },
        });
    } catch (error) {
        next(error);
    }
});

// Record activity (internal use - called from other services)
router.post('/activity', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { action, xpAmount = 5 } = req.body;

        let stats = await UserStats.findOne({ userId });
        if (!stats) {
            stats = await UserStats.create({ userId });
        }

        // Update streak
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const lastActive = stats.lastActiveDate ? new Date(stats.lastActiveDate) : null;

        if (lastActive) {
            lastActive.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff === 1) {
                // Consecutive day
                stats.currentStreak += 1;
                if (stats.currentStreak > stats.longestStreak) {
                    stats.longestStreak = stats.currentStreak;
                }
            } else if (daysDiff > 1) {
                // Streak broken
                stats.currentStreak = 1;
            }
            // daysDiff === 0 means same day, no streak change
        } else {
            stats.currentStreak = 1;
        }

        stats.lastActiveDate = new Date();

        // Update stat counters based on action
        if (action && stats.stats) {
            switch (action) {
                case 'post_created':
                    stats.stats.postsCreated += 1;
                    break;
                case 'comment_created':
                    stats.stats.commentsCreated += 1;
                    break;
                case 'like_given':
                    stats.stats.likesGiven += 1;
                    break;
                case 'like_received':
                    stats.stats.likesReceived += 1;
                    break;
                case 'follower_gained':
                    stats.stats.followersGained += 1;
                    break;
                case 'story_shared':
                    stats.stats.storiesShared += 1;
                    break;
                case 'short_created':
                    stats.stats.shortsCreated += 1;
                    break;
            }
        }

        // Add XP
        stats.xp += xpAmount;
        stats.level = calculateLevel(stats.xp);

        await stats.save();

        res.json({
            success: true,
            data: {
                xpGained: xpAmount,
                newXP: stats.xp,
                level: stats.level,
                streak: stats.currentStreak,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
