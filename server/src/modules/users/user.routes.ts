import { Router } from 'express';
import multer from 'multer';
import { Readable } from 'stream';
import { v2 as cloudinary } from 'cloudinary';
import * as userController from './user.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { updateProfileSchema, updateSettingsSchema } from './user.schema.js';
import { Profile } from './Profile.model.js';

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

// These routes have :id wildcard, so they must come LAST
router.get('/:id', optionalAuth, userController.getUserById);
router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);
router.delete('/:id/follow-request', authenticate, userController.cancelFollowRequest);
router.get('/:id/followers', optionalAuth, userController.getFollowers);
router.get('/:id/following', optionalAuth, userController.getFollowing);


export default router;
