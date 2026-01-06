import { Router } from 'express';
import {
    createPost, getPost, updatePost, deletePost,
    likePost, unlikePost, savePost, unsavePost, repost,
    getAIAnalysis, getUserPosts, getLikedPosts, getTrendingHashtags, getHashtagPosts,
    votePoll, pinPost, unpinPost, createQuotePost,
    saveDraft, getDrafts, deleteDraft, publishDraft,
    getScheduledPosts, cancelScheduledPost,
    recordView, getPostAnalytics,
    generateReport, getReport, deleteReport, downloadPDFReport, emailPDFReport
} from './post.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { createPostSchema, updatePostSchema } from './post.schema.js';

const router = Router();

// Create post
router.post('/', authenticate, validateBody(createPostSchema), createPost);

// ============ SPECIFIC ROUTES MUST COME BEFORE /:id ============

// ============ DRAFTS ============
// Get drafts (must come before /:id)
router.get('/drafts', authenticate, getDrafts);
router.get('/drafts/list', authenticate, getDrafts);

// Save draft
router.post('/drafts/save', authenticate, saveDraft);

// Delete draft
router.delete('/drafts/:id', authenticate, deleteDraft);

// Publish draft
router.post('/drafts/:id/publish', authenticate, publishDraft);

// ============ SCHEDULING ============
// Get scheduled posts (must come before /:id)
router.get('/scheduled', authenticate, getScheduledPosts);
router.get('/scheduled/list', authenticate, getScheduledPosts);

// Cancel scheduled post
router.delete('/scheduled/:id', authenticate, cancelScheduledPost);

// ============ HASHTAGS ============
// Get trending hashtags
router.get('/hashtags/trending', optionalAuth, getTrendingHashtags);

// Get posts by hashtag
router.get('/hashtags/:hashtag', optionalAuth, getHashtagPosts);

// Get user posts
router.get('/user/:userId', optionalAuth, getUserPosts);

// Get user liked posts
router.get('/user/:userId/likes', optionalAuth, getLikedPosts);

// ============ NOW THE /:id ROUTES ============

// Get post
router.get('/:id', optionalAuth, getPost);

// Edit post
router.patch('/:id', authenticate, validateBody(updatePostSchema), updatePost);

// Delete post
router.delete('/:id', authenticate, deletePost);

// Like/unlike
router.post('/:id/like', authenticate, likePost);
router.delete('/:id/like', authenticate, unlikePost);

// Save/unsave
router.post('/:id/save', authenticate, savePost);
router.delete('/:id/save', authenticate, unsavePost);

// Repost
router.post('/:id/repost', authenticate, repost);

// Get AI analysis
router.get('/:id/ai-analysis', optionalAuth, getAIAnalysis);

// ============ POLLS ============
// Vote on poll
router.post('/:id/vote', authenticate, votePoll);

// ============ PIN POSTS ============
// Pin/unpin post to profile
router.post('/:id/pin', authenticate, pinPost);
router.delete('/:id/pin', authenticate, unpinPost);

// ============ QUOTE POSTS ============
// Create quote post
router.post('/:id/quote', authenticate, createQuotePost);

// ============ AI REPORTS ============
// Generate AI authenticity report (owner-only)
router.post('/:id/generate-report', authenticate, generateReport);

// Get AI report (owner-only)
router.get('/:id/report', authenticate, getReport);

// Delete AI report (owner-only)
router.delete('/:id/report', authenticate, deleteReport);

// Download PDF report with debug images (owner-only)
router.post('/:id/download-pdf-report', authenticate, downloadPDFReport);

// Email PDF report to admin (owner-only)
router.post('/:id/email-pdf-report', authenticate, emailPDFReport);

// Analytics
router.post('/:id/view', authenticate, recordView);
router.get('/:id/analytics', authenticate, getPostAnalytics);

export default router;
