import { getRedisClient } from '../../config/redis.js';

/**
 * Cache Service for Redis-based caching
 * Provides utility functions for caching with automatic serialization
 */

// Default TTL values (in seconds)
export const CACHE_TTL = {
    SHORT: 60,           // 1 minute
    MEDIUM: 300,         // 5 minutes
    LONG: 600,           // 10 minutes
    HOUR: 3600,          // 1 hour
    DAY: 86400,          // 24 hours
};

// Cache key prefixes for organization
export const CACHE_KEYS = {
    FEED: 'feed',
    PROFILE: 'profile',
    SERVER: 'server',
    CHANNEL: 'channel',
    TRENDING: 'trending',
    SEARCH: 'search',
};

/**
 * Get a value from cache
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const redis = getRedisClient();
        const value = await redis.get(key);
        if (value) {
            try {
                return JSON.parse(value) as T;
            } catch {
                return value as unknown as T;
            }
        }
        return null;
    } catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}

/**
 * Set a value in cache with TTL
 */
export async function cacheSet(
    key: string,
    value: unknown,
    ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<boolean> {
    try {
        const redis = getRedisClient();
        await redis.setex(key, ttlSeconds, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Cache set error:', error);
        return false;
    }
}

/**
 * Delete a value from cache
 */
export async function cacheDelete(key: string): Promise<boolean> {
    try {
        const redis = getRedisClient();
        await redis.del(key);
        return true;
    } catch (error) {
        console.error('Cache delete error:', error);
        return false;
    }
}

/**
 * Delete all keys matching a pattern
 */
export async function cacheDeletePattern(pattern: string): Promise<boolean> {
    try {
        const redis = getRedisClient();
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
            await Promise.all(keys.map((key: string) => redis.del(key)));
        }
        return true;
    } catch (error) {
        console.error('Cache delete pattern error:', error);
        return false;
    }
}

/**
 * Get or set cache with callback
 * If cache exists, return it; otherwise call callback, cache result, and return
 */
export async function cacheGetOrSet<T>(
    key: string,
    callback: () => Promise<T>,
    ttlSeconds: number = CACHE_TTL.MEDIUM
): Promise<T> {
    // Try to get from cache first
    const cached = await cacheGet<T>(key);
    if (cached !== null) {
        return cached;
    }

    // Not in cache, call callback
    const value = await callback();

    // Cache the result
    await cacheSet(key, value, ttlSeconds);

    return value;
}

/**
 * Build cache key from parts
 */
export function buildCacheKey(...parts: (string | number)[]): string {
    return parts.join(':');
}

/**
 * Cache key builders for common patterns
 */
export const cacheKeys = {
    feed: (type: string, cursor?: string) =>
        buildCacheKey(CACHE_KEYS.FEED, type, cursor || 'initial'),

    profile: (userId: string) =>
        buildCacheKey(CACHE_KEYS.PROFILE, userId),

    server: (serverId: string) =>
        buildCacheKey(CACHE_KEYS.SERVER, serverId),

    serverList: (userId: string) =>
        buildCacheKey(CACHE_KEYS.SERVER, 'list', userId),

    channels: (serverId: string) =>
        buildCacheKey(CACHE_KEYS.CHANNEL, serverId),

    trending: (period: string = '24h') =>
        buildCacheKey(CACHE_KEYS.TRENDING, period),

    search: (query: string, type: string) =>
        buildCacheKey(CACHE_KEYS.SEARCH, type, query.slice(0, 50)),
};

/**
 * Invalidation helpers
 */
export const invalidateCache = {
    profile: async (userId: string) => {
        await cacheDelete(cacheKeys.profile(userId));
    },

    server: async (serverId: string) => {
        await cacheDelete(cacheKeys.server(serverId));
        await cacheDeletePattern(`${CACHE_KEYS.SERVER}:list:*`);
    },

    channels: async (serverId: string) => {
        await cacheDelete(cacheKeys.channels(serverId));
    },

    feed: async () => {
        await cacheDeletePattern(`${CACHE_KEYS.FEED}:*`);
    },

    trending: async () => {
        await cacheDeletePattern(`${CACHE_KEYS.TRENDING}:*`);
    },
};
