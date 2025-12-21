import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { requireAuth } from '../../shared/middleware/supabase.middleware.js';
import { authLimiter } from '../../shared/middleware/rateLimit.middleware.js';
import { syncProfileSchema } from './auth.schema.js';

const router = Router();

// Supabase handles login/register via frontend
// These routes are for profile sync with backend

// Profile sync endpoint - called when user signs in via Supabase
router.post(
    '/sync',
    requireAuth,
    validateBody(syncProfileSchema),
    authController.syncProfile
);

// Get current user profile
router.get('/me', requireAuth, authController.getCurrentUser);

export default router;
