import { Request, Response, NextFunction } from 'express';
import { Report } from './Report.model.js';
import { User } from '../users/User.model.js';
import { Profile } from '../users/Profile.model.js';
import { Post } from '../posts/Post.model.js';
import { AIAnalysis } from '../posts/AIAnalysis.model.js';
import { Comment } from '../comments/Comment.model.js';
import { NotFoundError } from '../../shared/middleware/error.middleware.js';

// Get reports queue
export const getReports = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { status = 'pending', limit = '50', cursor } = req.query;

        const query: Record<string, unknown> = {};
        if (status !== 'all') {
            query.status = status;
        }
        if (cursor) {
            query._id = { $lt: cursor };
        }

        const reports = await Report.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1)
            .populate('reporterId', 'email');

        const hasMore = reports.length > parseInt(limit as string, 10);
        const results = hasMore ? reports.slice(0, -1) : reports;

        res.json({
            success: true,
            data: {
                reports: results,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Resolve report
export const resolveReport = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, resolution } = req.body;
        const adminId = req.user!.userId;

        const report = await Report.findByIdAndUpdate(
            id,
            {
                status,
                resolution,
                reviewedBy: adminId,
                resolvedAt: new Date(),
            },
            { new: true }
        );

        if (!report) {
            throw new NotFoundError('Report');
        }

        // If resolved, take action on content
        if (status === 'resolved') {
            if (report.targetType === 'post') {
                await Post.findByIdAndUpdate(report.targetId, { isDeleted: true });
            } else if (report.targetType === 'comment') {
                await Comment.findByIdAndUpdate(report.targetId, { isDeleted: true });
            }
        }

        res.json({
            success: true,
            data: { report },
        });
    } catch (error) {
        next(error);
    }
};

// Override AI decision
export const overrideAIDecision = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { newClassification, reason } = req.body;
        const adminId = req.user!.userId;

        const analysis = await AIAnalysis.findById(id);
        if (!analysis) {
            throw new NotFoundError('AI Analysis');
        }

        const previousClassification = analysis.classification;

        // Update analysis
        analysis.adminOverride = {
            overriddenBy: adminId as any,
            previousClassification,
            newClassification,
            reason,
            timestamp: new Date(),
        };
        analysis.classification = newClassification;
        await analysis.save();

        // Update post trust level
        if (analysis.postId) {
            const trustLevel =
                newClassification === 'AUTHENTIC'
                    ? 'authentic'
                    : newClassification === 'SUSPICIOUS'
                        ? 'suspicious'
                        : 'likely_fake';

            await Post.findByIdAndUpdate(analysis.postId, { trustLevel });
        }

        res.json({
            success: true,
            data: { analysis },
        });
    } catch (error) {
        next(error);
    }
};

// Suspend user
export const suspendUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;
        const { reason } = req.body;

        const user = await User.findByIdAndUpdate(
            id,
            { status: 'suspended' },
            { new: true }
        );

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            message: 'User suspended',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

// Restore user
export const restoreUser = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { id } = req.params;

        const user = await User.findByIdAndUpdate(
            id,
            { status: 'active' },
            { new: true }
        );

        if (!user) {
            throw new NotFoundError('User');
        }

        res.json({
            success: true,
            message: 'User restored',
            data: { user },
        });
    } catch (error) {
        next(error);
    }
};

// Get moderation queue
export const getModerationQueue = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const { limit = '50' } = req.query;

        // Get flagged comments
        const flaggedComments = await Comment.find({ flagged: true, isDeleted: false })
            .limit(parseInt(limit as string, 10))
            .sort({ createdAt: -1 });

        // Get suspicious posts
        const suspiciousPosts = await Post.find({
            trustLevel: { $in: ['suspicious', 'likely_fake'] },
            isDeleted: false,
        })
            .limit(parseInt(limit as string, 10))
            .sort({ createdAt: -1 });

        // Get pending reports count
        const pendingReportsCount = await Report.countDocuments({ status: 'pending' });

        res.json({
            success: true,
            data: {
                flaggedComments,
                suspiciousPosts,
                pendingReportsCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

// Get admin stats
export const getAdminStats = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const [
            totalUsers,
            activeUsers,
            suspendedUsers,
            totalPosts,
            pendingReports,
            authenticPosts,
            suspiciousPosts,
            fakePosts,
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ status: 'active' }),
            User.countDocuments({ status: 'suspended' }),
            Post.countDocuments({ isDeleted: false }),
            Report.countDocuments({ status: 'pending' }),
            Post.countDocuments({ trustLevel: 'authentic', isDeleted: false }),
            Post.countDocuments({ trustLevel: 'suspicious', isDeleted: false }),
            Post.countDocuments({ trustLevel: 'likely_fake', isDeleted: false }),
        ]);

        res.json({
            success: true,
            data: {
                users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers },
                posts: { total: totalPosts, authentic: authenticPosts, suspicious: suspiciousPosts, fake: fakePosts },
                pendingReports,
            },
        });
    } catch (error) {
        next(error);
    }
};
