import rateLimit from 'express-rate-limit';
import { config } from '../../config/index.js';
import { rateLimits } from '../../config/security.config.js';

// General API rate limiter
export const apiLimiter = rateLimit({
    windowMs: rateLimits.api.windowMs,
    max: rateLimits.api.max,
    message: {
        success: false,
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth-specific rate limiter
export const authLimiter = rateLimit({
    windowMs: rateLimits.auth.windowMs,
    max: rateLimits.auth.max,
    message: {
        success: false,
        error: {
            code: 'AUTH_RATE_LIMIT_EXCEEDED',
            message: 'Too many authentication attempts, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Upload rate limiter
export const uploadLimiter = rateLimit({
    windowMs: rateLimits.upload.windowMs,
    max: rateLimits.upload.max,
    message: {
        success: false,
        error: {
            code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
            message: 'Upload limit reached, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// AI Analysis rate limiter (resource-intensive operations)
export const aiLimiter = rateLimit({
    windowMs: rateLimits.ai.windowMs,
    max: rateLimits.ai.max,
    message: {
        success: false,
        error: {
            code: 'AI_RATE_LIMIT_EXCEEDED',
            message: 'Too many AI analysis requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
        // Rate limit by user ID if authenticated, otherwise by IP
        return req.user?.userId || req.ip || 'unknown';
    },
});

// Session management rate limiter (prevent session enumeration attacks)
export const sessionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 30, // 30 requests per 15 minutes
    message: {
        success: false,
        error: {
            code: 'SESSION_RATE_LIMIT_EXCEEDED',
            message: 'Too many session management requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});

// Block/unblock rate limiter (prevent abuse)
export const blockLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 block/unblock actions per hour
    message: {
        success: false,
        error: {
            code: 'BLOCK_RATE_LIMIT_EXCEEDED',
            message: 'Too many block/unblock actions, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});

// Scheduled posts rate limiter
export const scheduledPostsLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // 100 scheduling actions per hour
    message: {
        success: false,
        error: {
            code: 'SCHEDULE_RATE_LIMIT_EXCEEDED',
            message: 'Too many scheduling requests, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});

// Collection management rate limiter
export const collectionLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 60, // 60 collection operations per 15 minutes
    message: {
        success: false,
        error: {
            code: 'COLLECTION_RATE_LIMIT_EXCEEDED',
            message: 'Too many collection operations, please try again later',
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
});
