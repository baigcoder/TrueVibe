import { Request, Response, NextFunction } from 'express';
import { Post } from '../posts/Post.model.js';
import { Profile } from '../users/Profile.model.js';
import { Follow } from '../users/Follow.model.js';
import { getFriendIds } from '../users/followHelpers.js';
import { cacheGet, cacheSet } from '../../config/redis.js';

// Helper to attach authors and interaction status to posts
async function attachAuthorsAndStatus(posts: any[], currentUserId?: string) {
    const userIds = [...new Set(posts.map((p) => p.userId.toString()))];
    const profiles = await Profile.find({ userId: { $in: userIds } });
    const profileMap = new Map(profiles.map((p) => [p.userId.toString(), p]));

    return posts.map((post) => {
        const postJson = post.toJSON ? post.toJSON() : post;

        // Map aiAnalysisId to aiAnalysis for frontend compatibility
        let aiAnalysis = null;
        if (postJson.aiAnalysisId) {
            const analysis = postJson.aiAnalysisId;
            const details = analysis.analysisDetails || {};

            // Handle both new (deepfakeAnalysis nested) and old (flat) data structures
            const deepfake = details.deepfakeAnalysis || {};
            const fakeScore = deepfake.fakeScore ?? details.fakeScore ?? (analysis.confidenceScore ? analysis.confidenceScore / 100 : 0);
            const realScore = deepfake.realScore ?? details.realScore ?? (1 - fakeScore);

            aiAnalysis = {
                fakeScore,
                realScore,
                classification: (deepfake.classification || analysis.classification || 'authentic').toLowerCase(),
                confidence: analysis.confidenceScore ? analysis.confidenceScore / 100 : (realScore),
                processingTimeMs: analysis.processingTimeMs || 0,
                framesAnalyzed: details.framesAnalyzed,
                mediaType: details.mediaType || 'image',
                // v5 enhanced fields
                facesDetected: details.facesDetected,
                avgFaceScore: details.avgFaceScore,
                avgFftScore: details.avgFftScore,
                avgEyeScore: details.avgEyeScore,
                fftBoost: details.fftBoost,
                eyeBoost: details.eyeBoost,
                temporalBoost: details.temporalBoost,
                analysisDetails: {
                    faceDetection: details.faceDetection,
                    audioAnalysis: details.audioAnalysis,
                    temporalConsistency: details.temporalConsistency,
                    compressionArtifacts: details.compressionArtifacts,
                },
            };
        }

        return {
            ...postJson,
            author: profileMap.get(post.userId.toString()),
            // Add interaction status for logged-in users
            isLiked: currentUserId ? (postJson.likes || []).includes(currentUserId) : false,
            isSaved: currentUserId ? (postJson.savedBy || []).includes(currentUserId) : false,
            // Map aiAnalysisId to aiAnalysis
            aiAnalysis,
        };
    });
}

// Main personalized feed - shows posts from friends only (mutual follows)
export const getMainFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '10' } = req.query;
        const userId = req.user?.userId;

        // Anonymous users see empty feed - they need to login to see content
        if (!userId) {
            res.json({
                success: true,
                data: { posts: [], cursor: null, hasMore: false },
            });
            return;
        }

        // Get friends (mutual follows) - both users follow each other
        const friendIds = await getFriendIds(userId);

        // Include own posts + friends' posts
        const allowedUserIds = [userId, ...friendIds];

        if (allowedUserIds.length === 1 && allowedUserIds[0] === userId) {
            // No friends, only show own posts
        }

        const query: Record<string, unknown> = {
            userId: { $in: allowedUserIds },
            isDeleted: false,
            visibility: { $in: ['public', 'followers'] },
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

        const postsWithAuthors = await attachAuthorsAndStatus(results, userId);

        const responseData = {
            posts: postsWithAuthors,
            cursor: hasMore ? results[results.length - 1]._id : null,
            hasMore,
        };

        res.json({
            success: true,
            data: responseData,
        });
    } catch (error) {
        next(error);
    }
};

// Following feed - shows posts from friends only (mutual follows)
export const getFollowingFeed = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '10' } = req.query;
        const userId = req.user!.userId;

        // Get friends (mutual follows) - both users follow each other
        const friendIds = await getFriendIds(userId);

        if (friendIds.length === 0) {
            res.json({
                success: true,
                data: { posts: [], cursor: null, hasMore: false },
            });
            return;
        }

        const query: Record<string, unknown> = {
            userId: { $in: friendIds },
            isDeleted: false,
            visibility: { $in: ['public', 'followers'] },
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

        // Populate media, authors and AI analysis
        const populatedPosts = await Post.populate(posts, [
            { path: 'media' },
            { path: 'aiAnalysisId' }
        ]);
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

// Trust watch - suspicious content from followed users only
export const getTrustWatch = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { cursor, limit = '20' } = req.query;
        const userId = req.user?.userId;

        // Trust Watch requires authentication - only show content from people you follow
        if (!userId) {
            res.json({
                success: true,
                data: {
                    posts: [],
                    cursor: null,
                    hasMore: false,
                },
            });
            return;
        }

        // Get list of users the current user follows
        const follows = await Follow.find({ followerId: userId }).select('followingId').lean();
        const followedUserIds = follows.map(f => f.followingId);

        // If not following anyone, return empty
        if (followedUserIds.length === 0) {
            res.json({
                success: true,
                data: {
                    posts: [],
                    cursor: null,
                    hasMore: false,
                },
            });
            return;
        }

        const query: Record<string, unknown> = {
            isDeleted: false,
            visibility: 'public',
            trustLevel: { $in: ['suspicious', 'likely_fake', 'fake'] },
            userId: { $in: followedUserIds }, // Only from followed users
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
