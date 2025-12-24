import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { corsConfig, securityHeaders, loggingConfig } from './config/security.config.js';
import { errorHandler, notFoundHandler } from './shared/middleware/error.middleware.js';
import { sanitize } from './shared/middleware/sanitize.middleware.js';
import { apiLimiter, authLimiter, uploadLimiter, aiLimiter } from './shared/middleware/rateLimit.middleware.js';
import { requestLogger, logger } from './shared/utils/logger.js';

// Import routes
import authRoutes from './modules/auth/auth.routes.js';
import userRoutes from './modules/users/user.routes.js';
import postRoutes from './modules/posts/post.routes.js';
import commentRoutes from './modules/comments/comment.routes.js';
import feedRoutes from './modules/feed/feed.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import mediaRoutes from './modules/posts/media.routes.js';
import storiesRoutes from './modules/stories/stories.routes.js';
import highlightsRoutes from './modules/stories/highlights.routes.js';
import shortsRoutes from './modules/shorts/shorts.routes.js';
import callsRoutes from './modules/calls/calls.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import pushTokenRoutes from './modules/notifications/pushToken.routes.js';
import searchRoutes from './modules/search/search.routes.js';
import voiceRoomRoutes from './modules/chat/voiceRoom.routes.js';
import spotifyRoutes from './modules/spotify/spotify.routes.js';
import gamificationRoutes from './modules/gamification/gamification.routes.js';
import groupCallRoutes from './modules/calls/groupCall.routes.js';
import audioRoutes from './modules/shorts/audio.routes.js';
import livestreamRoutes from './modules/streaming/livestream.routes.js';
import encryptionRoutes from './modules/encryption/encryption.routes.js';

export const createApp = (): Application => {
    const app = express();

    // Health check (no rate limiting, top priority for deployment health checks)
    app.get('/health', (req: Request, res: Response) => {
        if (loggingConfig.enabled) {
            console.log('💓 Healthcheck request received at:', new Date().toISOString());
        }
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            uptime: process.uptime(),
        });
    });

    // Security middleware with enhanced headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
        contentSecurityPolicy: false, // Configure separately if needed
        xContentTypeOptions: true,
        xFrameOptions: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));

    // Additional security headers
    app.use((req: Request, res: Response, next: NextFunction) => {
        res.setHeader('X-XSS-Protection', securityHeaders.xssProtection);
        next();
    });

    // CORS - strict origin validation
    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (mobile apps, curl, health checks)
            if (!origin) return callback(null, true);

            // Normalize origin (remove trailing slash)
            const normalizedOrigin = origin.replace(/\/$/, '');

            // Check if origin is in allowed list
            if (corsConfig.allowedOrigins.some(allowed =>
                normalizedOrigin === allowed || normalizedOrigin === allowed.replace(/\/$/, '')
            )) {
                return callback(null, origin);
            }

            // Log denied origins in development
            if (loggingConfig.enabled) {
                console.log(`CORS blocked origin: ${origin}`);
            }

            return callback(new Error('Not allowed by CORS'));
        },
        credentials: corsConfig.credentials,
        methods: corsConfig.methods,
        allowedHeaders: corsConfig.allowedHeaders,
        maxAge: corsConfig.maxAge,
    }));

    // Request logging with timing (development only)
    if (loggingConfig.requestLogging) {
        app.use(requestLogger);
    }

    // Body parsing
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    app.use(cookieParser());

    // Input sanitization (after body parsing, before routes)
    app.use(sanitize);



    // Apply rate limiters
    // Note: authLimiter removed from auth routes - sync endpoint requires JWT auth
    app.use('/api/v1/media', uploadLimiter);
    app.use('/api/v1', apiLimiter);

    // API routes
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/users', userRoutes);
    app.use('/api/v1/posts', postRoutes);
    app.use('/api/v1/comments', commentRoutes);
    app.use('/api/v1/feed', feedRoutes);
    app.use('/api/v1/chat', chatRoutes);
    app.use('/api/v1/analytics', analyticsRoutes);
    app.use('/api/v1/admin', adminRoutes);
    app.use('/api/v1/media', mediaRoutes);
    app.use('/api/v1/stories', storiesRoutes);
    app.use('/api/v1/highlights', highlightsRoutes);
    app.use('/api/v1/shorts', shortsRoutes);
    app.use('/api/v1/calls', callsRoutes);
    app.use('/api/v1/notifications', notificationRoutes);
    app.use('/api/v1/push-tokens', pushTokenRoutes);
    app.use('/api/v1/search', searchRoutes);
    app.use('/api/v1/voice-rooms', voiceRoomRoutes);
    app.use('/api/v1/spotify', spotifyRoutes);
    app.use('/api/v1/gamification', gamificationRoutes);
    app.use('/api/v1/group-calls', groupCallRoutes);
    app.use('/api/v1/audio', audioRoutes);
    app.use('/api/v1/livestream', livestreamRoutes);
    app.use('/api/v1/encryption', encryptionRoutes);

    // Error handling
    app.use(notFoundHandler);
    app.use(errorHandler);

    return app;
};
