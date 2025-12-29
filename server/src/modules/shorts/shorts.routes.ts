import { Router } from 'express';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { Short } from './Short.model.js';
import { Profile } from '../users/Profile.model.js';
import { addAIAnalysisJob } from '../../jobs/queues.js';
import { cloudinary, getVideoThumbnail } from '../../config/cloudinary.js';
import multer from 'multer';
import { Readable } from 'stream';

const router = Router();

// Debug middleware
router.use((req, res, next) => {
    console.log(`[ShortsRouter] ${req.method} ${req.url}`);
    next();
});

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only video files are allowed'));
        }
    },
});

// Helper to get profiles
async function attachCreators(shorts: any[]) {
    const creatorIds = [...new Set(shorts.map(s => s.userId.toString()))];
    const profiles = await Profile.find({
        $or: [
            { userId: { $in: creatorIds } },
            { supabaseId: { $in: creatorIds } },
        ]
    });
    const profileMap = new Map(profiles.map(p => [p.userId?.toString() || p.supabaseId, p]));

    return shorts.map(short => ({
        ...short.toJSON(),
        creator: profileMap.get(short.userId.toString()),
    }));
}

// Get shorts feed (for you page)
router.get('/feed', optionalAuth, async (req, res, next) => {
    try {
        const { cursor, limit = '10' } = req.query;

        const query: Record<string, unknown> = {
            isDeleted: false,
        };

        if (cursor) {
            query._id = { $lt: cursor };
        }

        const shorts = await Short.find(query)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = shorts.length > parseInt(limit as string, 10);
        const results = hasMore ? shorts.slice(0, -1) : shorts;

        const shortsWithCreators = await attachCreators(results);

        // Add isLiked status
        const userId = req.user?.userId;
        const finalShorts = shortsWithCreators.map(short => ({
            ...short,
            isLiked: userId ? short.likes?.some((id: any) => id.toString() === userId) : false,
        }));

        res.json({
            success: true,
            data: {
                shorts: finalShorts,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get trending shorts
router.get('/trending', optionalAuth, async (req, res, next) => {
    try {
        const shorts = await Short.find({ isDeleted: false })
            .sort({ viewsCount: -1, likesCount: -1 })
            .limit(20);

        const shortsWithCreators = await attachCreators(shorts);

        res.json({
            success: true,
            data: { shorts: shortsWithCreators },
        });
    } catch (error) {
        next(error);
    }
});

// Get user shorts
router.get('/user/:userId', optionalAuth, async (req, res, next) => {
    try {
        const { userId } = req.params;
        const shorts = await Short.find({ userId, isDeleted: false })
            .sort({ createdAt: -1 });

        const shortsWithCreators = await attachCreators(shorts);

        res.json({
            success: true,
            data: { shorts: shortsWithCreators },
        });
    } catch (error) {
        next(error);
    }
});

// Like short (idempotent - won't fail if already liked)
router.post('/:id/like', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // First try to add the like
        let short = await Short.findOneAndUpdate(
            { _id: id, isDeleted: false, likes: { $ne: userId } },
            { $push: { likes: userId }, $inc: { likesCount: 1 } },
            { new: true }
        );

        // If no update happened, check if already liked
        if (!short) {
            short = await Short.findOne({ _id: id, isDeleted: false });
            if (!short) {
                res.status(404).json({ success: false, error: { message: 'Short not found' } });
                return;
            }
            // Already liked - return current state
        }

        res.json({ success: true, data: { likesCount: short.likesCount, isLiked: true } });
    } catch (error) {
        next(error);
    }
});

// Unlike short (idempotent - won't fail if not liked)
router.delete('/:id/like', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        // First try to remove the like
        let short = await Short.findOneAndUpdate(
            { _id: id, likes: userId },
            { $pull: { likes: userId }, $inc: { likesCount: -1 } },
            { new: true }
        );

        // If no update happened, check if short exists
        if (!short) {
            short = await Short.findOne({ _id: id, isDeleted: false });
            if (!short) {
                res.status(404).json({ success: false, error: { message: 'Short not found' } });
                return;
            }
            // Not liked - return current state
        }

        res.json({ success: true, data: { likesCount: short.likesCount, isLiked: false } });
    } catch (error) {
        next(error);
    }
});

// Create short with video upload
router.post('/', authenticate, upload.single('video'), async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { caption, hashtags } = req.body;
        const videoFile = req.file;

        if (!videoFile) {
            res.status(400).json({ success: false, error: { message: 'Video file is required' } });
            return;
        }

        // Upload video to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'video',
                    folder: 'truevibe/shorts',
                    eager: [
                        { format: 'mp4', video_codec: 'auto', quality: 'auto:good' }
                    ],
                    eager_async: true,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            const stream = Readable.from(videoFile.buffer);
            stream.pipe(uploadStream);
        });

        const videoUrl = uploadResult.secure_url;
        const duration = Math.round(uploadResult.duration || 60);
        const thumbnailUrl = getVideoThumbnail(uploadResult.public_id, { width: 720, height: 1280, time: '1' });

        const short = await Short.create({
            userId,
            videoUrl,
            thumbnailUrl,
            caption,
            hashtags: hashtags ? (Array.isArray(hashtags) ? hashtags : hashtags.split(',').map((t: string) => t.trim())) : [],
            duration: Math.min(duration, 60),
            trustLevel: 'pending',
        });

        // Queue AI analysis
        try {
            await addAIAnalysisJob({
                mediaId: short._id.toString(),
                postId: short._id.toString(),
                contentType: 'short',
            });
        } catch (jobError) {
            console.warn('Failed to queue AI analysis job:', jobError);
        }

        res.status(201).json({
            success: true,
            data: { short },
        });
    } catch (error) {
        next(error);
    }
});

// Record view
router.post('/:id/view', optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        await Short.findByIdAndUpdate(id, { $inc: { viewsCount: 1 } });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Get single short
router.get('/:id', optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const short = await Short.findOne({ _id: id, isDeleted: false });

        if (!short) {
            res.status(404).json({ success: false, error: { message: 'Short not found' } });
            return;
        }

        const creator = await Profile.findOne({
            $or: [
                { userId: short.userId },
                { supabaseId: short.userId },
            ]
        });

        const userId = req.user?.userId;

        res.json({
            success: true,
            data: {
                short: {
                    ...short.toJSON(),
                    creator,
                    isLiked: userId ? short.likes.some((id: any) => id.toString() === userId) : false,
                }
            },
        });
    } catch (error) {
        next(error);
    }
});

// Delete short
router.delete('/:id', authenticate, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user!.userId;

        const short = await Short.findOne({ _id: id, userId });
        if (short) {
            // Delete media from Cloudinary
            if (short.videoUrl) {
                const { deleteCloudinaryByUrl } = await import('../../config/cloudinary.js');
                await deleteCloudinaryByUrl(short.videoUrl);
            }

            short.isDeleted = true;
            await short.save();
        }

        res.json({ success: true, message: 'Short deleted' });
    } catch (error) {
        next(error);
    }
});

export default router;
