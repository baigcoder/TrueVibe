/**
 * Security Configuration
 * Centralized security settings for TrueVibe
 */

import { config } from './index.js';

// Environment check
const isProd = config.env === 'production';

// CORS Configuration
export const corsConfig = {
    // Allowed origins - add your production domains
    allowedOrigins: isProd
        ? [
            process.env.FRONTEND_URL,
            process.env.MOBILE_APP_URL,
        ].filter((url): url is string => !!url)
        : [
            'http://localhost:5173',
            'http://localhost:3000',
            'http://localhost:8080',
        ],

    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-API-Key',
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
};

// Rate Limiting Configuration
export const rateLimits = {
    api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: isProd ? 200 : 500,   // Stricter in production
    },
    auth: {
        windowMs: 15 * 60 * 1000,
        max: isProd ? 30 : 100,
    },
    upload: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: isProd ? 30 : 50,
    },
    ai: {
        windowMs: 60 * 60 * 1000, // 1 hour
        max: isProd ? 20 : 50,     // AI analysis is resource-intensive
    },
};

// Token Configuration
export const tokenConfig = {
    accessTokenExpiry: '15m',
    refreshTokenExpiry: '7d',
    requireSecret: isProd, // Must have JWT secret in production
};

// AI Service Configuration
export const aiServiceConfig = {
    timeout: 30000, // 30 seconds
    maxRetries: 3,
    retryDelay: 1000, // 1 second base delay
    requireApiKey: isProd,
};

// Security Headers
export const securityHeaders = {
    contentTypeOptions: 'nosniff',
    frameOptions: 'DENY',
    xssProtection: '1; mode=block',
    referrerPolicy: 'strict-origin-when-cross-origin',
};

// Logging Configuration
export const loggingConfig = {
    enabled: !isProd,           // Silent in production
    sensitiveDataMask: true,    // Always mask sensitive data
    requestLogging: !isProd,    // Log requests only in development
};

// Combined export for convenience
export const securityConfig = {
    cors: corsConfig,
    rateLimits,
    token: tokenConfig,
    aiService: aiServiceConfig,
    headers: securityHeaders,
    logging: loggingConfig,
    isProd,
};

