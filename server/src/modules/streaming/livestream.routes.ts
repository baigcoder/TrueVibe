import { Router } from 'express';
import { requireAuth, optionalAuth } from '../../shared/middleware/supabase.middleware.js';
import { LiveStream, StreamViewer, generateStreamKey } from './LiveStream.model.js';
import { Profile } from '../users/Profile.model.js';

const router = Router();

// Create/Schedule a live stream
router.post('/create', requireAuth, async (req, res, next) => {
    try {
        const hostId = req.auth!.userId;
        const { title, description, category, tags, visibility, scheduledFor, chatEnabled, giftsEnabled, thumbnailUrl } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: { message: 'Title is required' },
            });
        }

        const streamKey = generateStreamKey();

        const stream = await LiveStream.create({
            streamKey,
            hostId,
            title,
            description,
            category: category || 'General',
            tags: tags || [],
            visibility: visibility || 'public',
            scheduledFor,
            status: scheduledFor ? 'scheduled' : 'live',
            chatEnabled: chatEnabled !== false,
            giftsEnabled: giftsEnabled !== false,
            thumbnailUrl,
            startedAt: scheduledFor ? undefined : new Date(),
        });

        res.status(201).json({
            success: true,
            data: { stream, streamKey },
        });
    } catch (error) {
        next(error);
    }
});

// Go live (start a scheduled stream)
router.post('/:id/start', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const stream = await LiveStream.findById(id);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: { message: 'Stream not found' },
            });
        }

        if (stream.hostId !== userId && !stream.coHosts.includes(userId)) {
            return res.status(403).json({
                success: false,
                error: { message: 'Only the host can start this stream' },
            });
        }

        stream.status = 'live';
        stream.startedAt = new Date();
        await stream.save();

        res.json({
            success: true,
            data: { stream },
        });
    } catch (error) {
        next(error);
    }
});

// End stream
router.post('/:id/end', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;
        const { recordingUrl } = req.body;

        const stream = await LiveStream.findById(id);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: { message: 'Stream not found' },
            });
        }

        if (stream.hostId !== userId) {
            return res.status(403).json({
                success: false,
                error: { message: 'Only the host can end this stream' },
            });
        }

        stream.status = 'ended';
        stream.endedAt = new Date();
        if (stream.startedAt) {
            stream.duration = Math.floor((stream.endedAt.getTime() - stream.startedAt.getTime()) / 1000);
        }
        if (recordingUrl) {
            stream.recordingUrl = recordingUrl;
        }

        // Calculate total watch time
        const viewers = await StreamViewer.find({ streamId: id, leftAt: { $ne: null } });
        stream.totalViews = viewers.length;

        await stream.save();

        res.json({
            success: true,
            data: { stream },
        });
    } catch (error) {
        next(error);
    }
});

// Join as viewer
router.post('/:id/join', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const stream = await LiveStream.findById(id);

        if (!stream || stream.status !== 'live') {
            return res.status(404).json({
                success: false,
                error: { message: 'Stream not found or not live' },
            });
        }

        // Create or update viewer record
        await StreamViewer.findOneAndUpdate(
            { streamId: id, userId },
            { streamId: id, userId, joinedAt: new Date(), leftAt: null },
            { upsert: true }
        );

        // Increment viewer count
        stream.viewerCount += 1;
        if (stream.viewerCount > stream.peakViewerCount) {
            stream.peakViewerCount = stream.viewerCount;
        }
        await stream.save();

        res.json({
            success: true,
            data: {
                stream,
                viewerCount: stream.viewerCount,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Leave stream
router.post('/:id/leave', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { id } = req.params;

        const stream = await LiveStream.findById(id);
        if (!stream) {
            return res.status(404).json({
                success: false,
                error: { message: 'Stream not found' },
            });
        }

        // Update viewer record
        const viewer = await StreamViewer.findOne({ streamId: id, userId });
        if (viewer && !viewer.leftAt) {
            viewer.leftAt = new Date();
            viewer.watchTime = Math.floor((viewer.leftAt.getTime() - viewer.joinedAt.getTime()) / 1000);
            await viewer.save();

            // Decrement viewer count
            stream.viewerCount = Math.max(0, stream.viewerCount - 1);
            await stream.save();
        }

        res.json({
            success: true,
            data: { viewerCount: stream.viewerCount },
        });
    } catch (error) {
        next(error);
    }
});

// Like stream
router.post('/:id/like', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const stream = await LiveStream.findByIdAndUpdate(
            id,
            { $inc: { likes: 1 } },
            { new: true }
        );

        res.json({
            success: true,
            data: { likes: stream?.likes || 0 },
        });
    } catch (error) {
        next(error);
    }
});

// Get live streams (discover)
router.get('/discover', optionalAuth, async (req, res, next) => {
    try {
        const { category, limit = '20', cursor } = req.query;

        const query: Record<string, unknown> = { status: 'live', isActive: true };
        if (category) query.category = category;
        if (cursor) query._id = { $lt: cursor };

        const streams = await LiveStream.find(query)
            .sort({ viewerCount: -1, createdAt: -1 })
            .limit(parseInt(limit as string, 10) + 1);

        const hasMore = streams.length > parseInt(limit as string, 10);
        const results = hasMore ? streams.slice(0, -1) : streams;

        // Get host profiles
        const hostIds = results.map(s => s.hostId);
        const profiles = await Profile.find({
            $or: [
                { userId: { $in: hostIds } },
                { supabaseId: { $in: hostIds } },
            ]
        });

        const profileMap = new Map();
        profiles.forEach(p => {
            profileMap.set(p.userId?.toString(), p);
            if (p.supabaseId) profileMap.set(p.supabaseId, p);
        });

        const streamsWithHosts = results.map(s => ({
            ...s.toObject(),
            host: profileMap.get(s.hostId) || null,
        }));

        res.json({
            success: true,
            data: {
                streams: streamsWithHosts,
                cursor: hasMore ? results[results.length - 1]._id : null,
                hasMore,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get upcoming scheduled streams
router.get('/upcoming', async (req, res, next) => {
    try {
        const { limit = '10' } = req.query;

        const streams = await LiveStream.find({
            status: 'scheduled',
            scheduledFor: { $gte: new Date() },
            isActive: true,
        })
            .sort({ scheduledFor: 1 })
            .limit(parseInt(limit as string, 10));

        res.json({
            success: true,
            data: { streams },
        });
    } catch (error) {
        next(error);
    }
});

// Get stream by ID
router.get('/:id', optionalAuth, async (req, res, next) => {
    try {
        const { id } = req.params;

        const stream = await LiveStream.findById(id);

        if (!stream) {
            return res.status(404).json({
                success: false,
                error: { message: 'Stream not found' },
            });
        }

        // Get host profile
        const profile = await Profile.findOne({
            $or: [{ userId: stream.hostId }, { supabaseId: stream.hostId }]
        });

        res.json({
            success: true,
            data: {
                stream: {
                    ...stream.toObject(),
                    host: profile,
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// Get my streams
router.get('/my/streams', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { status } = req.query;

        const query: Record<string, unknown> = { hostId: userId };
        if (status) query.status = status;

        const streams = await LiveStream.find(query)
            .sort({ createdAt: -1 })
            .limit(20);

        res.json({
            success: true,
            data: { streams },
        });
    } catch (error) {
        next(error);
    }
});

// Get categories
router.get('/meta/categories', async (req, res, next) => {
    try {
        const categories = await LiveStream.distinct('category', { isActive: true });

        res.json({
            success: true,
            data: { categories: categories.filter(Boolean) },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
