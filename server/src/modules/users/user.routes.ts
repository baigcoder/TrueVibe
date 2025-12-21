import { Router } from 'express';
import * as userController from './user.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { updateProfileSchema, updateSettingsSchema } from './user.schema.js';

const router = Router();

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

// These routes have :id wildcard, so they must come LAST
router.get('/:id', optionalAuth, userController.getUserById);
router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);
router.delete('/:id/follow-request', authenticate, userController.cancelFollowRequest);
router.get('/:id/followers', optionalAuth, userController.getFollowers);
router.get('/:id/following', optionalAuth, userController.getFollowing);


export default router;
