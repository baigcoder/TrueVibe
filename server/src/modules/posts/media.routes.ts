import { Router } from 'express';
import * as mediaController from './media.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';
import { uploadLimiter } from '../../shared/middleware/rateLimit.middleware.js';

const router = Router();

// Get signed upload URL
router.post('/upload-url', authenticate, uploadLimiter, mediaController.getUploadUrl);

// Confirm upload
router.post('/confirm', authenticate, mediaController.confirmUpload);

export default router;
