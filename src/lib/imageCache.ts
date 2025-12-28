// Simple in-memory cache for avatar URLs to prevent repeated requests
const imageCache = new Map<string, { url: string; timestamp: number; failed: boolean }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const FAILED_CACHE_DURATION = 30 * 1000; // 30 seconds for failed requests

export function getCachedImageUrl(originalUrl: string): { url: string | null; shouldLoad: boolean } {
    if (!originalUrl) return { url: null, shouldLoad: false };

    const cached = imageCache.get(originalUrl);
    const now = Date.now();

    if (cached) {
        const maxAge = cached.failed ? FAILED_CACHE_DURATION : CACHE_DURATION;
        if (now - cached.timestamp < maxAge) {
            // Return cached result
            return { url: cached.failed ? null : cached.url, shouldLoad: false };
        }
    }

    // Need to load
    return { url: originalUrl, shouldLoad: true };
}

export function cacheImageUrl(originalUrl: string, success: boolean): void {
    if (!originalUrl) return;

    imageCache.set(originalUrl, {
        url: originalUrl,
        timestamp: Date.now(),
        failed: !success
    });
}

export function clearImageCache(): void {
    imageCache.clear();
}

// Cleanup old cache entries periodically
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of imageCache.entries()) {
        const maxAge = value.failed ? FAILED_CACHE_DURATION : CACHE_DURATION;
        if (now - value.timestamp > maxAge) {
            imageCache.delete(key);
        }
    }
}, 60 * 1000); // Run every minute
