import { Redis as UpstashRedis } from '@upstash/redis';
import { Redis as IORedis } from 'ioredis';
import { config } from './index.js';

// ============================================
// UPSTASH REDIS CLIENT (for caching & presence)
// ============================================
let upstashClient: UpstashRedis | null = null;

export const getUpstashClient = (): UpstashRedis => {
    if (!upstashClient) {
        upstashClient = new UpstashRedis({
            url: config.redis.upstash.url,
            token: config.redis.upstash.token,
        });
        console.log('✅ Upstash Redis client initialized');
    }
    return upstashClient;
};

// ============================================
// IOREDIS CLIENT (for BullMQ job queues)
// ============================================
let ioRedisClient: IORedis | null = null;

export const getIORedisClient = (): IORedis => {
    if (!ioRedisClient) {
        const redisUrl = config.redis.local.url;
        const isTLS = redisUrl.startsWith('rediss://');

        ioRedisClient = new IORedis(redisUrl, {
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

        ioRedisClient.on('connect', () => {
            console.log('✅ Redis (ioredis) connected for BullMQ');
        });

        ioRedisClient.on('error', (err) => {
            console.error('Redis connection error:', err.message);
        });
    }
    return ioRedisClient;
};

// Legacy alias for backwards compatibility
export const getRedisClient = getIORedisClient;

export const disconnectRedis = async (): Promise<void> => {
    if (ioRedisClient) {
        await ioRedisClient.quit();
        ioRedisClient = null;
        console.log('Local Redis disconnected');
    }
    upstashClient = null;
    console.log('Upstash client cleared');
};

// ============================================
// CACHING UTILITIES (using Upstash)
// ============================================
export const cacheGet = async <T>(key: string): Promise<T | null> => {
    const client = getUpstashClient();
    const data = await client.get<T>(key);
    return data ?? null;
};

export const cacheSet = async <T>(
    key: string,
    value: T,
    expiresInSeconds?: number
): Promise<void> => {
    const client = getUpstashClient();

    if (expiresInSeconds) {
        await client.setex(key, expiresInSeconds, JSON.stringify(value));
    } else {
        await client.set(key, JSON.stringify(value));
    }
};

export const cacheDelete = async (key: string): Promise<void> => {
    const client = getUpstashClient();
    await client.del(key);
};

export const cacheDeletePattern = async (pattern: string): Promise<void> => {
    const client = getUpstashClient();
    const keys = await client.keys(pattern);
    if (keys.length > 0) {
        await client.del(...keys);
    }
};

// ============================================
// PRESENCE UTILITIES (using Upstash)
// ============================================
export const setPresence = async (userId: string, status: 'online' | 'offline', ttlSeconds = 300): Promise<void> => {
    const client = getUpstashClient();
    await client.setex(`presence:${userId}`, ttlSeconds, status);
};

export const getPresence = async (userId: string): Promise<string | null> => {
    const client = getUpstashClient();
    return await client.get<string>(`presence:${userId}`);
};
