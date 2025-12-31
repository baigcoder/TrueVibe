import { Router, Request, Response, NextFunction } from 'express';
import { Collection } from './Collection.model.js';
import { Post } from './Post.model.js';
import { collectionLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import mongoose from 'mongoose';

const router = Router();

// Apply rate limiter to all collection routes
router.use(collectionLimiter);

// Get all collections for current user
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const collections = await Collection.find({ userId })
            .sort({ updatedAt: -1 })
            .lean();

        res.json({ success: true, data: { collections } });
    } catch (error) {
        next(error);
    }
});

// Get a specific collection with posts
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const collection = await Collection.findOne({ _id: id, userId })
            .populate({
                path: 'posts',
                options: { sort: { createdAt: -1 }, limit: 50 },
                populate: { path: 'userId', select: 'name handle avatar' }
            })
            .lean();

        if (!collection) {
            res.status(404).json({ success: false, error: { message: 'Collection not found' } });
            return;
        }

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
});

// Create a new collection
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { name, description, isPrivate } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        if (!name || name.trim().length === 0) {
            res.status(400).json({ success: false, error: { message: 'Collection name is required' } });
            return;
        }

        // Check for duplicate name
        const existing = await Collection.findOne({ userId, name: name.trim() });
        if (existing) {
            res.status(400).json({ success: false, error: { message: 'Collection with this name already exists' } });
            return;
        }

        const collection = await Collection.create({
            userId,
            name: name.trim(),
            description: description?.trim(),
            isPrivate: isPrivate !== false,
        });

        res.status(201).json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
});

// Update a collection
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;
        const { name, description, isPrivate } = req.body;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name.trim();
        if (description !== undefined) updateData.description = description?.trim();
        if (isPrivate !== undefined) updateData.isPrivate = isPrivate;

        const collection = await Collection.findOneAndUpdate(
            { _id: id, userId },
            { $set: updateData },
            { new: true }
        );

        if (!collection) {
            res.status(404).json({ success: false, error: { message: 'Collection not found' } });
            return;
        }

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
});

// Delete a collection
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const collection = await Collection.findOneAndDelete({ _id: id, userId });

        if (!collection) {
            res.status(404).json({ success: false, error: { message: 'Collection not found' } });
            return;
        }

        res.json({ success: true, message: 'Collection deleted' });
    } catch (error) {
        next(error);
    }
});

// Add post to collection
router.post('/:id/posts/:postId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id, postId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        // Verify post exists
        const post = await Post.findById(postId);
        if (!post) {
            res.status(404).json({ success: false, error: { message: 'Post not found' } });
            return;
        }

        const collection = await Collection.findOneAndUpdate(
            { _id: id, userId, posts: { $ne: new mongoose.Types.ObjectId(postId) } },
            {
                $push: { posts: new mongoose.Types.ObjectId(postId) },
                $inc: { postsCount: 1 }
            },
            { new: true }
        );

        if (!collection) {
            // Check if post already in collection
            const existing = await Collection.findOne({ _id: id, userId, posts: postId });
            if (existing) {
                res.status(400).json({ success: false, error: { message: 'Post already in collection' } });
                return;
            }
            res.status(404).json({ success: false, error: { message: 'Collection not found' } });
            return;
        }

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
});

// Remove post from collection
router.delete('/:id/posts/:postId', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.auth?.userId;
        const { id, postId } = req.params;

        if (!userId) {
            res.status(401).json({ success: false, error: { message: 'Unauthorized' } });
            return;
        }

        const collection = await Collection.findOneAndUpdate(
            { _id: id, userId },
            {
                $pull: { posts: new mongoose.Types.ObjectId(postId) },
                $inc: { postsCount: -1 }
            },
            { new: true }
        );

        if (!collection) {
            res.status(404).json({ success: false, error: { message: 'Collection not found' } });
            return;
        }

        res.json({ success: true, data: { collection } });
    } catch (error) {
        next(error);
    }
});

export default router;
