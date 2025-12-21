import { Router } from 'express';
import * as analyticsController from './analytics.controller.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// User analytics
router.get('/overview', authenticate, analyticsController.getOverview);
router.get('/reach', authenticate, analyticsController.getReachMetrics);
router.get('/engagement', authenticate, analyticsController.getEngagementMetrics);
router.get('/trust', authenticate, analyticsController.getTrustMetrics);
router.get('/posts/:id', authenticate, analyticsController.getPostAnalytics);

export default router;
