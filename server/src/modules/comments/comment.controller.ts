import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Comment } from './Comment.model.js';
import { Post } from '../posts/Post.model.js';
import { Profile } from '../users/Profile.model.js';
import { NotFoundError, ForbiddenError } from '../../shared/middleware/error.middleware.js';
import { emitToPost, emitToShort } from '../../socket/index.js';
import { Short } from '../shorts/Short.model.js';

// Create comment
export const createComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { postId, shortId, parentId, content } = req.body;

        if (!postId && !shortId) {
            throw new Error('Either postId or shortId is required');
        }

        // Verify target exists and update counts
        let targetId = postId || shortId;
        const isShort = !!shortId;

        if (isShort) {
            const short = await Short.findById(shortId);
            if (!short || short.isDeleted) {
                throw new NotFoundError('Short');
            }
        } else {
            const post = await Post.findById(postId);
            if (!post || post.isDeleted) {
                throw new NotFoundError('Post');
            }
        }

        // If reply, verify parent comment exists
        if (parentId) {
            const parentComment = await Comment.findById(parentId);
            if (!parentComment || parentComment.isDeleted) {
                throw new NotFoundError('Parent comment');
            }
        }

        // Create comment
        const comment = await Comment.create({
            postId: postId || null,
            shortId: shortId || null,
            userId,
            parentId: parentId || null,
            content,
        });

        // Update counts
        if (parentId) {
            await Comment.findByIdAndUpdate(parentId, { $inc: { repliesCount: 1 } });
        }

        if (isShort) {
            await Short.findByIdAndUpdate(shortId, { $inc: { commentsCount: 1 } });
        } else {
            await Post.findByIdAndUpdate(postId, { $inc: { commentsCount: 1 } });
        }

        // Get commenter profile
        const profile = await Profile.findOne({ userId });

        // Emit real-time event
        const eventData = {
            comment: {
                ...comment.toJSON(),
                author: profile,
            },
        };

        if (isShort) {
            emitToShort(shortId, 'comment:new', eventData);
        } else {
            emitToPost(postId, 'comment:new', eventData);
        }

        res.status(201).json({
            success: true,
            data: eventData,
        });
    } catch (error) {
        next(error);
    }
};

// Get comments for post
export const getPostComments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { postId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            postId,
            parentId: null, // Top-level comments only
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const comments = await Comment.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = comments.length > parseInt(limit as string, 10);
        const results = hasMore ? comments.slice(0, -1) : comments;

        // Get profiles for all commenters
        const userIds = results.map((c) => c.userId);
        const profiles = await Profile.find({ userId: { $in: userIds } });
        const profileMap = new Map(
            profiles.map((p) => [p.userId.toString(), p])
        );

        const commentsWithAuthors = results.map((comment) => ({
            ...comment.toJSON(),
            author: profileMap.get(comment.userId.toString()),
        }));

        res.json({
            success: true,
            data: {
                comments: commentsWithAuthors,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get comments for short
export const getShortComments = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { shortId } = req.params;
        const { cursor, limit = '20' } = req.query;

        const query: Record<string, unknown> = {
            shortId,
            parentId: null,
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const comments = await Comment.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = comments.length > parseInt(limit as string, 10);
        const results = hasMore ? comments.slice(0, -1) : comments;

        // Get profiles
        const userIds = results.map((c) => c.userId);
        const profiles = await Profile.find({ userId: { $in: userIds } });
        const profileMap = new Map(
            profiles.map((p) => [p.userId.toString(), p])
        );

        const commentsWithAuthors = results.map((comment) => ({
            ...comment.toJSON(),
            author: profileMap.get(comment.userId.toString()),
        }));

        res.json({
            success: true,
            data: {
                comments: commentsWithAuthors,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get replies
export const getReplies = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { cursor, limit = '10' } = req.query;

        const query: Record<string, unknown> = {
            parentId: id,
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const replies = await Comment.find(query)
            .sort({ createdAt: 1 }) // Oldest first for replies
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = replies.length > parseInt(limit as string, 10);
        const results = hasMore ? replies.slice(0, -1) : replies;

        // Get profiles
        const userIds = results.map((r) => r.userId);
        const profiles = await Profile.find({ userId: { $in: userIds } });
        const profileMap = new Map(
            profiles.map((p) => [p.userId.toString(), p])
        );

        const repliesWithAuthors = results.map((reply) => ({
            ...reply.toJSON(),
            author: profileMap.get(reply.userId.toString()),
        }));

        res.json({
            success: true,
            data: {
                replies: repliesWithAuthors,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Update/Edit comment
export const updateComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;
        const { content } = req.body;

        const comment = await Comment.findOne({ _id: id, isDeleted: false });

        if (!comment) {
            throw new NotFoundError('Comment');
        }

        if (comment.userId.toString() !== userId) {
            throw new ForbiddenError('Not authorized to edit this comment');
        }

        // Update content and mark as edited
        comment.content = content;
        (comment as any).isEdited = true;
        (comment as any).editedAt = new Date();

        await comment.save();

        // Get author profile
        const profile = await Profile.findOne({ userId });

        // Emit real-time event
        const eventData = {
            comment: {
                ...comment.toJSON(),
                author: profile,
            },
        };

        if (comment.shortId) {
            emitToShort(comment.shortId.toString(), 'comment:updated', eventData);
        } else if (comment.postId) {
            emitToPost(comment.postId.toString(), 'comment:updated', eventData);
        }

        res.json({
            success: true,
            data: {
                comment: {
                    ...comment.toJSON(),
                    author: profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
};

// Delete comment
export const deleteComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const comment = await Comment.findById(id);

        if (!comment) {
            throw new NotFoundError('Comment');
        }

        if (comment.userId.toString() !== userId && req.user!.role !== 'admin') {
            throw new ForbiddenError('Not authorized to delete this comment');
        }

        // Soft delete
        comment.isDeleted = true;
        await comment.save();

        // Update counts
        if (comment.parentId) {
            await Comment.findByIdAndUpdate(comment.parentId, { $inc: { repliesCount: -1 } });
        }

        if (comment.shortId) {
            await Short.findByIdAndUpdate(comment.shortId, { $inc: { commentsCount: -1 } });
            emitToShort(comment.shortId.toString(), 'comment:deleted', { commentId: id });
        } else if (comment.postId) {
            await Post.findByIdAndUpdate(comment.postId, { $inc: { commentsCount: -1 } });
            emitToPost(comment.postId.toString(), 'comment:deleted', { commentId: id });
        }

        res.json({
            success: true,
            message: 'Comment deleted successfully',
        });
    } catch (error) {
        next(error);
    }
};

// Like comment
export const likeComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const comment = await Comment.findOneAndUpdate(
            { _id: id, isDeleted: false, likes: { $ne: userId } },
            { $push: { likes: userId }, $inc: { likesCount: 1 } },
            { new: true }
        );

        if (!comment) {
            throw new NotFoundError('Comment or already liked');
        }

        res.json({
            success: true,
            data: { likesCount: comment.likesCount },
        });
    } catch (error) {
        next(error);
    }
};

// Unlike comment
export const unlikeComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const comment = await Comment.findOneAndUpdate(
            { _id: id, likes: userId },
            { $pull: { likes: userId }, $inc: { likesCount: -1 } },
            { new: true }
        );

        if (!comment) {
            throw new NotFoundError('Comment or not liked');
        }

        res.json({
            success: true,
            data: { likesCount: comment.likesCount },
        });
    } catch (error) {
        next(error);
    }
};

// Flag comment
export const flagComment = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const comment = await Comment.findByIdAndUpdate(
            id,
            { flagged: true, flagReason: reason },
            { new: true }
        );

        if (!comment) {
            throw new NotFoundError('Comment');
        }

        res.json({
            success: true,
            message: 'Comment flagged for review',
        });
    } catch (error) {
        next(error);
    }
};
