import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../shared/middleware/supabase.middleware.js';
import { Audio, SavedAudio } from './Audio.model.js';
import { Short } from './Short.model.js';
import { Profile } from '../users/Profile.model.js';

const router = Router();

// Browse audio library
router.get('/browse', optionalAuth, async (req, res, next) => {
    try {
        const { genre, sort = 'trending', limit = '20', cursor } = req.query;

        const query: Record<string, unknown> = { isActive: true };
        if (genre) query.genre = genre;
        if (cursor) query._id = { $lt: cursor };

        let sortOption: Record<string, 1 | -1> = { usageCount: -1, createdAt: -1 };
        if (sort === 'recent') sortOption = { createdAt: -1 };
        if (sort === 'featured') {
            query.featuredAt = { $ne: null };
            sortOption = { featuredAt: -1 };
        }

        const audios = await Audio.find(query)
            .sort(sortOption)
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = audios.length > parseInt(limit as string, 10);
        const results = hasMore ? audios.slice(0, -1) : audios;

        res.json({
            success: true,
            data: {
                audios: results,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Search audio
router.get('/search', async (req, res, next) => {
    try {
        const { q, limit = '20' } = req.query;

        if (!q || (q as string).length < 2) {
            return res.json({ success: true, data: { audios: [] } });
        }

        const audios = await Audio.find({
            $text: { $search: q as string },
            isActive: true,
        })
            .sort({ score: { $meta: 'textScore' }, usageCount: -1 })
            .limit(parseInt(limit as string, 10));

        res.json({
            success: true,
            data: { audios },
        });
    } catch (error) {
        next(error);
    }
});

// Get trending sounds
router.get('/trending', async (req, res, next) => {
    try {
        const { limit = '10' } = req.query;

        const audios = await Audio.find({ isActive: true })
            .sort({ usageCount: -1 })
            .limit(parseInt(limit as string, 10));

        res.json({
            success: true,
            data: { audios },
        });
    } catch (error) {
        next(error);
    }
});

// Get audio by ID with shorts using it
router.get('/:id', async (req, res, next) => {
    try {
        const { id } = req.params;

        const audio = await Audio.findById(id);
        if (!audio || !audio.isActive) {
            return res.status(404).json({
                success: false,
                error: { message: 'Audio not found' },
            });
        }

        // Get shorts using this audio
        const shorts = await Short.find({
            'audioTrack.url': audio.audioUrl,
            isDeleted: false,
        })
            .sort({ viewsCount: -1 })
            .limit(10);

        res.json({
            success: true,
            data: { audio, shorts },
        });
    } catch (error) {
        next(error);
    }
});

// Save/favorite an audio
router.post('/:id/save', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const audio = await Audio.findById(id);
        if (!audio) {
            return res.status(404).json({
                success: false,
                error: { message: 'Audio not found' },
            });
        }

        await SavedAudio.findOneAndUpdate(
            { userId, audioId: id },
            { userId, audioId: id, savedAt: new Date() },
            { upsert: true }
        );

        res.json({
            success: true,
            message: 'Audio saved',
        });
    } catch (error) {
        next(error);
    }
});

// Unsave an audio
router.delete('/:id/save', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        await SavedAudio.findOneAndDelete({ userId, audioId: id });

        res.json({
            success: true,
            message: 'Audio unsaved',
        });
    } catch (error) {
        next(error);
    }
});

// Get my saved audios
router.get('/my/saved', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { limit = '20' } = req.query;

        const saved = await SavedAudio.find({ userId })
            .populate('audioId')
            .sort({ savedAt: -1 })
            .limit(parseInt(limit as string, 10));

        const audios = saved.map(s => s.audioId).filter(Boolean);

        res.json({
            success: true,
            data: { audios },
        });
    } catch (error) {
        next(error);
    }
});

// Create original sound (from user's short)
router.post('/original', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { title, audioUrl, duration, coverUrl } = req.body;

        if (!title || !audioUrl || !duration) {
            return res.status(400).json({
                success: false,
                error: { message: 'Title, audioUrl, and duration are required' },
            });
        }

        // Get creator profile
        const profile = await Profile.findOne({
            $or: [{ userId }, { supabaseId: userId }]
        });

        const audio = await Audio.create({
            title,
            artist: profile?.name || 'Original Sound',
            audioUrl,
            coverUrl,
            duration,
            isOriginal: true,
            originalCreatorId: userId,
        });

        res.status(201).json({
            success: true,
            data: { audio },
        });
    } catch (error) {
        next(error);
    }
});

// Increment usage count (called when audio is used in a short)
router.post('/:id/use', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        await Audio.findByIdAndUpdate(id, { $inc: { usageCount: 1 } });

        res.json({
            success: true,
            message: 'Usage recorded',
        });
    } catch (error) {
        next(error);
    }
});

// Get genres
router.get('/meta/genres', async (req, res, next) => {
    try {
        const genres = await Audio.distinct('genre', { isActive: true, genre: { $ne: null } });

        res.json({
            success: true,
            data: { genres: genres.filter(Boolean) },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
