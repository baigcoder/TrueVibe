import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Post } from './Post.model.js';
import { Media } from './Media.model.js';
import { Draft } from './Draft.model.js';
import { AIAnalysis } from './AIAnalysis.model.js';
import { AIReport } from './AIReport.model.js';
import { Profile } from '../users/Profile.model.js';
import { Comment } from '../comments/Comment.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/middleware/error.middleware.js';
import { addAIAnalysisJob } from '../../jobs/queues.js';
import { createNotification } from '../notifications/notification.service.js';
import { config } from '../../config/index.js';
import { User } from '../users/User.model.js';
import { sendPDFReportEmail, isEmailConfigured } from '../../services/email.service.js';

// Create post
export const createPost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { content, mediaIds, visibility } = req.body;

        console.log('[Post] Creating post:', { userId, mediaIds: mediaIds?.length || 0, mediaIdsList: mediaIds });

        // Create post
        const post = await Post.create({
            userId,
            content,
            media: mediaIds || [],
            visibility: visibility || 'public',
            trustLevel: mediaIds?.length ? 'pending' : 'authentic', // No media = authentic
        });

        console.log('[Post] Created:', post._id.toString());

        // If there are media files, queue AI analysis
        if (mediaIds?.length) {
            console.log('[Post] Queueing AI analysis for', mediaIds.length, 'media files');
            for (const mediaId of mediaIds) {
                // Fetch media to log its type
                const mediaDoc = await Media.findById(mediaId);
                console.log('[Post] Media:', {
                    mediaId,
                    type: mediaDoc?.type,
                    url: mediaDoc?.url?.substring(0, 80),
                    originalUrl: mediaDoc?.originalUrl?.substring(0, 80)
                });

                await addAIAnalysisJob({
                    mediaId,
                    postId: post._id.toString(),
                });
                console.log('[Post] Queued AI job for mediaId:', mediaId, 'type:', mediaDoc?.type);
            }
        } else {
            console.log('[Post] No media files to analyze');
        }

        // Populate for response
        const populatedPost = await Post.findById(post._id)
            .populate('media')
            .populate('aiAnalysisId')
            .populate({
                path: 'userId',
                model: 'Profile',
                foreignField: 'userId',
                localField: 'userId',
            });

        res.status(201).json({
            success: true,
            data: { post: populatedPost },
        });
    } catch (error) {
        next(error);
    }
};

// Get post by ID
export const getPost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const post = await Post.findOne({ _id: id, isDeleted: false })
            .populate('media')
            .populate('aiAnalysisId');

        if (!post) {
            throw new NotFoundError('Post');
        }

        // Get author profile
        const profile = await Profile.findOne({ userId: post.userId });

        // Check if liked/saved by current user
        const isLiked = req.user
            ? post.likes.some((id) => id.toString() === req.user!.userId)
            : false;
        const isSaved = req.user
            ? post.savedBy.some((id) => id.toString() === req.user!.userId)
            : false;

        res.json({
            success: true,
            data: {
                post: {
                    ...post.toJSON(),
                    author: profile,
                    isLiked,
                    isSaved,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Update/Edit post
export const updatePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { content, visibility } = req.body;

        const post = await Post.findOne({ _id: id, isDeleted: false });

        if (!post) {
            throw new NotFoundError('Post');
        }

        if (post.userId.toString() !== userId) {
            throw new ForbiddenError('Not authorized to edit this post');
        }

        // Track edit history
        const editedAt = new Date();

        // Update fields
        if (content !== undefined) {
            post.content = content;
        }
        if (visibility !== undefined) {
            post.visibility = visibility;
        }

        // Mark as edited
        (post as any).editedAt = editedAt;
        (post as any).isEdited = true;

        await post.save();

        // Populate for response
        const populatedPost = await Post.findById(post._id)
            .populate('media')
            .lean();

        const profile = await Profile.findOne({ userId: post.userId });

        res.json({
            success: true,
            data: {
                post: {
                    ...populatedPost,
                    author: profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Delete post
export const deletePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findById(id).populate('media');

        if (!post) {
            throw new NotFoundError('Post');
        }

        if (post.userId.toString() !== userId && req.user!.role !== 'admin') {
            throw new ForbiddenError('Not authorized to delete this post');
        }

        // Delete media from Cloudinary
        if (post.media && post.media.length > 0) {
            const { deleteCloudinaryByUrl } = await import('../../config/cloudinary.js');
            for (const mediaDoc of post.media as any[]) {
                if (mediaDoc?.url) {
                    await deleteCloudinaryByUrl(mediaDoc.url);
                }
                if (mediaDoc?.originalUrl && mediaDoc.originalUrl !== mediaDoc.url) {
                    await deleteCloudinaryByUrl(mediaDoc.originalUrl);
                }
            }
        }

        // Soft delete
        post.isDeleted = true;
        await post.save();

        res.json({
            success: true,
            message: 'Post deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Like post
export const likePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // First check if post exists and if already liked
        const existingPost = await Post.findOne({ _id: id, isDeleted: false });

        if (!existingPost) {
            throw new NotFoundError('Post');
        }

        // If already liked, just return current count (idempotent)
        if (existingPost.likes.includes(userId)) {
            res.json({
                success: true,
                data: { likesCount: existingPost.likesCount, alreadyLiked: true },
            });
            return;
        }

        // Add like
        const post = await Post.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $push: { likes: userId }, $inc: { likesCount: 1 } },
            { new: true }
        );

        // Notify post owner
        if (post && post.userId.toString() !== req.user!.userId) {
            const liker = await Profile.findOne({ userId: req.user!.userId });
            createNotification({
                userId: post.userId.toString(),
                type: 'like',
                title: `${liker?.name || 'Someone'} liked your post`,
                body: post.content.substring(0, 50),
                senderId: req.user!.userId,
                link: `/app/posts/${id}`,
            });
        }

        res.json({
            success: true,
            data: { likesCount: post?.likesCount || existingPost.likesCount + 1 },
        });
    } catch (error) {
        next(error);
    }
};

// Unlike post
export const unlikePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // First check if post exists
        const existingPost = await Post.findOne({ _id: id, isDeleted: false });

        if (!existingPost) {
            throw new NotFoundError('Post');
        }

        // If not liked, just return current count (idempotent)
        if (!existingPost.likes.includes(userId)) {
            res.json({
                success: true,
                data: { likesCount: existingPost.likesCount, notLiked: true },
            });
            return;
        }

        // Remove like
        const post = await Post.findOneAndUpdate(
            { _id: id, isDeleted: false },
            { $pull: { likes: userId }, $inc: { likesCount: -1 } },
            { new: true }
        );

        res.json({
            success: true,
            data: { likesCount: post?.likesCount || Math.max(0, existingPost.likesCount - 1) },
        });
    } catch (error) {
        next(error);
    }
};

// Save post
export const savePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOneAndUpdate(
            { _id: id, isDeleted: false, savedBy: { $ne: userId } },
            { $push: { savedBy: userId } },
            { new: true }
        );

        if (!post) {
            throw new NotFoundError('Post or already saved');
        }

        res.json({
            success: true,
            message: 'Post saved',
        });
    } catch (error) {
        next(error);
    }
};

// Unsave post
export const unsavePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOneAndUpdate(
            { _id: id, savedBy: userId },
            { $pull: { savedBy: userId } },
            { new: true }
        );

        if (!post) {
            throw new NotFoundError('Post or not saved');
        }

        res.json({
            success: true,
            message: 'Post unsaved',
        });
    } catch (error) {
        next(error);
    }
};

// Repost
export const repost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOneAndUpdate(
            { _id: id, isDeleted: false, reposts: { $ne: userId } },
            { $push: { reposts: userId }, $inc: { sharesCount: 1 } },
            { new: true }
        );

        if (!post) {
            throw new NotFoundError('Post or already reposted');
        }

        // Notify post owner
        if (post.userId.toString() !== req.user!.userId) {
            const reposter = await Profile.findOne({ userId: req.user!.userId });
            createNotification({
                userId: post.userId.toString(),
                type: 'mention', // Using mention for repost notification
                title: `${reposter?.name || 'Someone'} reposted your content`,
                body: post.content.substring(0, 50),
                senderId: req.user!.userId,
                link: `/app/posts/${id}`,
            });
        }

        res.json({
            success: true,
            data: { sharesCount: post.sharesCount },
        });
    } catch (error) {
        next(error);
    }
};

// Get AI analysis for post
export const getAIAnalysis = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const post = await Post.findById(id);
        if (!post) {
            throw new NotFoundError('Post');
        }

        const analysis = await AIAnalysis.findOne({ postId: id });

        res.json({
            success: true,
            data: {
                analysis,
                trustLevel: post.trustLevel,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get user posts
export const getUserPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { userId: paramUserId } = req.params;
        const { cursor, limit = '10' } = req.query;

        // First, resolve the actual userId by looking up the profile
        // The paramUserId could be: MongoDB _id, Supabase userId, or supabaseId
        let profile = await Profile.findOne({
            $or: [
                { _id: mongoose.isValidObjectId(paramUserId) ? paramUserId : null },
                { userId: paramUserId },
                { supabaseId: paramUserId }
            ]
        });

        if (!profile) {
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

        // Use the profile's userId (Supabase UUID) for the query
        const actualUserId = profile.userId || profile.supabaseId;

        const query: Record<string, unknown> = {
            userId: actualUserId,
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

        // Attach author to posts
        const postsWithAuthor = results.map((post) => ({
            ...post.toJSON(),
            author: profile,
        }));

        res.json({
            success: true,
            data: {
                posts: postsWithAuthor,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get liked posts for a user
export const getLikedPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { userId } = req.params;
        const { cursor, limit = '10' } = req.query;

        const query: Record<string, unknown> = {
            likes: userId, // Posts where the user has liked
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

        // Get unique user IDs to fetch profiles
        const userIds = [...new Set(results.map(p => p.userId))];
        const profiles = await Profile.find({
            $or: [
                { userId: { $in: userIds } },
                { supabaseId: { $in: userIds } }
            ]
        });
        const profileMap = new Map(profiles.map(p => [p.userId || p.supabaseId, p]));

        // Attach author to posts
        const postsWithAuthor = results.map((post) => ({
            ...post.toJSON(),
            author: profileMap.get(post.userId) || null,
        }));

        res.json({
            success: true,
            data: {
                posts: postsWithAuthor,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Vote on poll
export const votePoll = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { optionIndex } = req.body;
        const userId = req.user!.userId;

        const post = await Post.findOne({ _id: id, isDeleted: false, hasPoll: true });

        if (!post || !post.poll) {
            throw new NotFoundError('Post with poll');
        }

        // Check if poll expired
        if (post.poll.expiresAt && new Date() > post.poll.expiresAt) {
            res.status(400).json({ success: false, error: 'Poll has expired' });
            return;
        }

        // Check if user already voted (if not multiple choice)
        const hasVoted = post.poll.options.some(opt => opt.votes.includes(userId));
        if (hasVoted && !post.poll.allowMultiple) {
            res.status(400).json({ success: false, error: 'Already voted' });
            return;
        }

        // Validate option index
        if (optionIndex < 0 || optionIndex >= post.poll.options.length) {
            res.status(400).json({ success: false, error: 'Invalid option' });
            return;
        }

        // Add vote
        (post.poll.options[optionIndex] as any).votes.push(userId);
        (post.poll.options[optionIndex] as any).votesCount += 1;
        post.poll.totalVotes += 1;
        await post.save();

        res.json({
            success: true,
            data: { poll: post.poll },
        });
    } catch (error) {
        next(error);
    }
};

// Pin post to profile
export const pinPost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOne({ _id: id, userId, isDeleted: false });

        if (!post) {
            throw new NotFoundError('Post');
        }

        // Unpin all other posts first
        await Post.updateMany({ userId, isPinned: true }, { isPinned: false });

        // Pin this post
        post.isPinned = true;
        await post.save();

        res.json({
            success: true,
            message: 'Post pinned to profile',
        });
    } catch (error) {
        next(error);
    }
};

// Unpin post
export const unpinPost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findOneAndUpdate(
            { _id: id, userId, isDeleted: false },
            { isPinned: false },
            { new: true }
        );

        if (!post) {
            throw new NotFoundError('Post');
        }

        res.json({
            success: true,
            message: 'Post unpinned',
        });
    } catch (error) {
        next(error);
    }
};

// Get posts by hashtag
export const getHashtagPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { hashtag } = req.params;
        const { cursor, limit = '10' } = req.query;

        const normalizedTag = hashtag.toLowerCase().replace('#', '');

        const query: Record<string, unknown> = {
            hashtags: normalizedTag,
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

        // Get unique user IDs
        const userIds = [...new Set(results.map(p => p.userId))];
        const profiles = await Profile.find({ userId: { $in: userIds } });
        const profileMap = new Map(profiles.map(p => [p.userId, p]));

        const postsWithAuthor = results.map(post => ({
            ...post.toJSON(),
            author: profileMap.get(post.userId),
        }));

        res.json({
            success: true,
            data: {
                hashtag: normalizedTag,
                posts: postsWithAuthor,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get trending hashtags
export const getTrendingHashtags = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { limit = '10' } = req.query;

        // Get hashtags from last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const trending = await Post.aggregate([
            {
                $match: {
                    createdAt: { $gte: oneDayAgo },
                    isDeleted: false,
                    visibility: 'public',
                    hashtags: { $exists: true, $ne: [] },
                },
            },
            { $unwind: '$hashtags' },
            {
                $group: {
                    _id: '$hashtags',
                    count: { $sum: 1 },
                    engagement: { $sum: { $add: ['$likesCount', '$commentsCount', '$sharesCount'] } },
                },
            },
            { $sort: { count: -1, engagement: -1 } },
            { $limit: parseInt(limit as string, 10) },
        ]);

        res.json({
            success: true,
            data: {
                hashtags: trending.map(t => ({
                    tag: t._id,
                    count: t.count,
                    engagement: t.engagement,
                })),
            },
        });
    } catch (error) {
        next(error);
    }
};

// Create quote post
export const createQuotePost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id: quotedPostId } = req.params;
        const userId = req.user!.userId;
        const { content } = req.body;

        // Verify quoted post exists
        const quotedPost = await Post.findOne({ _id: quotedPostId, isDeleted: false });
        if (!quotedPost) {
            throw new NotFoundError('Post to quote');
        }

        // Extract hashtags from content
        const hashtagRegex = /#(\w+)/g;
        const hashtags: string[] = [];
        let match;
        while ((match = hashtagRegex.exec(content)) !== null) {
            hashtags.push(match[1].toLowerCase());
        }

        // Create quote post
        const post = await Post.create({
            userId,
            content,
            quotedPostId,
            hashtags,
            visibility: 'public',
            trustLevel: 'authentic',
        });

        // Increment share count on original
        await Post.updateOne(
            { _id: quotedPostId },
            { $inc: { sharesCount: 1 } }
        );

        // Notify original author
        if (quotedPost.userId.toString() !== userId) {
            const quoter = await Profile.findOne({ userId });
            createNotification({
                userId: quotedPost.userId.toString(),
                type: 'mention',
                title: `${quoter?.name || 'Someone'} quoted your post`,
                body: content.substring(0, 50),
                senderId: userId,
                link: `/app/posts/${post._id}`,
            });
        }

        // Populate for response
        const populatedPost = await Post.findById(post._id)
            .populate('media')
            .populate({
                path: 'quotedPostId',
                populate: { path: 'media' },
            });

        const profile = await Profile.findOne({ userId });

        res.status(201).json({
            success: true,
            data: {
                post: {
                    ...populatedPost!.toJSON(),
                    author: profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// ============ DRAFTS ============

/**
 * Save or update a draft
 */
export const saveDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { draftId, content, mediaIds, poll, hashtags, visibility, scheduledFor, autoSaved } = req.body;

        let draft;

        if (draftId && mongoose.Types.ObjectId.isValid(draftId)) {
            draft = await Draft.findOneAndUpdate(
                { _id: draftId, userId },
                {
                    content,
                    media: mediaIds,
                    poll,
                    hashtags,
                    visibility,
                    scheduledFor,
                    autoSaved: autoSaved || false,
                    lastSavedAt: new Date(),
                },
                { new: true, upsert: true }
            );
        } else {
            draft = await Draft.create({
                userId,
                content,
                media: mediaIds,
                poll,
                hashtags,
                visibility,
                scheduledFor,
                autoSaved: autoSaved || false,
                lastSavedAt: new Date(),
            });
        }

        res.status(200).json({
            status: 'success',
            data: { draft },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get all drafts for the current user
 */
export const getDrafts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const drafts = await Draft.find({ userId }).sort({ lastSavedAt: -1 }).populate('media');

        res.status(200).json({
            status: 'success',
            data: { drafts },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Delete a draft
 */
export const deleteDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const draft = await Draft.findOneAndDelete({ _id: id, userId });

        if (!draft) {
            throw new NotFoundError('Draft not found');
        }

        res.status(200).json({
            status: 'success',
            message: 'Draft deleted',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Publish a draft (convert it to a post)
 */
export const publishDraft = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const draft = await Draft.findOne({ _id: id, userId });

        if (!draft) {
            throw new NotFoundError('Draft not found');
        }

        // Create the post
        const postData: any = {
            userId,
            content: draft.content,
            media: draft.media,
            hashtags: draft.hashtags,
            visibility: draft.visibility,
            trustLevel: draft.media?.length ? 'pending' : 'authentic',
        };

        if (draft.poll) {
            postData.poll = {
                options: draft.poll.options.map(o => ({ text: o.text, votes: [], votesCount: 0 })),
                allowMultiple: draft.poll.allowMultiple,
                totalVotes: 0,
            };
            if (draft.poll.expiresIn) {
                const expiresAt = new Date();
                expiresAt.setHours(expiresAt.getHours() + draft.poll.expiresIn);
                postData.poll.expiresAt = expiresAt;
            }
            postData.hasPoll = true;
        }

        const post = await Post.create(postData);

        // Queue AI analysis if needed
        if (draft.media?.length) {
            for (const mediaId of draft.media) {
                await addAIAnalysisJob({
                    mediaId: mediaId.toString(),
                    postId: post._id.toString(),
                });
            }
        }

        // Delete the draft
        await Draft.findByIdAndDelete(id);

        res.status(201).json({
            status: 'success',
            data: { post },
        });
    } catch (error) {
        next(error);
    }
};

// ============ SCHEDULING ============

/**
 * Get all scheduled posts for the current user
 */
export const getScheduledPosts = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        // Drafts with scheduledFor in the future are "scheduled posts"
        const scheduledPosts = await Draft.find({
            userId,
            scheduledFor: { $gt: new Date() }
        }).sort({ scheduledFor: 1 }).populate('media');

        res.status(200).json({
            status: 'success',
            data: { scheduledPosts },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Cancel a scheduled post (keep as draft but remove schedule)
 */
export const cancelScheduledPost = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const draft = await Draft.findOneAndUpdate(
            { _id: id, userId },
            { $unset: { scheduledFor: 1 } },
            { new: true }
        );

        if (!draft) {
            throw new NotFoundError('Scheduled post not found');
        }

        res.status(200).json({
            status: 'success',
            data: { draft },
        });
    } catch (error) {
        next(error);
    }
};
// ============ ANALYTICS ============

/**
 * Record a view for a post
 */
export const recordView = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        const post = await Post.findById(id);
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        post.views += 1;
        if (userId && !post.uniqueViews.includes(userId)) {
            post.uniqueViews.push(userId);
        }

        await post.save();

        res.status(200).json({
            status: 'success',
            message: 'View recorded',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get detailed analytics for a post
 */
export const getPostAnalytics = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const post = await Post.findById(id);
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Only the author can see detailed analytics
        if (post.userId.toString() !== userId) {
            throw new ForbiddenError('Access denied: You are not the author of this post');
        }

        const analytics = {
            totalViews: post.views,
            uniqueViews: post.uniqueViews.length,
            likes: post.likes.length,
            comments: post.commentsCount,
            shares: post.sharesCount,
            saves: post.savedBy.length,
            engagementRate: post.views > 0
                ? ((post.likes.length + post.commentsCount + post.sharesCount + post.savedBy.length) / post.views) * 100
                : 0,
            engagementCount: post.engagementCount,
        };

        res.status(200).json({
            status: 'success',
            data: { analytics },
        });
    } catch (error) {
        next(error);
    }
};

// ============ AI REPORTS ============

/**
 * Generate AI authenticity report for a post
 * Only accessible by post owner
 */
export const generateReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Get the post
        const post = await Post.findById(id);
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Get the current user to check role (userId is Supabase UUID, not MongoDB ObjectId)
        const currentUser = await User.findOne({ supabaseId: userId });
        const isAdmin = currentUser?.role === 'admin';

        // The author OR an admin can generate a report
        if (post.userId.toString() !== userId && !isAdmin) {
            throw new ForbiddenError('Only the post owner or an admin can generate AI reports');
        }

        // Check if report already exists
        const existingReport = await AIReport.findOne({ postId: id, userId });
        if (existingReport) {
            res.json({
                success: true,
                data: { report: existingReport, cached: true },
            });
            return;
        }

        // Get AI analysis for the post
        const analysis = await AIAnalysis.findOne({ postId: id });
        if (!analysis || analysis.status !== 'completed') {
            res.status(400).json({
                success: false,
                error: 'AI analysis not completed yet. Please wait for analysis to finish.',
            });
            return;
        }

        // Call Python AI service to generate report
        const aiServiceUrl = config.ai.serviceUrl?.replace('/analyze', '') || 'http://localhost:8000';

        const analysisResults = {
            fake_score: analysis.analysisDetails?.deepfakeAnalysis?.fakeScore ||
                analysis.analysisDetails?.fakeScore ||
                (analysis.confidenceScore ? analysis.confidenceScore / 100 : 0),
            real_score: analysis.analysisDetails?.deepfakeAnalysis?.realScore ||
                analysis.analysisDetails?.realScore ||
                (1 - (analysis.confidenceScore ? analysis.confidenceScore / 100 : 0)),
            classification: analysis.analysisDetails?.deepfakeAnalysis?.classification ||
                analysis.classification || 'real',
            confidence: analysis.confidenceScore ? analysis.confidenceScore / 100 : 0.5,
            // Face detection
            faces_detected: analysis.analysisDetails?.facesDetected ||
                (analysis.analysisDetails?.faceDetection?.detected ? 1 : 0),
            face_scores: analysis.analysisDetails?.faceScores || [],
            avg_face_score: analysis.analysisDetails?.avgFaceScore,
            // v5 Enhanced analysis fields
            avg_fft_score: analysis.analysisDetails?.avgFftScore,
            avg_eye_score: analysis.analysisDetails?.avgEyeScore,
            fft_boost: analysis.analysisDetails?.fftBoost,
            eye_boost: analysis.analysisDetails?.eyeBoost,
            temporal_boost: analysis.analysisDetails?.temporalBoost,
            // Metadata
            processing_time_ms: analysis.processingTimeMs,
            model_version: analysis.modelVersion,
            media_type: analysis.analysisDetails?.mediaType || 'image',
            frames_analyzed: analysis.analysisDetails?.framesAnalyzed,
        };

        console.log(`📝 Generating AI report for post ${id}...`);

        const response = await fetch(`${aiServiceUrl}/generate-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.ai.apiKey
            },
            body: JSON.stringify({ analysis_results: analysisResults }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI service error: ${errorText}`);
        }

        const reportData = await response.json() as {
            verdict: string;
            confidence: number;
            summary: string;
            detectionBreakdown: Array<{ category: string; detected: boolean; severity: string; explanation: string; score?: number }>;
            technicalDetails: Array<{ metric: string; value: string; interpretation: string }>;
            recommendations: string[];
            modelUsed: string;
        };

        // Store the report
        const report = await AIReport.create({
            postId: id,
            userId,
            analysisId: analysis._id,
            report: {
                verdict: reportData.verdict,
                confidence: reportData.confidence,
                summary: reportData.summary,
                detectionBreakdown: reportData.detectionBreakdown || [],
                technicalDetails: reportData.technicalDetails || [],
                recommendations: reportData.recommendations || [],
            },
            modelUsed: reportData.modelUsed || 'fallback',
            generatedAt: new Date(),
        });

        console.log(`✅ AI report generated for post ${id} using ${report.modelUsed}`);

        res.status(201).json({
            success: true,
            data: { report, cached: false },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Get AI authenticity report for a post
 * Only accessible by post owner
 */
export const getReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // Get the post
        const post = await Post.findById(id);
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Get the current user to check role
        const currentUser = await User.findOne({ supabaseId: userId });
        if (!currentUser) {
            throw new NotFoundError('User not found');
        }
        const isAdmin = currentUser.role === 'admin';

        // The author OR an admin can view reports
        // Compare Supabase IDs: post.userId is the Supabase UUID of the author
        if (post.userId.toString() !== currentUser.supabaseId && !isAdmin) {
            throw new ForbiddenError('Only the post owner or an admin can view AI reports');
        }

        // Get the report - for admins, find any report for this post
        const report = await AIReport.findOne(isAdmin ? { postId: id } : { postId: id, userId });

        if (!report) {
            res.json({
                success: true,
                data: { report: null },
            });
            return;
        }

        res.json({
            success: true,
            data: { report },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Download PDF report for a post
 * Generates a professional PDF with debug images
 * Only accessible by post owner
 */
export const downloadPDFReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { analysis_results, report_content } = req.body;

        // Get the post with populated media to access media URLs
        const post = await Post.findById(id).populate('media');
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Get the current user to check role
        const currentUser = await User.findOne({ supabaseId: userId });
        const isAdmin = currentUser?.role === 'admin';

        // The author OR an admin can download reports
        if (post.userId.toString() !== userId && !isAdmin) {
            throw new ForbiddenError('Only the post owner or an admin can download AI reports');
        }

        // Get AI analysis for the post
        const analysis = await AIAnalysis.findOne({ postId: id });
        if (!analysis || analysis.status !== 'completed') {
            res.status(400).json({
                success: false,
                error: 'AI analysis not completed yet. Please wait for analysis to finish.',
            });
            return;
        }

        // Call Python AI service to generate PDF report
        const aiServiceUrl = config.ai.serviceUrl?.replace('/analyze', '') || 'http://localhost:8000';

        // Build analysis results from stored analysis data
        const analysisData = {
            fake_score: analysis_results?.fake_score ?? (analysis.analysisDetails?.deepfakeAnalysis?.fakeScore || 0),
            real_score: analysis_results?.real_score ?? (analysis.analysisDetails?.deepfakeAnalysis?.realScore || 1),
            classification: analysis_results?.classification ?? (analysis.analysisDetails?.deepfakeAnalysis?.classification || 'real'),
            confidence: analysis_results?.confidence ?? (analysis.confidenceScore / 100),
            faces_detected: analysis_results?.faces_detected ?? (analysis.analysisDetails?.facesDetected || 0),
            face_scores: analysis_results?.face_scores ?? (analysis.analysisDetails?.faceScores || []),
            avg_face_score: analysis_results?.avg_face_score ?? analysis.analysisDetails?.avgFaceScore,
            avg_fft_score: analysis_results?.avg_fft_score ?? analysis.analysisDetails?.avgFftScore,
            avg_eye_score: analysis_results?.avg_eye_score ?? analysis.analysisDetails?.avgEyeScore,
            fft_boost: analysis_results?.fft_boost ?? analysis.analysisDetails?.fftBoost,
            eye_boost: analysis_results?.eye_boost ?? analysis.analysisDetails?.eyeBoost,
            temporal_boost: analysis_results?.temporal_boost ?? analysis.analysisDetails?.temporalBoost,
            processing_time_ms: analysis_results?.processing_time_ms ?? analysis.processingTimeMs,
            model_version: analysis_results?.model_version ?? analysis.modelVersion,
            // Include debug frames from stored analysis for PDF report
            debug_frames: analysis.analysisDetails?.debugFrames || [],
        };

        // Get or generate report content
        let reportContent = report_content;
        if (!reportContent) {
            // Try to get existing report
            const existingReport = await AIReport.findOne({ postId: id, userId });
            if (existingReport) {
                reportContent = {
                    verdict: existingReport.report.verdict,
                    confidence: existingReport.report.confidence,
                    summary: existingReport.report.summary,
                    detectionBreakdown: existingReport.report.detectionBreakdown || [],
                    technicalDetails: existingReport.report.technicalDetails || [],
                    recommendations: existingReport.report.recommendations || [],
                };
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Please generate an AI report first before downloading the PDF.',
                });
                return;
            }
        }

        console.log(`📄 Generating PDF report for post ${id}...`);
        console.log(`   📊 Debug frames count: ${(analysis.analysisDetails as any)?.debugFrames?.length || 0}`);

        // Get the analyzed media URL from the post (image or video thumbnail)
        const postData = post.toObject() as any;
        // Try to find an image first, then video thumbnail, then video URL with thumbnail suffix
        let analyzedImageUrl: string | null = null;
        const imageMedia = postData.media?.find((m: any) => m.type === 'image');
        const videoMedia = postData.media?.find((m: any) => m.type === 'video');

        if (imageMedia?.url) {
            analyzedImageUrl = imageMedia.url;
        } else if (videoMedia?.thumbnail) {
            // Use video thumbnail if available
            analyzedImageUrl = videoMedia.thumbnail;
        } else if (videoMedia?.url) {
            // For Cloudinary videos, transform URL to get first frame as image
            const videoUrl = videoMedia.url as string;
            if (videoUrl.includes('cloudinary')) {
                // Cloudinary format: insert 'so_0' (start offset 0) and change extension to jpg
                // Transform: /video/upload/... to /video/upload/so_0,f_jpg/.../filename.jpg
                const transformedUrl = videoUrl
                    .replace('/video/upload/', '/video/upload/so_0,f_jpg/')
                    .replace(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i, '.jpg');
                analyzedImageUrl = transformedUrl;
                console.log(`   🎬 Video thumbnail URL: ${analyzedImageUrl}`);
            } else {
                analyzedImageUrl = null; // Can't get thumbnail, use debug frames only
            }
        } else {
            analyzedImageUrl = postData.image || null;
        }

        const response = await fetch(`${aiServiceUrl}/generate-pdf-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.ai.apiKey
            },
            body: JSON.stringify({
                analysis_results: analysisData,
                report_content: reportContent,
                analyzed_image_url: analyzedImageUrl,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`PDF generation error: ${errorText}`);
            throw new Error(`Failed to generate PDF: ${errorText}`);
        }

        const pdfResponse = await response.json() as {
            pdf_base64: string;
            filename: string;
            success: boolean;
            message: string;
        };

        if (!pdfResponse.success) {
            throw new Error(pdfResponse.message || 'PDF generation failed');
        }

        console.log(`✅ PDF report generated for post ${id}`);

        res.json({
            success: true,
            data: pdfResponse,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Email PDF report to admin
 */
export const emailPDFReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { analysis_results, report_content } = req.body;

        // Check if email is configured
        if (!isEmailConfigured()) {
            res.status(400).json({
                success: false,
                error: 'Email service is not configured on the server. Please check SMTP settings.',
            });
            return;
        }

        // Get the post
        const post = await Post.findById(id).populate('media');
        if (!post) {
            throw new NotFoundError('Post not found');
        }

        // Get the current user to check role
        const currentUser = await User.findOne({ supabaseId: userId });
        const isAdmin = currentUser?.role === 'admin';

        // The author OR an admin can request email reports
        if (post.userId.toString() !== userId && !isAdmin) {
            throw new ForbiddenError('Only the post owner or an admin can request emailed AI reports');
        }

        // Get AI analysis for the post
        const analysis = await AIAnalysis.findOne({ postId: id });
        if (!analysis || analysis.status !== 'completed') {
            res.status(400).json({
                success: false,
                error: 'AI analysis not completed yet. Please wait for analysis to finish.',
            });
            return;
        }

        // Get the POST AUTHOR's email to send the report to
        // The post.userId contains the Supabase UUID of the post author
        console.log(`📧 Looking up post author for userId: ${post.userId}`);
        const postAuthor = await User.findOne({ supabaseId: post.userId });
        console.log(`📧 Post author found:`, postAuthor ? `email: ${postAuthor.email}` : 'NOT FOUND');

        if (!postAuthor || !postAuthor.email) {
            console.error(`❌ Post author not found or no email. post.userId: ${post.userId}`);
            res.status(400).json({
                success: false,
                error: `The post author (ID: ${post.userId}) does not have an email address configured in the User collection.`,
            });
            return;
        }

        // Call Python AI service to generate PDF report
        const aiServiceUrl = config.ai.serviceUrl?.replace('/analyze', '') || 'http://localhost:8000';

        // Build analysis results - INCLUDE debug_frames for complete report
        const analysisData = {
            fake_score: analysis_results?.fake_score ?? (analysis.analysisDetails?.deepfakeAnalysis?.fakeScore || 0),
            real_score: analysis_results?.real_score ?? (analysis.analysisDetails?.deepfakeAnalysis?.realScore || 1),
            classification: analysis_results?.classification ?? (analysis.analysisDetails?.deepfakeAnalysis?.classification || 'real'),
            confidence: analysis_results?.confidence ?? (analysis.confidenceScore / 100),
            faces_detected: analysis_results?.faces_detected ?? (analysis.analysisDetails?.facesDetected || 0),
            face_scores: analysis_results?.face_scores ?? (analysis.analysisDetails?.faceScores || []),
            avg_face_score: analysis_results?.avg_face_score ?? analysis.analysisDetails?.avgFaceScore,
            avg_fft_score: analysis_results?.avg_fft_score ?? analysis.analysisDetails?.avgFftScore,
            avg_eye_score: analysis_results?.avg_eye_score ?? analysis.analysisDetails?.avgEyeScore,
            fft_boost: analysis_results?.fft_boost ?? analysis.analysisDetails?.fftBoost,
            eye_boost: analysis_results?.eye_boost ?? analysis.analysisDetails?.eyeBoost,
            temporal_boost: analysis_results?.temporal_boost ?? analysis.analysisDetails?.temporalBoost,
            processing_time_ms: analysis_results?.processing_time_ms ?? analysis.processingTimeMs,
            model_version: analysis_results?.model_version ?? analysis.modelVersion,
            // Include debug frames from stored analysis for PDF report (same as download)
            debug_frames: (analysis.analysisDetails as any)?.debugFrames || [],
        };

        // Get analyzed image URL (same logic as downloadPDFReport)
        const postData = post.toObject() as any;
        let analyzedImageUrl: string | null = null;
        const imageMedia = postData.media?.find((m: any) => m.type === 'image');
        const videoMedia = postData.media?.find((m: any) => m.type === 'video');

        if (imageMedia?.url) {
            analyzedImageUrl = imageMedia.url;
        } else if (videoMedia?.thumbnail) {
            analyzedImageUrl = videoMedia.thumbnail;
        } else if (videoMedia?.url) {
            const videoUrl = videoMedia.url as string;
            if (videoUrl.includes('cloudinary')) {
                analyzedImageUrl = videoUrl
                    .replace('/video/upload/', '/video/upload/so_0,f_jpg/')
                    .replace(/\.(mp4|mov|webm|avi|mkv)(\?.*)?$/i, '.jpg');
            }
        } else {
            analyzedImageUrl = postData.image || null;
        }

        // Get or generate report content
        let reportContent = report_content;
        if (!reportContent) {
            const existingReport = await AIReport.findOne({ postId: id });
            if (existingReport) {
                reportContent = {
                    verdict: existingReport.report.verdict,
                    confidence: existingReport.report.confidence,
                    summary: existingReport.report.summary,
                    detectionBreakdown: existingReport.report.detectionBreakdown || [],
                    technicalDetails: existingReport.report.technicalDetails || [],
                    recommendations: existingReport.report.recommendations || [],
                };
            } else {
                res.status(400).json({
                    success: false,
                    error: 'Please generate an AI report first before emailing the PDF.',
                });
                return;
            }
        }

        console.log(`📄 Generating PDF for email - post ${id}...`);
        console.log(`   📊 Debug frames count: ${analysisData.debug_frames?.length || 0}`);

        const response = await fetch(`${aiServiceUrl}/generate-pdf-report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': config.ai.apiKey
            },
            body: JSON.stringify({
                analysis_results: analysisData,
                report_content: reportContent,
                analyzed_image_url: analyzedImageUrl,  // Include the analyzed image
            }),
        });


        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to generate PDF for email: ${errorText}`);
        }

        const pdfResponse = await response.json() as {
            pdf_base64: string;
            filename: string;
            success: boolean;
        };

        if (!pdfResponse.success) {
            throw new Error('PDF generation failed for email');
        }

        // Get post image URL for preview in email if available
        const postImageUrl = (post.media as any)?.[0]?.url;

        // Send email to the POST AUTHOR (the person who created the post)
        await sendPDFReportEmail({
            recipientEmail: postAuthor.email,
            recipientName: 'User',
            postId: id,
            pdfBase64: pdfResponse.pdf_base64,
            pdfFilename: pdfResponse.filename,
            verdict: reportContent.verdict,
            confidence: reportContent.confidence,
            postImageUrl
        });

        console.log(`📧 PDF report for post ${id} sent to post author: ${postAuthor.email}`);

        res.json({
            success: true,
            message: `Report successfully emailed to post author (${postAuthor.email}).`,
        });
    } catch (error) {
        next(error);
    }
};
