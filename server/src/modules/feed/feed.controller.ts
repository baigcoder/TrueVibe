import { Request, Response, NextFunction } from 'express';
import { Post } from '../posts/Post.model.js';
import { Profile } from '../users/Profile.model.js';
import { Follow } from '../users/Follow.model.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

// Helper to attach authors and interaction status to posts
async function attachAuthorsAndStatus(posts: any[], currentUserId?: string) {
    const userIds = [...new Set(posts.map((p) => p.userId.toString()))];
    const profiles = await Profile.find({ userId: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return posts.map((post) => {
        const postJson = post.toJSON ? post.toJSON() : post;
        return {
            ...postJson,
            author: profileMap.get(post.userId.toString()),
            // Add interaction status for logged-in users
            isLiked: currentUserId ? (postJson.likes || []).includes(currentUserId) : false,
            isSaved: currentUserId ? (postJson.savedBy || []).includes(currentUserId) : false,
        };
    });
}

// Main personalized feed
export const getMainFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '10' } = req.query;
        const userId = req.user?.userId;

        // Only use cache for anonymous users (logged-in users need fresh isLiked status)
        if (!userId) {
            const cacheKey = `feed:main:anon:${cursor || 'initial'}`;
            const cached = await cacheGet<any>(cacheKey);
            if (cached) {
                res.json({ success: true, data: cached });
                return;
            }
        }

        const query: Record<string, unknown> = {
            isDeleted: false,
            visibility: 'public',
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1)
            .populate('media');

        const hasMore = posts.length > parseInt(limit as string, 10);
        const results = hasMore ? posts.slice(0, -1) : posts;

        const postsWithAuthors = await attachAuthorsAndStatus(results, userId);

        const responseData = {
            posts: postsWithAuthors,
            cursor: hasMore ? results[results.length - 1]._id : null,
            hasMore,
        };

        // Cache for 1 minute (only for anonymous users)
        if (!userId) {
            await cacheSet(`feed:main:anon:${cursor || 'initial'}`, responseData, 60);
        }

        res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

// Following feed
export const getFollowingFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '10' } = req.query;
        const userId = req.user!.userId;

        // Get followed users
        const following = await Follow.find({ followerId: userId }).select('followingId');
        const followingIds = following.map((f) => f.followingId);

        if (followingIds.length === 0) {
            res.json({
                success: true,
                data: { posts: [], cursor: null, hasMore: false },
            });
            return;
        }

        const query: Record<string, unknown> = {
            userId: { $in: followingIds },
            isDeleted: false,
            visibility: { $in: ['public', 'followers'] },
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1)
            .populate('media');

        const hasMore = posts.length > parseInt(limit as string, 10);
        const results = hasMore ? posts.slice(0, -1) : posts;

        const postsWithAuthors = await attachAuthorsAndStatus(results, userId);

        res.json({
            success: true,
            data: {
                posts: postsWithAuthors,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Trending posts (engagement-based with time decay)
export const getTrendingPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { limit = '20' } = req.query;

        // Try cache first
        const cacheKey = 'feed:trending';
        const cached = await cacheGet<any>(cacheKey);
        if (cached) {
            res.json({ success: true, data: cached });
            return;
        }

        // Get posts from last 7 days
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

        const posts = await Post.aggregate([
            {
                $match: {
                    isDeleted: false,
                    visibility: 'public',
                    createdAt: { $gte: weekAgo },
                },
            },
            {
                $addFields: {
                    // Engagement score with time decay
                    engagementScore: {
                        $add: [
                            { $multiply: ['$likesCount', 1] },
                            { $multiply: ['$commentsCount', 2] },
                            { $multiply: ['$sharesCount', 3] },
                        ],
                    },
                    ageInHours: {
                        $divide: [
                            { $subtract: [new Date(), '$createdAt'] },
                            1000 * 60 * 60,
                        ],
                    },
                },
            },
            {
                $addFields: {
                    // Hot score with time decay (newer posts score higher)
                    hotScore: {
                        $divide: [
                            '$engagementScore',
                            { $pow: [{ $add: ['$ageInHours', 2] }, 1.5] },
                        ],
                    },
                },
            },
            { $sort: { hotScore: -1 } },
            { $limit: parseInt(limit as string, 10) },
        ]);

        // Populate media and authors
        const populatedPosts = await Post.populate(posts, { path: 'media' });
        const postsWithAuthors = await attachAuthorsAndStatus(populatedPosts, req.user?.userId);

        const responseData = { posts: postsWithAuthors };

        // Cache for 5 minutes
        await cacheSet(cacheKey, responseData, 300);

        res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

// Trust watch - suspicious content
export const getTrustWatch = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            isDeleted: false,
            visibility: 'public',
            trustLevel: { $in: ['suspicious', 'likely_fake'] },
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1)
            .populate('media')
            .populate('aiAnalysisId');

        const hasMore = posts.length > parseInt(limit as string, 10);
        const results = hasMore ? posts.slice(0, -1) : posts;

        const postsWithAuthors = await attachAuthorsAndStatus(results, req.user?.userId);

        res.json({
            success: true,
            data: {
                posts: postsWithAuthors,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};
