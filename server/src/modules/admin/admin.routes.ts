import { Router } from 'express';
import * as adminController from './admin.controller.js';
import { authenticate, adminOnly } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, adminOnly);

// Reports
router.get('/reports', adminController.getReports);
router.put('/reports/:id', adminController.resolveReport);

// AI override
router.put('/ai-analysis/:id/override', adminController.overrideAIDecision);

// User management
router.put('/users/:id/suspend', adminController.suspendUser);
router.put('/users/:id/restore', adminController.restoreUser);

// Moderation queue
router.get('/moderation-queue', adminController.getModerationQueue);

// Stats
router.get('/stats', adminController.getAdminStats);

export default router;
