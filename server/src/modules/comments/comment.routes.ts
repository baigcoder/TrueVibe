import { Router } from 'express';
import * as commentController from './comment.controller.js';
import { authenticate, optionalAuth } from '../../shared/middleware/auth.middleware.js';
import { validateBody } from '../../shared/middleware/validate.middleware.js';
import { createCommentSchema, updateCommentSchema } from './comment.schema.js';

const router = Router();

// Create comment
router.post('/', authenticate, validateBody(createCommentSchema), commentController.createComment);

// Get comments for post
router.get('/post/:postId', optionalAuth, commentController.getPostComments);

// Get comments for short
router.get('/short/:shortId', optionalAuth, commentController.getShortComments);

// Get replies
router.get('/:id/replies', optionalAuth, commentController.getReplies);

// Edit comment
router.patch('/:id', authenticate, validateBody(updateCommentSchema), commentController.updateComment);

// Delete comment
router.delete('/:id', authenticate, commentController.deleteComment);

// Like comment
router.post('/:id/like', authenticate, commentController.likeComment);
router.delete('/:id/like', authenticate, commentController.unlikeComment);

// Flag comment
router.post('/:id/flag', authenticate, commentController.flagComment);

export default router;
