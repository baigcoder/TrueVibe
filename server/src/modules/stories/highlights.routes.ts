import { Router } from 'express';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { StoryHighlight } from './StoryHighlight.model.js';
import { Story } from './Story.model.js';
import { Profile } from '../users/Profile.model.js';

const router = Router();

// Get user's highlights
router.get('/user/:userId', async (req, res, next) => {
    try {
        const { userId } = req.params;

        const highlights = await StoryHighlight.find({
            userId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { highlights },
        });
    } catch (error) {
        next(error);
    }
});

// Get my highlights
router.get('/me', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        const highlights = await StoryHighlight.find({
            userId,
            isActive: true,
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: { highlights },
        });
    } catch (error) {
        next(error);
    }
});

// Create a new highlight
router.post('/', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { title, coverImageUrl } = req.body;

        if (!title || title.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: { message: 'Title is required' },
            });
        }

        const highlight = await StoryHighlight.create({
            userId,
            title: title.trim(),
            coverImageUrl,
            stories: [],
        });

        res.status(201).json({
            success: true,
            data: { highlight },
        });
    } catch (error) {
        next(error);
    }
});

// Add story to highlight
router.post('/:highlightId/stories', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { highlightId } = req.params;
        const { storyId } = req.body;

        // Find the highlight
        const highlight = await StoryHighlight.findOne({
            _id: highlightId,
            userId,
            isActive: true,
        });

        if (!highlight) {
            return res.status(404).json({
                success: false,
                error: { message: 'Highlight not found' },
            });
        }

        // Find the story
        const story = await Story.findOne({ _id: storyId, userId });
        if (!story) {
            return res.status(404).json({
                success: false,
                error: { message: 'Story not found' },
            });
        }

        // Check if story already exists in highlight
        const existingStory = highlight.stories.find(
            s => s.storyId?.toString() === storyId
        );
        if (existingStory) {
            return res.status(400).json({
                success: false,
                error: { message: 'Story already in highlight' },
            });
        }

        // Add story to highlight (copy content to persist after TTL)
        highlight.stories.push({
            storyId: story._id,
            mediaUrl: story.mediaUrl,
            mediaType: story.mediaType,
            thumbnailUrl: story.thumbnailUrl,
            caption: story.caption,
            savedAt: new Date(),
        });

        // Set cover image if not set
        if (!highlight.coverImageUrl && story.mediaType === 'image') {
            highlight.coverImageUrl = story.mediaUrl;
        }

        await highlight.save();

        res.json({
            success: true,
            data: { highlight },
        });
    } catch (error) {
        next(error);
    }
});

// Remove story from highlight
router.delete('/:highlightId/stories/:storyIndex', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { highlightId, storyIndex } = req.params;
        const index = parseInt(storyIndex, 10);

        const highlight = await StoryHighlight.findOne({
            _id: highlightId,
            userId,
            isActive: true,
        });

        if (!highlight) {
            return res.status(404).json({
                success: false,
                error: { message: 'Highlight not found' },
            });
        }

        if (index < 0 || index >= highlight.stories.length) {
            return res.status(400).json({
                success: false,
                error: { message: 'Invalid story index' },
            });
        }

        highlight.stories.splice(index, 1);
        await highlight.save();

        res.json({
            success: true,
            data: { highlight },
        });
    } catch (error) {
        next(error);
    }
});

// Update highlight (title, cover)
router.patch('/:highlightId', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { highlightId } = req.params;
        const { title, coverImageUrl } = req.body;

        const highlight = await StoryHighlight.findOne({
            _id: highlightId,
            userId,
            isActive: true,
        });

        if (!highlight) {
            return res.status(404).json({
                success: false,
                error: { message: 'Highlight not found' },
            });
        }

        if (title) highlight.title = title.trim();
        if (coverImageUrl !== undefined) highlight.coverImageUrl = coverImageUrl;

        await highlight.save();

        res.json({
            success: true,
            data: { highlight },
        });
    } catch (error) {
        next(error);
    }
});

// Delete highlight
router.delete('/:highlightId', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { highlightId } = req.params;

        const highlight = await StoryHighlight.findOne({
            _id: highlightId,
            userId,
        });

        if (highlight) {
            highlight.isActive = false;
            await highlight.save();
        }

        res.json({
            success: true,
            message: 'Highlight deleted',
        });
    } catch (error) {
        next(error);
    }
});

// Get single highlight with stories
router.get('/:highlightId', async (req, res, next) => {
    try {
        const { highlightId } = req.params;

        const highlight = await StoryHighlight.findOne({
            _id: highlightId,
            isActive: true,
        });

        if (!highlight) {
            return res.status(404).json({
                success: false,
                error: { message: 'Highlight not found' },
            });
        }

        // Get user profile
        const profile = await Profile.findOne({
            $or: [
                { userId: highlight.userId },
                { supabaseId: highlight.userId },
            ]
        });

        res.json({
            success: true,
            data: {
                highlight,
                user: profile,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
