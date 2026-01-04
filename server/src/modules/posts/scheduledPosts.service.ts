import { Post } from '../posts/Post.model.js';
import { createNotification } from '../notifications/notification.service.js';
import { Profile } from '../users/Profile.model.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Scheduled Posts Service
 * Handles publishing of scheduled posts and draft management
 */

// Check and publish scheduled posts every minute
let schedulerInterval: NodeJS.Timeout | null = null;
let memoryMonitorInterval: NodeJS.Timeout | null = null;
let processingCount = 0;

/**
 * Log memory usage for monitoring
 */
const logMemoryUsage = () => {
    const memUsage = process.memoryUsage();
    logger.info('[Scheduler] Memory Usage', {
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        processingCount,
    });
};

export const startScheduledPostsProcessor = () => {
    if (schedulerInterval) {
        logger.warn('[Scheduler] Already running');
        return;
    }

    // Run every minute (60000ms)
    schedulerInterval = setInterval(async () => {
        processingCount++;
        const startTime = Date.now();
        try {
            const published = await processScheduledPosts();
            const duration = Date.now() - startTime;
            if (published > 0) {
                logger.info(`[Scheduler] Published ${published} posts in ${duration}ms`);
            }
        } catch (error) {
            logger.error('[Scheduler] Error processing scheduled posts:', error);
        }
    }, 60000);

    // Monitor memory every 5 minutes
    memoryMonitorInterval = setInterval(logMemoryUsage, 5 * 60 * 1000);

    logger.info('[Scheduler] Scheduled posts processor started');
    logMemoryUsage(); // Initial log
};

export const stopScheduledPostsProcessor = () => {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;
    }
    if (memoryMonitorInterval) {
        clearInterval(memoryMonitorInterval);
        memoryMonitorInterval = null;
    }
    logger.info('[Scheduler] Scheduled posts processor stopped');
};

/**
 * Process all scheduled posts that are due
 */
export const processScheduledPosts = async (): Promise<number> => {
    const now = new Date();

    // Find all posts that are scheduled and due
    const duePosts = await Post.find({
        status: 'scheduled',
        scheduledFor: { $lte: now },
        isDeleted: false,
    }).limit(100); // Process max 100 at a time

    if (duePosts.length === 0) {
        return 0;
    }

    logger.info(`[Scheduler] Publishing ${duePosts.length} scheduled posts`);

    let publishedCount = 0;

    for (const post of duePosts) {
        try {
            // Update post status to published
            post.status = 'published';
            post.createdAt = new Date(); // Update creation time to publish time
            await post.save();

            publishedCount++;

            // Notify the author that their post was published
            const author = await Profile.findOne({ userId: post.userId }).select('name');

            createNotification({
                userId: post.userId,
                type: 'system',
                title: 'Post Published',
                body: `Your scheduled post has been published`,
                link: `/app/post/${post._id}`,
            });

            logger.info(`[Scheduler] Published post ${post._id} for user ${post.userId}`);
        } catch (error) {
            logger.error(`[Scheduler] Failed to publish post ${post._id}:`, error);
        }
    }

    return publishedCount;
};

/**
 * Get user's drafts
 */
export const getUserDrafts = async (userId: string, limit = 20) => {
    return Post.find({
        userId,
        status: 'draft',
        isDeleted: false,
    })
        .sort({ updatedAt: -1 })
        .limit(limit)
        .populate('media', 'url type thumbnail');
};

/**
 * Get user's scheduled posts
 */
export const getUserScheduledPosts = async (userId: string, limit = 20) => {
    return Post.find({
        userId,
        status: 'scheduled',
        isDeleted: false,
    })
        .sort({ scheduledFor: 1 }) // Nearest first
        .limit(limit)
        .populate('media', 'url type thumbnail');
};

/**
 * Schedule a post
 */
export const schedulePost = async (
    postId: string,
    userId: string,
    scheduledFor: Date
): Promise<boolean> => {
    // Validate scheduled time is in the future
    if (scheduledFor <= new Date()) {
        throw new Error('Scheduled time must be in the future');
    }

    // Validate not too far in the future (max 1 year)
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (scheduledFor > maxDate) {
        throw new Error('Cannot schedule more than 1 year in advance');
    }

    const post = await Post.findOneAndUpdate(
        { _id: postId, userId, isDeleted: false },
        {
            status: 'scheduled',
            scheduledFor,
        },
        { new: true }
    );

    return !!post;
};

/**
 * Convert scheduled post to draft
 */
export const unschedulePost = async (
    postId: string,
    userId: string
): Promise<boolean> => {
    const post = await Post.findOneAndUpdate(
        { _id: postId, userId, status: 'scheduled', isDeleted: false },
        {
            status: 'draft',
            $unset: { scheduledFor: 1 },
        },
        { new: true }
    );

    return !!post;
};

/**
 * Save post as draft
 */
export const saveDraft = async (
    postId: string,
    userId: string
): Promise<boolean> => {
    const post = await Post.findOneAndUpdate(
        { _id: postId, userId, isDeleted: false },
        { status: 'draft' },
        { new: true }
    );

    return !!post;
};

/**
 * Publish a draft immediately
 */
export const publishDraft = async (
    postId: string,
    userId: string
): Promise<boolean> => {
    const post = await Post.findOneAndUpdate(
        { _id: postId, userId, status: 'draft', isDeleted: false },
        {
            status: 'published',
            createdAt: new Date(),
        },
        { new: true }
    );

    return !!post;
};

/**
 * Delete a draft
 */
export const deleteDraft = async (
    postId: string,
    userId: string
): Promise<boolean> => {
    const post = await Post.findOneAndUpdate(
        { _id: postId, userId, status: 'draft', isDeleted: false },
        { isDeleted: true },
        { new: true }
    );

    return !!post;
};
