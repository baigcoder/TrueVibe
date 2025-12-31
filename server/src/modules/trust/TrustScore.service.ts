import { Profile } from '../users/Profile.model.js';
import { Post } from '../posts/Post.model.js';
import { Block } from '../users/Block.model.js';
import { TrustScoreHistory } from './TrustScoreHistory.model.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Trust Score Service
 * Centralized, multi-factor trust score calculation
 */

export interface TrustFactor {
    name: string;
    score: number;
    maxScore: number;
    description: string;
}

export interface TrustBreakdown {
    totalScore: number;
    level: 'excellent' | 'good' | 'average' | 'low' | 'risky';
    factors: TrustFactor[];
    lastUpdated: Date;
}

/**
 * Calculate comprehensive trust score for a user
 */
export async function calculateTrustScore(userId: string): Promise<TrustBreakdown> {
    const startTime = Date.now();

    // Fetch user profile
    const profile = await Profile.findOne({ userId }).lean();
    if (!profile) {
        throw new Error('Profile not found');
    }

    const factors: TrustFactor[] = [];
    let totalScore = 0;

    // 1. Base Score (20 points)
    const baseScore = 20;
    factors.push({
        name: 'Base Score',
        score: baseScore,
        maxScore: 20,
        description: 'Starting trust score for all users',
    });
    totalScore += baseScore;

    // 2. Account Verification (25 points)
    const verificationScore = profile.verified ? 25 : 0;
    factors.push({
        name: 'Verified Account',
        score: verificationScore,
        maxScore: 25,
        description: profile.verified ? 'Email/phone verified' : 'Not verified yet',
    });
    totalScore += verificationScore;

    // 3. Account Age (15 points max, +1 per month)
    const accountAgeMonths = profile.createdAt
        ? Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (30 * 24 * 60 * 60 * 1000))
        : 0;
    const ageScore = Math.min(accountAgeMonths, 15);
    factors.push({
        name: 'Account Age',
        score: ageScore,
        maxScore: 15,
        description: `${accountAgeMonths} month${accountAgeMonths !== 1 ? 's' : ''} old`,
    });
    totalScore += ageScore;

    // 4. Posts Count (10 points max, +0.5 per post)
    const postsCount = await Post.countDocuments({
        userId,
        isDeleted: false,
        status: 'published'
    });
    const postsScore = Math.min(Math.floor(postsCount * 0.5), 10);
    factors.push({
        name: 'Content Creation',
        score: postsScore,
        maxScore: 10,
        description: `${postsCount} post${postsCount !== 1 ? 's' : ''} published`,
    });
    totalScore += postsScore;

    // 5. Followers (10 points max, +1 per 20 followers)
    const followersCount = profile.followers || 0;
    const followersScore = Math.min(Math.floor(followersCount / 20), 10);
    factors.push({
        name: 'Community Trust',
        score: followersScore,
        maxScore: 10,
        description: `${followersCount} follower${followersCount !== 1 ? 's' : ''}`,
    });
    totalScore += followersScore;

    // 6. Following Ratio (5 points)
    // Penalize users following way more than they have followers (potential spam)
    const followingCount = profile.following || 0;
    let ratioScore = 5;
    if (followingCount > 0 && followersCount > 0) {
        const ratio = followingCount / followersCount;
        if (ratio > 10) ratioScore = 0; // Following 10x more than followers
        else if (ratio > 5) ratioScore = 2;
        else if (ratio > 2) ratioScore = 3;
    } else if (followingCount > 100 && followersCount === 0) {
        ratioScore = 0; // Following many but no followers = suspicious
    }
    factors.push({
        name: 'Following Ratio',
        score: ratioScore,
        maxScore: 5,
        description: `${followersCount}/${followingCount} followers/following`,
    });
    totalScore += ratioScore;

    // 7. Profile Completeness (5 points)
    let profileScore = 0;
    if (profile.bio && profile.bio.length > 10) profileScore += 2;
    if (profile.avatar && !profile.avatar.includes('default')) profileScore += 2;
    if (profile.location) profileScore += 1;
    factors.push({
        name: 'Profile Complete',
        score: profileScore,
        maxScore: 5,
        description: profileScore === 5 ? 'Fully complete' : 'Partially complete',
    });
    totalScore += profileScore;

    // 8. Engagement Rate (5 points)
    // Calculate average likes per post
    const postsWithLikes = await Post.find({
        userId,
        isDeleted: false,
        status: 'published'
    }).select('likes').limit(20).lean();

    let engagementScore = 0;
    if (postsWithLikes.length > 0) {
        const avgLikes = postsWithLikes.reduce((sum, p) => {
            const likesCount = Array.isArray(p.likes) ? p.likes.length : (typeof p.likes === 'number' ? p.likes : 0);
            return sum + likesCount;
        }, 0) / postsWithLikes.length;
        if (avgLikes >= 10) engagementScore = 5;
        else if (avgLikes >= 5) engagementScore = 3;
        else if (avgLikes >= 1) engagementScore = 1;
    }
    factors.push({
        name: 'Engagement Quality',
        score: engagementScore,
        maxScore: 5,
        description: `Average engagement on posts`,
    });
    totalScore += engagementScore;

    // 9. Reports Against User (penalty: -10 per confirmed report, max -30)
    // For now, we'll check if user has been blocked by many people as a proxy
    const blocksAgainst = await Block.countDocuments({ blockedId: userId });
    const reportPenalty = Math.min(blocksAgainst * 5, 30);
    if (reportPenalty > 0) {
        factors.push({
            name: 'Trust Issues',
            score: -reportPenalty,
            maxScore: 0,
            description: `Blocked by ${blocksAgainst} user${blocksAgainst !== 1 ? 's' : ''}`,
        });
        totalScore -= reportPenalty;
    }

    // Ensure score is within bounds
    totalScore = Math.max(0, Math.min(100, totalScore));

    // Determine level
    let level: TrustBreakdown['level'];
    if (totalScore >= 80) level = 'excellent';
    else if (totalScore >= 60) level = 'good';
    else if (totalScore >= 40) level = 'average';
    else if (totalScore >= 20) level = 'low';
    else level = 'risky';

    const duration = Date.now() - startTime;
    logger.info(`[TrustScore] Calculated score for ${userId}: ${totalScore} (${level}) in ${duration}ms`);

    return {
        totalScore: Math.round(totalScore),
        level,
        factors,
        lastUpdated: new Date(),
    };
}

/**
 * Update and save trust score for a user
 */
export async function updateTrustScore(
    userId: string,
    reason: string = 'recalculation'
): Promise<TrustBreakdown> {
    const breakdown = await calculateTrustScore(userId);

    // Get previous score
    const profile = await Profile.findOne({ userId });
    const previousScore = profile?.trustScore || 0;

    // Update profile
    await Profile.findOneAndUpdate(
        { userId },
        { trustScore: breakdown.totalScore }
    );

    // Record in history
    await TrustScoreHistory.create({
        userId,
        score: breakdown.totalScore,
        previousScore,
        factors: breakdown.factors.reduce((acc, f) => {
            acc[f.name] = f.score;
            return acc;
        }, {} as Record<string, number>),
        reason,
    });

    logger.info(`[TrustScore] Updated score for ${userId}: ${previousScore} -> ${breakdown.totalScore} (${reason})`);

    return breakdown;
}

/**
 * Get trust score history for a user
 */
export async function getTrustScoreHistory(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return TrustScoreHistory.find({
        userId,
        createdAt: { $gte: startDate },
    })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
}
