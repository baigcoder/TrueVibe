import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import * as userController from './user.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { updateProfileSchema, updateSettingsSchema } from './user.schema.js';
import { Profile } from './Profile.model.js';
import { AIReport } from '../posts/AIReport.model.js';
import { Post } from '../posts/Post.model.js';
import { Short } from '../shorts/Short.model.js';
import { Story } from '../stories/Story.model.js';


const router = Router();

// Multer memory storage for cover image uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (_req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    },
});

// Search users (must come before /:id)
router.get('/', optionalAuth, userController.searchUsers);

// Suggested users (must come before /:id)
router.get('/suggestions/for-you', authenticate, userController.getSuggestedUsers);

// Follow requests (must come before /:id)
router.get('/follow-requests', authenticate, userController.getFollowRequests);
router.post('/follow-requests/:id/accept', authenticate, userController.acceptFollowRequest);
router.post('/follow-requests/:id/reject', authenticate, userController.rejectFollowRequest);

// Protected routes with :id parameter (must come AFTER specific routes)
router.patch('/me', authenticate, validateBody(updateProfileSchema), userController.updateProfile);
router.put('/settings', authenticate, validateBody(updateSettingsSchema), userController.updateSettings);

// Get all user's AI reports (posts, shorts, and stories)
router.get('/me/reports', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const { type } = req.query; // 'post', 'short', 'story', or undefined for all

        // Build query filter
        const filter: { userId: string; contentType?: string } = { userId };
        if (type && ['post', 'short', 'story'].includes(type as string)) {
            filter.contentType = type as string;
        }

        // Get all reports for this user
        const reports = await AIReport.find(filter)
            .sort({ generatedAt: -1 })
            .lean();

        // Separate reports by content type
        const postReports = reports.filter(r => !r.contentType || r.contentType === 'post');
        const shortReports = reports.filter(r => r.contentType === 'short');
        const storyReports = reports.filter(r => r.contentType === 'story');

        // Fetch content from respective collections
        const postIds = postReports.map(r => r.postId);
        const shortIds = shortReports.map(r => r.postId);
        const storyIds = storyReports.map(r => r.postId);

        const [posts, shorts, stories] = await Promise.all([
            Post.find({ _id: { $in: postIds } })
                .select('content media createdAt trustLevel')
                .populate('media', 'url type thumbnail')
                .lean(),
            Short.find({ _id: { $in: shortIds } })
                .select('caption videoUrl thumbnailUrl createdAt trustLevel')
                .lean(),
            Story.find({ _id: { $in: storyIds } })
                .select('caption mediaUrl mediaType thumbnailUrl createdAt trustLevel')
                .lean(),
        ]);

        // Create maps for quick lookup
        const postMap = new Map(posts.map(p => [p._id.toString(), p]));
        const shortMap = new Map(shorts.map(s => [s._id.toString(), s]));
        const storyMap = new Map(stories.map(s => [s._id.toString(), s]));

        // Combine reports with content data
        const reportsWithContent = reports.map(report => {
            const contentType = report.contentType || 'post';
            let content: { _id: any; content?: string; thumbnail?: string; mediaType?: string; createdAt?: Date } | null = null;

            if (contentType === 'post') {
                const post = postMap.get(report.postId.toString());
                if (post) {
                    content = {
                        _id: post._id,
                        content: post.content?.substring(0, 100) + (post.content && post.content.length > 100 ? '...' : ''),
                        thumbnail: (post.media as any[])?.[0]?.type === 'video'
                            ? (post.media as any[])?.[0]?.thumbnail || (post.media as any[])?.[0]?.url
                            : (post.media as any[])?.[0]?.url,
                        mediaType: (post.media as any[])?.[0]?.type || 'text',
                        createdAt: post.createdAt,
                    };
                }
            } else if (contentType === 'short') {
                const short = shortMap.get(report.postId.toString());
                if (short) {
                    content = {
                        _id: short._id,
                        content: short.caption?.substring(0, 100) + (short.caption && short.caption.length > 100 ? '...' : ''),
                        thumbnail: short.thumbnailUrl || short.videoUrl,
                        mediaType: 'video',
                        createdAt: short.createdAt,
                    };
                }
            } else if (contentType === 'story') {
                const story = storyMap.get(report.postId.toString());
                if (story) {
                    content = {
                        _id: story._id,
                        content: story.caption?.substring(0, 100) + (story.caption && story.caption.length > 100 ? '...' : ''),
                        thumbnail: story.thumbnailUrl || story.mediaUrl,
                        mediaType: story.mediaType,
                        createdAt: story.createdAt,
                    };
                }
            }

            return {
                ...report,
                contentType,
                post: content, // Keep 'post' key for backward compatibility
            };
        });

        // Calculate summary stats
        const totalReports = reports.length;
        const verdictCounts = {
            authentic: reports.filter(r => r.report?.verdict === 'authentic').length,
            suspicious: reports.filter(r => r.report?.verdict === 'suspicious').length,
            fake: reports.filter(r => r.report?.verdict === 'fake').length,
        };
        const contentTypeCounts = {
            post: postReports.length,
            short: shortReports.length,
            story: storyReports.length,
        };
        const avgConfidence = reports.length > 0
            ? reports.reduce((sum, r) => sum + (r.report?.confidence || 0), 0) / reports.length
            : 0;

        res.json({
            success: true,
            data: {
                reports: reportsWithContent,
                summary: {
                    totalReports,
                    verdictCounts,
                    contentTypeCounts,
                    avgConfidence: Math.round(avgConfidence * 100),
                },
            },
        });
    } catch (error) {
        next(error);
    }
});

// Cover image upload
router.patch('/me/cover', authenticate, upload.single('coverImage'), async (req, res, next) => {
    try {
        const userId = req.user!.userId;
        const file = req.file;

        if (!file) {
            res.status(400).json({ success: false, error: { message: 'Cover image file is required' } });
            return;
        }

        // Upload to Cloudinary
        const uploadResult = await new Promise<any>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    resource_type: 'image',
                    folder: 'truevibe/covers',
                    transformation: [
                        { width: 1500, height: 500, crop: 'fill', gravity: 'auto' },
                        { quality: 'auto:good' }
                    ]
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            const readable = new Readable();
            readable.push(file.buffer);
            readable.push(null);
            readable.pipe(uploadStream);
        });

        // Update profile with cover image URL
        const profile = await Profile.findOneAndUpdate(
            { $or: [{ userId }, { supabaseId: userId }] },
            { coverImage: uploadResult.secure_url },
            { new: true }
        );

        if (!profile) {
            res.status(404).json({ success: false, error: { message: 'Profile not found' } });
            return;
        }

        res.json({
            success: true,
            data: { coverImage: uploadResult.secure_url, profile }
        });
    } catch (error) {
        next(error);
    }
});

// Export user data
router.get('/me/export', authenticate, async (req, res, next) => {
    try {
        const userId = req.user!.userId;

        // Fetch all user data in parallel
        const [profile, posts, shorts, aiReports] = await Promise.all([
            Profile.findOne({ $or: [{ userId }, { supabaseId: userId }] })
                .select('-__v')
                .lean(),
            Post.find({ author: userId })
                .select('content media viewsCount likesCount commentsCount sharesCount trustLevel createdAt')
                .populate('media', 'url type')
                .lean(),
            Short.find({ author: userId })
                .select('caption videoUrl thumbnailUrl viewsCount likesCount commentsCount trustLevel createdAt')
                .lean(),
            AIReport.find({ userId })
                .select('contentType report generatedAt')
                .lean(),
        ]);

        // Build export data
        const exportData = {
            exportedAt: new Date().toISOString(),
            profile: profile ? {
                name: profile.name,
                handle: profile.handle,
                bio: profile.bio,
                avatar: profile.avatar,
                location: profile.location,
                website: profile.website,
                isPrivate: profile.isPrivate,
                createdAt: profile.createdAt,
            } : null,
            statistics: {
                totalPosts: posts.length,
                totalShorts: shorts.length,
                totalAIReports: aiReports.length,
                followers: profile?.followersCount || 0,
                following: profile?.followingCount || 0,
            },
            posts: posts.map(post => ({
                content: post.content,
                media: (post.media as any[])?.map(m => ({ url: m.url, type: m.type })) || [],
                views: post.viewsCount || 0,
                likes: post.likesCount || 0,
                comments: post.commentsCount || 0,
                shares: post.sharesCount || 0,
                trustLevel: post.trustLevel,
                createdAt: post.createdAt,
            })),
            shorts: shorts.map(short => ({
                caption: short.caption,
                videoUrl: short.videoUrl,
                thumbnailUrl: short.thumbnailUrl,
                views: short.viewsCount || 0,
                likes: short.likesCount || 0,
                comments: short.commentsCount || 0,
                trustLevel: short.trustLevel,
                createdAt: short.createdAt,
            })),
            aiReports: aiReports.map(report => ({
                contentType: report.contentType || 'post',
                verdict: report.report?.verdict,
                confidence: report.report?.confidence,
                generatedAt: report.generatedAt,
            })),
        };

        res.json({
            success: true,
            data: exportData,
        });
    } catch (error) {
        next(error);
    }
});

// These routes have :id wildcard, so they must come LAST
router.get('/:id', optionalAuth, userController.getUserById);
router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);
router.delete('/:id/follow-request', authenticate, userController.cancelFollowRequest);
router.get('/:id/followers', optionalAuth, userController.getFollowers);
router.get('/:id/following', optionalAuth, userController.getFollowing);


export default router;
