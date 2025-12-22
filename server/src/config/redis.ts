import { Redis as IORedis } from 'ioredis';
import { config } from './index.js';

// ============================================
// REDIS CLIENT (for caching, presence & BullMQ)
// ============================================
let redisClient: IORedis | null = null;

export const getRedisClient = (): IORedis => {
    if (!redisClient) {
        const redisUrl = config.redis.url;
        const isTLS = redisUrl.startsWith('rediss://');

        redisClient = new IORedis(redisUrl, {
            maxRetriesPerRequest: null, // Required for BullMQ
            enableReadyCheck: false,
            tls: isTLS ? { rejectUnauthorized: false } : undefined,
            retryStrategy: (times) => {
                if (times > 3) {
                    console.error('Redis connection failed after 3 retries');
                    return null;
                }
                return Math.min(times * 200, 1000);
            },
        });

        redisClient.on('connect', () => {
            console.log('✅ Redis connected');
        });

        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });
    }
    return redisClient;
};

// Legacy alias for backwards compatibility
export const getIORedisClient = getRedisClient;

export const disconnectRedis = async (): Promise<void> => {
    if (redisClient) {
        await redisClient.quit();
        redisClient = null;
        console.log('Redis disconnected');
    }
};

// ============================================
// CACHING UTILITIES
// ============================================
export const cacheGet = async <T>(key: string): Promise<T | null> => {
    const client = getRedisClient();
    const data = await client.get(key);
    if (data) {
        try {
            return JSON.parse(data) as T;
        } catch {
            return data as unknown as T;
        }
    }
    return null;
};

export const cacheSet = async <T>(
    key: string,
    value: T,
    expiresInSeconds?: number
): Promise<void> => {
    const client = getRedisClient();

    if (expiresInSeconds) {
        await client.setex(key, expiresInSeconds, JSON.stringify(value));
    } else {
        await client.set(key, JSON.stringify(value));
    }
};

export const cacheDelete = async (key: string): Promise<void> => {
    const client = getRedisClient();
    await client.del(key);
};

export const cacheDeletePattern = async (pattern: string): Promise<void> => {
    const client = getRedisClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
        await client.del(...keys);
    }
};

// ============================================
// PRESENCE UTILITIES
// ============================================
export const setPresence = async (userId: string, status: 'online' | 'offline', ttlSeconds = 300): Promise<void> => {
    const client = getRedisClient();
    await client.setex(`presence:${userId}`, ttlSeconds, status);
};

export const getPresence = async (userId: string): Promise<string | null> => {
    const client = getRedisClient();
    return await client.get(`presence:${userId}`);
};
