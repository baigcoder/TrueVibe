import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { Story } from './Story.model.js';
import { Profile } from '../users/Profile.model.js';
import { Follow } from '../users/Follow.model.js';
import { getFriendIds } from '../users/followHelpers.js';
import { addAIAnalysisJob } from '../../jobs/queues.js';

const router = Router();

// Multer memory storage for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image and video files are allowed'));
        }
    },
});

// Get stories from friends only (mutual follows)
router.get('/feed', requireAuth, async (req, res, next) => {
    try {
        const userId = req.auth!.userId;

        // Get friends (mutual follows) - both users follow each other
        const friendIds = await getFriendIds(userId);
        // Include own stories + friends' stories
        const allowedUserIds = [userId, ...friendIds];

        // Get active stories (not expired, not deleted)
        const stories = await Story.find({
            userId: { $in: allowedUserIds },
            expiresAt: { $gt: new Date() },
            isDeleted: false,
        })
            .sort({ createdAt: -1 })
            .limit(50);

        // Group by user
        const grouped = new Map<string, typeof stories[0][]>();
        for (const story of stories) {
            const existing = grouped.get(story.userId) || [];
            existing.push(story);
            grouped.set(story.userId, existing);
        }

        // Get profiles
        const userIds = [...grouped.keys()];
        const profiles = await Profile.find({
            $or: [
                { userId: { $in: userIds } },
                { supabaseId: { $in: userIds } },
            ]
        });
        const profileMap = new Map(profiles.map(p => [p.userId?.toString() || p.supabaseId, p]));

        // Format response
        const storyFeed = userIds.map(uid => ({
            user: profileMap.get(uid),
            stories: grouped.get(uid),
            hasUnwatched: grouped.get(uid)?.some(s =>
                !s.viewers.some(v => v.userId === userId)
            ),
        }));

        res.json({
            success: true,
            data: { storyFeed },
        });
    } catch (error) {
        next(error);
    }
});

// Create story with file upload
router.post('/', requireAuth, upload.single('media'), async (req, res, next) => {
    try {
        const userId = req.auth!.userId;
        const { caption } = req.body;
        const mediaFile = req.file;

        if (!mediaFile) {
            res.status(400).json({ success: false, error: { message: 'Media file is required' } });
            return;
        }

        // Determine if image or video
        const isVideo = mediaFile.mimetype.startsWith('video/');
        const resourceType = isVideo ? 'video' : 'image';

        // Upload to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: resourceType,
                    folder: 'truevibe/stories',
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            const readable = new Readable();
            readable.push(mediaFile.buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });

        // Create story with 24h expiration
        const story = await Story.create({
            userId,
            mediaUrl: uploadResult.secure_url,
            mediaType: isVideo ? 'video' : 'image',
            thumbnailUrl: isVideo ? uploadResult.secure_url.replace(/\.[^/.]+$/, '.jpg') : undefined,
            caption,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            trustLevel: 'pending',
        });

        // Queue AI analysis for the story
        try {
            await addAIAnalysisJob({
                mediaId: story._id.toString(),
                postId: story._id.toString(),
                contentType: 'story',
                mediaUrl: uploadResult.secure_url,
            });
        } catch (jobError) {
            console.warn('Failed to queue AI analysis for story:', jobError);
        }

        res.status(201).json({
            success: true,
            data: { story },
        });
    } catch (error) {
        next(error);
    }
});

// View story (mark as seen)
router.post('/:id/view', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.auth!.userId;

        await Story.findByIdAndUpdate(id, {
            $addToSet: {
                viewers: { userId, viewedAt: new Date() },
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Like/Unlike story
router.post('/:id/like', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = String(req.auth!.userId); // Ensure string

        console.log(`[Story Like] Request: storyId=${id}, userId=${userId}`);

        // Validate ObjectId format
        if (!id || !/^[a-f\d]{24}$/i.test(id)) {
            console.log(`[Story Like] Invalid story ID format: ${id}`);
            res.status(400).json({ success: false, error: { message: 'Invalid story ID format' } });
            return;
        }

        const story = await Story.findById(id);
        if (!story) {
            console.log(`[Story Like] Story not found: ${id}`);
            res.status(404).json({ success: false, error: { message: 'Story not found' } });
            return;
        }

        // Check if story is deleted
        if (story.isDeleted) {
            console.log(`[Story Like] Story is deleted: ${id}`);
            res.status(404).json({ success: false, error: { message: 'Story has been deleted' } });
            return;
        }

        // Ensure likes array exists and contains strings
        if (!story.likes) {
            story.likes = [];
        }

        // Convert all likes to strings for comparison
        const likesAsStrings = story.likes.map(like => String(like));
        const isLiked = likesAsStrings.includes(userId);

        console.log(`[Story Like] Current likes count: ${story.likes.length}, isLiked: ${isLiked}`);

        if (isLiked) {
            // Unlike - remove userId from likes
            story.likes = story.likes.filter(like => String(like) !== userId);
            console.log(`[Story Like] Unliked, new count: ${story.likes.length}`);
        } else {
            // Like - add userId
            story.likes.push(userId);
            console.log(`[Story Like] Liked, new count: ${story.likes.length}`);
        }

        await story.save();

        console.log(`[Story Like] Success: storyId=${id}, userId=${userId}, isLiked=${!isLiked}`);
        res.json({ success: true, isLiked: !isLiked, likesCount: story.likes.length });
    } catch (error) {
        console.error('[Story Like] Error:', error);
        next(error);
    }
});

// Comment on story
router.post('/:id/comment', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { content } = req.body;
        const userId = req.auth!.userId;

        if (!content?.trim()) {
            res.status(400).json({ success: false, error: { message: 'Comment content is required' } });
            return;
        }

        const story = await Story.findByIdAndUpdate(id, {
            $push: {
                comments: { userId, content: content.trim(), createdAt: new Date() },
            },
        }, { new: true });

        if (!story) {
            res.status(404).json({ success: false, error: { message: 'Story not found' } });
            return;
        }

        res.json({ success: true, comment: story.comments[story.comments.length - 1] });
    } catch (error) {
        next(error);
    }
});

// React to story
router.post('/:id/react', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const { emoji } = req.body;
        const userId = req.auth!.userId;

        await Story.findByIdAndUpdate(id, {
            $push: {
                reactions: { userId, emoji, createdAt: new Date() },
            },
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

// Delete story
router.delete('/:id', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const authUserId = String(req.auth!.userId); // Ensure string

        console.log(`[Story Delete] Request: storyId=${id}, authUserId=${authUserId}`);

        // Validate ObjectId format
        if (!id || !/^[a-f\d]{24}$/i.test(id)) {
            console.log(`[Story Delete] Invalid story ID format: ${id}`);
            res.status(400).json({
                success: false,
                error: { message: 'Invalid story ID format' }
            });
            return;
        }

        // Find the story by ID
        const story = await Story.findOne({ _id: id, isDeleted: false });

        if (!story) {
            console.log(`[Story Delete] Story not found or already deleted: ${id}`);
            res.status(404).json({
                success: false,
                error: { message: 'Story not found' }
            });
            return;
        }

        // Log all versions of userId for debugging
        const storyUserId = String(story.userId || '');
        console.log(`[Story Delete] Ownership check: authUserId="${authUserId}", storyUserId="${storyUserId}"`);
        console.log(`[Story Delete] Types: authUserId=${typeof authUserId}, storyUserId=${typeof story.userId}`);

        // Simple string comparison for ownership
        const isOwner = storyUserId === authUserId;

        if (!isOwner) {
            console.log(`[Story Delete] DENIED - userId mismatch. auth="${authUserId}" story="${storyUserId}"`);
            res.status(403).json({
                success: false,
                error: { message: 'You do not have permission to delete this story' }
            });
            return;
        }

        console.log(`[Story Delete] Ownership confirmed, proceeding with delete`);

        // Delete media from Cloudinary
        if (story.mediaUrl) {
            try {
                const { deleteCloudinaryByUrl } = await import('../../config/cloudinary.js');
                await deleteCloudinaryByUrl(story.mediaUrl);
                console.log(`[Story Delete] Cloudinary media deleted`);
            } catch (cloudinaryError) {
                console.error('[Story Delete] Cloudinary delete failed:', cloudinaryError);
                // Continue with soft delete even if Cloudinary delete fails
            }
        }

        story.isDeleted = true;
        await story.save();

        console.log(`[Story Delete] SUCCESS: storyId=${id}, userId=${authUserId}`);
        res.json({ success: true, message: 'Story deleted' });
    } catch (error) {
        console.error('[Story Delete] Error:', error);
        next(error);
    }
});

// Get my story viewers
router.get('/:id/viewers', requireAuth, async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.auth!.userId;

        const story = await Story.findOne({ _id: id, userId });
        if (!story) {
            res.status(404).json({ success: false, error: { message: 'Story not found' } });
            return;
        }

        const viewerIds = story.viewers.map(v => v.userId);
        const commenterIds = story.comments.map(c => c.userId);
        const likerIds = story.likes;

        const allUserIds = [...new Set([...viewerIds, ...commenterIds, ...likerIds])];

        const profiles = await Profile.find({
            $or: [
                { userId: { $in: allUserIds } },
                { supabaseId: { $in: allUserIds } },
            ]
        });

        const profileMap = new Map(profiles.map(p => [p.userId?.toString() || p.supabaseId, p]));

        const storyObj = story.toObject();

        res.json({
            success: true,
            data: {
                viewers: viewerIds.map(id => profileMap.get(id)).filter(Boolean),
                viewCount: story.viewers.length,
                likes: likerIds.map(id => profileMap.get(id)).filter(Boolean),
                likeCount: story.likes.length,
                comments: storyObj.comments.map((c: any) => ({
                    ...c,
                    user: profileMap.get(c.userId)
                })),
                commentCount: story.comments.length,
                reactions: story.reactions,
                reactionCount: story.reactions.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;

