import { Router } from 'express';
import * as feedController from './feed.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Main feed
router.get('/', optionalAuth, feedController.getMainFeed);

// Following feed
router.get('/following', authenticate, feedController.getFollowingFeed);

// Trending
router.get('/trending', optionalAuth, feedController.getTrendingPosts);

// Trust watch (suspicious content)
router.get('/trust-watch', optionalAuth, feedController.getTrustWatch);

export default router;
