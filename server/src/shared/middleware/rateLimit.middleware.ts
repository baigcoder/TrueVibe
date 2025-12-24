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

