import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),

    mongodb: {
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/truevibe',
    },

    redis: {
        upstash: {
            url: process.env.UPSTASH_REDIS_REST_URL || '',
            token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
        },
        local: {
            url: process.env.REDIS_URL || 'redis://localhost:6379',
        },
    },

    jwt: {
        accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },

    cloudinary: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'demo',
        apiKey: process.env.CLOUDINARY_API_KEY || 'demo',
        apiSecret: process.env.CLOUDINARY_API_SECRET || 'demo',
    },

    ai: {
        serviceUrl: process.env.AI_SERVICE_URL || 'mock',
        apiKey: process.env.AI_SERVICE_API_KEY || 'mock',
    },

    frontend: {
        url: process.env.FRONTEND_URL || 'http://localhost:5173',
    },

    cookie: {
        domain: process.env.COOKIE_DOMAIN || 'localhost',
        secure: process.env.COOKIE_SECURE === 'true',
    },

    supabase: {
        url: process.env.SUPABASE_URL || '',
        serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
        jwtSecret: process.env.SUPABASE_JWT_SECRET || '',
    },
} as const;

export type Config = typeof config;
