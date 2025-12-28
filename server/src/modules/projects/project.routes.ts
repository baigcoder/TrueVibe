import { Router } from 'express';
import * as projectController from './project.controller.js';
import { authenticate, adminOnly, optionalAuth } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Public routes (with optional auth to check admin status)
router.get('/', optionalAuth, projectController.getProjects);
router.get('/:id', optionalAuth, projectController.getProjectById);

// Admin-only routes
router.post('/', authenticate, adminOnly, projectController.createProject);
router.put('/:id', authenticate, adminOnly, projectController.updateProject);
router.delete('/:id', authenticate, adminOnly, projectController.deleteProject);
router.post('/reorder', authenticate, adminOnly, projectController.reorderProjects);

export default router;
