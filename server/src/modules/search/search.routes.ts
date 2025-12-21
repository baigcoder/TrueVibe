import { Router } from 'express';
import { optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { Profile } from '../users/Profile.model.js';
import { Post } from '../posts/Post.model.js';
import { Short } from '../shorts/Short.model.js';

const router = Router();

// Unified search
router.get('/', optionalAuth, async (req, res, next) => {
    try {
        const { q, type = 'all', limit = '10' } = req.query;
        const queryStr = q as string;

        if (!queryStr) {
            return res.json({
                success: true,
                data: { users: [], posts: [], shorts: [] },
            });
        }

        const pageSize = parseInt(limit as string, 10);
        const results: any = {};

        // Search Users
        if (type === 'all' || type === 'users') {
            results.users = await Profile.find({
                $or: [
                    { name: { $regex: queryStr, $options: 'i' } },
                    { handle: { $regex: queryStr, $options: 'i' } },
                ],
            })
                .limit(pageSize)
                .select('name handle avatar trustScore');
        }

        // Search Posts
        if (type === 'all' || type === 'posts') {
            results.posts = await Post.find({
                content: { $regex: queryStr, $options: 'i' },
                isDeleted: false,
                visibility: 'public',
            })
                .sort({ createdAt: -1 })
                .limit(pageSize)
                .populate('userId', 'name handle avatar');
        }

        // Search Shorts
        if (type === 'all' || type === 'shorts') {
            results.shorts = await Short.find({
                $or: [
                    { caption: { $regex: queryStr, $options: 'i' } },
                    { hashtags: { $in: [queryStr.toLowerCase().replace('#', '')] } },
                ],
                isDeleted: false,
            })
                .sort({ createdAt: -1 })
                .limit(pageSize);
        }

        res.json({
            success: true,
            data: results,
        });
    } catch (error) {
        next(error);
    }
});

export default router;
