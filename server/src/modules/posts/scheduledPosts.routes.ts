import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { scheduledPostsLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import { Post } from './Post.model.js';
import * as scheduledPostsService from './scheduledPosts.service.js';

const router = Router();

// Apply rate limiter to all scheduling routes
router.use(scheduledPostsLimiter);

// Get user's drafts
router.get('/drafts', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { limit = '20' } = req.query;

        const drafts = await scheduledPostsService.getUserDrafts(
            userId,
            parseInt(limit as string, 10)
        );

        res.json({
            success: true,
            data: { drafts },
        });
    } catch (error) {
        next(error);
    }
});

// Get user's scheduled posts
router.get('/scheduled', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { limit = '20' } = req.query;

        const scheduledPosts = await scheduledPostsService.getUserScheduledPosts(
            userId,
            parseInt(limit as string, 10)
        );

        res.json({
            success: true,
            data: { scheduledPosts },
        });
    } catch (error) {
        next(error);
    }
});

// Schedule a post
router.post('/:id/schedule', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id: postId } = req.params;
        const { scheduledFor } = req.body;

        if (!scheduledFor) {
            res.status(400).json({
                success: false,
                error: { message: 'scheduledFor is required' },
            });
            return;
        }

        const scheduledDate = new Date(scheduledFor);
        if (isNaN(scheduledDate.getTime())) {
            res.status(400).json({
                success: false,
                error: { message: 'Invalid date format' },
            });
            return;
        }

        await scheduledPostsService.schedulePost(postId, userId, scheduledDate);

        res.json({
            success: true,
            message: 'Post scheduled successfully',
            data: { scheduledFor: scheduledDate },
        });
    } catch (error: any) {
        if (error.message?.includes('future') || error.message?.includes('advance')) {
            res.status(400).json({
                success: false,
                error: { message: error.message },
            });
            return;
        }
        next(error);
    }
});

// Unschedule a post (convert back to draft)
router.post('/:id/unschedule', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id: postId } = req.params;

        const success = await scheduledPostsService.unschedulePost(postId, userId);

        if (!success) {
            res.status(404).json({
                success: false,
                error: { message: 'Scheduled post not found' },
            });
            return;
        }

        res.json({
            success: true,
            message: 'Post unscheduled and saved as draft',
        });
    } catch (error) {
        next(error);
    }
});

// Save post as draft
router.post('/:id/draft', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id: postId } = req.params;

        const success = await scheduledPostsService.saveDraft(postId, userId);

        if (!success) {
            res.status(404).json({
                success: false,
                error: { message: 'Post not found' },
            });
            return;
        }

        res.json({
            success: true,
            message: 'Saved as draft',
        });
    } catch (error) {
        next(error);
    }
});

// Publish a draft immediately
router.post('/:id/publish', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id: postId } = req.params;

        const success = await scheduledPostsService.publishDraft(postId, userId);

        if (!success) {
            res.status(404).json({
                success: false,
                error: { message: 'Draft not found' },
            });
            return;
        }

        res.json({
            success: true,
            message: 'Draft published successfully',
        });
    } catch (error) {
        next(error);
    }
});

// Delete a draft
router.delete('/drafts/:id', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user!.userId;
        const { id: postId } = req.params;

        const success = await scheduledPostsService.deleteDraft(postId, userId);

        if (!success) {
            res.status(404).json({
                success: false,
                error: { message: 'Draft not found' },
            });
            return;
        }

        res.json({
            success: true,
            message: 'Draft deleted',
        });
    } catch (error) {
        next(error);
    }
});

export default router;
