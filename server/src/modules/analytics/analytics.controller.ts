import { Request, Response, NextFunction } from 'express';
import { Post } from '../posts/Post.model.js';
import { Profile } from '../users/Profile.model.js';
import { Follow } from '../users/Follow.model.js';
import { AnalyticsSnapshot } from './AnalyticsSnapshot.model.js';
import { NotFoundError } from '../../shared/middleware/error.middleware.js';

// Get overview dashboard
export const getOverview = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // Get profile
        const profile = await Profile.findOne({ userId });
        if (!profile) {
            throw new NotFoundError('Profile');
        }

        // Get posts stats
        const postsStats = await Post.aggregate([
            { $match: { userId: profile.userId, isDeleted: false } },
            {
                $group: {
                    _id: null,
                    totalPosts: { $sum: 1 },
                    totalLikes: { $sum: '$likesCount' },
                    totalComments: { $sum: '$commentsCount' },
                    totalShares: { $sum: '$sharesCount' },
                },
            },
        ]);

        const stats = postsStats[0] || {
            totalPosts: 0,
            totalLikes: 0,
            totalComments: 0,
            totalShares: 0,
        };

        // Calculate engagement rate
        const totalEngagement = stats.totalLikes + stats.totalComments + stats.totalShares;
        const engagementRate = profile.followers > 0
            ? ((totalEngagement / (stats.totalPosts * profile.followers)) * 100).toFixed(2)
            : '0.00';

        res.json({
            success: true,
            data: {
                overview: {
                    reach: profile.followers * 2.5, // Estimated reach
                    followers: profile.followers,
                    following: profile.following,
                    trustScore: profile.trustScore,
                    engagementRate: parseFloat(engagementRate),
                    totalPosts: stats.totalPosts,
                    totalLikes: stats.totalLikes,
                    totalComments: stats.totalComments,
                    totalShares: stats.totalShares,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get reach metrics over time
export const getReachMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { period = '7d' } = req.query;

        // Calculate date range
        const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
        const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Get daily post engagement as reach proxy
        const dailyStats = await Post.aggregate([
            {
                $match: {
                    userId: userId,
                    isDeleted: false,
                    createdAt: { $gte: startDate },
                },
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
                    },
                    reach: {
                        $sum: { $add: ['$likesCount', '$commentsCount', { $multiply: ['$sharesCount', 2] }] },
                    },
                    posts: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Fill in missing dates
        const filledStats = [];
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            const existing = dailyStats.find((s) => s._id === dateStr);
            filledStats.push({
                name: date.toLocaleDateString('en-US', { weekday: 'short' }),
                date: dateStr,
                reach: existing?.reach || 0,
            });
        }

        res.json({
            success: true,
            data: { metrics: filledStats },
        });
    } catch (error) {
        next(error);
    }
};

// Get engagement metrics
export const getEngagementMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // Get engagement breakdown
        const engagement = await Post.aggregate([
            { $match: { userId: userId, isDeleted: false } },
            {
                $group: {
                    _id: null,
                    likes: { $sum: '$likesCount' },
                    comments: { $sum: '$commentsCount' },
                    shares: { $sum: '$sharesCount' },
                    saves: { $sum: { $size: '$savedBy' } },
                },
            },
        ]);

        const stats = engagement[0] || { likes: 0, comments: 0, shares: 0, saves: 0 };

        // Get top performing posts
        const topPosts = await Post.find({ userId, isDeleted: false })
            .sort({
                likesCount: -1,
                commentsCount: -1,
            })
            .limit(5)
            .select('content likesCount commentsCount sharesCount createdAt');

        res.json({
            success: true,
            data: {
                breakdown: [
                    { name: 'Likes', value: stats.likes, color: '#ef4444' },
                    { name: 'Comments', value: stats.comments, color: '#3b82f6' },
                    { name: 'Shares', value: stats.shares, color: '#22c55e' },
                    { name: 'Saves', value: stats.saves, color: '#f59e0b' },
                ],
                topPosts,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get trust metrics
export const getTrustMetrics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;

        // Get trust level distribution for user's posts
        const trustDistribution = await Post.aggregate([
            { $match: { userId: userId, isDeleted: false } },
            {
                $group: {
                    _id: '$trustLevel',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Get profile trust score
        const profile = await Profile.findOne({ userId });

        // Format distribution
        const distribution = {
            authentic: 0,
            suspicious: 0,
            likely_fake: 0,
            pending: 0,
        };

        trustDistribution.forEach((item) => {
            if (item._id && item._id in distribution) {
                distribution[item._id as keyof typeof distribution] = item.count;
            }
        });

        res.json({
            success: true,
            data: {
                trustScore: profile?.trustScore || 50,
                distribution: [
                    { name: 'Authentic', value: distribution.authentic, color: '#22c55e' },
                    { name: 'Suspicious', value: distribution.suspicious, color: '#f59e0b' },
                    { name: 'Likely Fake', value: distribution.likely_fake, color: '#ef4444' },
                    { name: 'Pending', value: distribution.pending, color: '#6b7280' },
                ],
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get individual post analytics
export const getPostAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOne({ _id: id, userId, isDeleted: false })
            .populate('media')
            .populate('aiAnalysisId');

        if (!post) {
            throw new NotFoundError('Post');
        }

        res.json({
            success: true,
            data: {
                post,
                analytics: {
                    reach: post.likesCount + post.commentsCount + (post.sharesCount * 2),
                    engagement: {
                        likes: post.likesCount,
                        comments: post.commentsCount,
                        shares: post.sharesCount,
                        saves: post.savedBy.length,
                    },
                    trustLevel: post.trustLevel,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};
