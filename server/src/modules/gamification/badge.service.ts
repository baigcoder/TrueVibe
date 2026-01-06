import { Post } from '../posts/Post.model.js';
import { Profile } from '../users/Profile.model.js';
import { VerificationBadge, BADGE_CRITERIA, BadgeType, IVerificationBadge } from './VerificationBadge.model.js';
import { Notification } from '../notifications/Notification.model.js';
import { logger } from '../../shared/utils/logger.js';

export interface BadgeCheckResult {
    eligible: boolean;
    badgeType: BadgeType | null;
    currentBadge: BadgeType | null;
    authenticPosts: number;
    totalPosts: number;
    fakeRate: number;
    nextBadge: {
        type: BadgeType;
        postsNeeded: number;
    } | null;
}

/**
 * Check user's eligibility for verification badges
 */
export async function checkBadgeEligibility(userId: string): Promise<BadgeCheckResult> {
    // Get user's posts with AI analysis
    const posts = await Post.find({
        userId,
        isDeleted: false,
        status: 'published',
    }).select('trustLevel aiAnalysisId').lean();

    const totalPosts = posts.length;
    const authenticPosts = posts.filter(p =>
        (p.trustLevel as string) === 'authentic'
    ).length;
    const fakePosts = posts.filter(p =>
        (p.trustLevel as string) === 'likely_fake'
    ).length;

    const fakeRate = totalPosts > 0 ? fakePosts / totalPosts : 0;

    // Get current badge
    const currentBadge = await VerificationBadge.findOne({
        userId,
        isActive: true
    }).sort({ earnedAt: -1 });

    // Check eligibility for each badge tier (highest first)
    const badgeTiers: BadgeType[] = ['verified_creator', 'gold', 'silver', 'bronze'];
    let eligibleBadge: BadgeType | null = null;

    for (const tier of badgeTiers) {
        const criteria = BADGE_CRITERIA[tier];
        if (totalPosts >= criteria.minPosts && fakeRate <= criteria.maxFakeRate) {
            eligibleBadge = tier;
            break; // Got highest eligible tier
        }
    }

    // Calculate next badge progress
    let nextBadge: { type: BadgeType; postsNeeded: number } | null = null;

    if (!eligibleBadge || eligibleBadge === 'bronze') {
        const nextTier = eligibleBadge ? 'silver' : 'bronze';
        const criteria = BADGE_CRITERIA[nextTier];
        const postsNeeded = Math.max(0, criteria.minPosts - totalPosts);
        if (postsNeeded > 0) {
            nextBadge = { type: nextTier, postsNeeded };
        }
    } else if (eligibleBadge === 'silver') {
        nextBadge = {
            type: 'gold',
            postsNeeded: Math.max(0, BADGE_CRITERIA.gold.minPosts - totalPosts)
        };
    } else if (eligibleBadge === 'gold') {
        nextBadge = {
            type: 'verified_creator',
            postsNeeded: Math.max(0, BADGE_CRITERIA.verified_creator.minPosts - totalPosts)
        };
    }

    return {
        eligible: eligibleBadge !== null,
        badgeType: eligibleBadge,
        currentBadge: currentBadge?.badgeType || null,
        authenticPosts,
        totalPosts,
        fakeRate,
        nextBadge,
    };
}

/**
 * Award badge to user if eligible and not already awarded
 */
export async function awardBadge(userId: string, force = false): Promise<IVerificationBadge | null> {
    const eligibility = await checkBadgeEligibility(userId);

    if (!eligibility.eligible || !eligibility.badgeType) {
        return null;
    }

    // Check if already has this badge or higher
    if (!force && eligibility.currentBadge) {
        const tierOrder = ['bronze', 'silver', 'gold', 'verified_creator'];
        const currentIndex = tierOrder.indexOf(eligibility.currentBadge);
        const newIndex = tierOrder.indexOf(eligibility.badgeType);

        if (currentIndex >= newIndex) {
            return null; // Already has same or higher badge
        }
    }

    const criteria = BADGE_CRITERIA[eligibility.badgeType];

    try {
        // Create or update badge
        const badge = await VerificationBadge.findOneAndUpdate(
            { userId, badgeType: eligibility.badgeType },
            {
                userId,
                badgeType: eligibility.badgeType,
                earnedAt: new Date(),
                authenticPosts: eligibility.authenticPosts,
                totalPosts: eligibility.totalPosts,
                criteria: {
                    minPosts: criteria.minPosts,
                    maxFakeRate: criteria.maxFakeRate,
                    description: criteria.description,
                },
                isActive: true,
            },
            { upsert: true, new: true }
        );

        // Update profile with badge
        await Profile.findOneAndUpdate(
            { userId },
            {
                verificationBadge: eligibility.badgeType,
                verificationBadgeEarnedAt: new Date(),
            }
        );

        // Send notification
        const badgeEmoji = {
            bronze: '🥉',
            silver: '🥈',
            gold: '🥇',
            verified_creator: '✨',
        };

        await Notification.create({
            userId,
            type: 'achievement',
            title: `${badgeEmoji[eligibility.badgeType]} Badge Earned!`,
            body: `Congratulations! You've earned the ${eligibility.badgeType.toUpperCase()} verification badge for your authentic content.`,
            link: '/app/profile',
            isRead: false,
        });

        logger.info(`[Badges] Awarded ${eligibility.badgeType} badge to user ${userId}`);

        return badge;
    } catch (error) {
        logger.error(`[Badges] Failed to award badge to ${userId}:`, error);
        return null;
    }
}

/**
 * Get user's badges
 */
export async function getUserBadges(userId: string) {
    return VerificationBadge.find({ userId, isActive: true }).sort({ earnedAt: -1 });
}

/**
 * Get highest badge for user
 */
export async function getHighestBadge(userId: string): Promise<BadgeType | null> {
    const badges = await getUserBadges(userId);
    if (badges.length === 0) return null;

    const tierOrder = ['verified_creator', 'gold', 'silver', 'bronze'];
    for (const tier of tierOrder) {
        if (badges.some(b => b.badgeType === tier)) {
            return tier as BadgeType;
        }
    }
    return null;
}
