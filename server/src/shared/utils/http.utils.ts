/**
 * HTTP Request Utilities
 * Provides retry logic with exponential backoff and timeout handling
 */

import { securityConfig } from '../../config/security.config.js';

const isProd = process.env.NODE_ENV === 'production';

// Debug logging helper
function debugLog(...args: unknown[]): void {
    if (!isProd) {
        console.log('[HTTP]', ...args);
    }
}

interface RetryOptions {
    maxRetries?: number;
    baseDelay?: number;
    maxDelay?: number;
    timeout?: number;
    onRetry?: (error: Error, attempt: number) => void;
}

interface FetchWithRetryOptions extends RetryOptions {
    headers?: Record<string, string>;
    body?: string;
    method?: string;
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

/**
 * Fetch with retry and exponential backoff
 */
export async function fetchWithRetry(
    url: string,
    options: FetchWithRetryOptions = {}
): Promise<Response> {
    const {
        maxRetries = securityConfig.aiService.maxRetries,
        baseDelay = 1000,
        maxDelay = 10000,
        timeout = securityConfig.aiService.timeout,
        onRetry,
        ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            debugLog(`Attempt ${attempt + 1}/${maxRetries + 1} for ${url}`);

            const response = await fetchWithTimeout(url, fetchOptions, timeout);

            // Retry on 5xx errors (server errors) but not 4xx (client errors)
            if (response.status >= 500 && attempt < maxRetries) {
                const error = new Error(`Server error: ${response.status}`);
                lastError = error;

                if (onRetry) {
                    onRetry(error, attempt + 1);
                }

                const delay = calculateDelay(attempt, baseDelay, maxDelay);
                debugLog(`Retrying in ${delay}ms due to ${response.status}`);
                await sleep(delay);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Check if it's a timeout or network error (retryable)
            const isRetryable =
                lastError.name === 'AbortError' ||
                lastError.message.includes('ECONNREFUSED') ||
                lastError.message.includes('ETIMEDOUT') ||
                lastError.message.includes('ENOTFOUND') ||
                lastError.message.includes('fetch failed');

            if (!isRetryable || attempt >= maxRetries) {
                throw lastError;
            }

            if (onRetry) {
                onRetry(lastError, attempt + 1);
            }

            const delay = calculateDelay(attempt, baseDelay, maxDelay);
            debugLog(`Retrying in ${delay}ms due to error: ${lastError.message}`);
            await sleep(delay);
        }
    }

    throw lastError || new Error('Request failed after all retries');
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

const circuitBreakers: Map<string, CircuitBreakerState> = new Map();

/**
 * Circuit breaker wrapper for external service calls
 */
export async function withCircuitBreaker<T>(
    serviceKey: string,
    operation: () => Promise<T>,
    options: {
        failureThreshold?: number;
        resetTimeout?: number;
        onOpen?: () => void;
        onClose?: () => void;
    } = {}
): Promise<T> {
    const {
        failureThreshold = 5,
        resetTimeout = 30000,
        onOpen,
        onClose,
    } = options;

    let state = circuitBreakers.get(serviceKey);
    if (!state) {
        state = { failures: 0, lastFailure: 0, isOpen: false };
        circuitBreakers.set(serviceKey, state);
    }

    // Check if circuit is open
    if (state.isOpen) {
        const timeSinceFailure = Date.now() - state.lastFailure;
        if (timeSinceFailure < resetTimeout) {
            throw new Error(`Circuit breaker open for ${serviceKey}. Try again in ${Math.ceil((resetTimeout - timeSinceFailure) / 1000)}s`);
        }
        // Reset circuit for retry
        state.isOpen = false;
        state.failures = 0;
        if (onClose) onClose();
        debugLog(`Circuit breaker reset for ${serviceKey}`);
    }

    try {
        const result = await operation();
        // Reset on success
        state.failures = 0;
        return result;
    } catch (error) {
        state.failures++;
        state.lastFailure = Date.now();

        if (state.failures >= failureThreshold) {
            state.isOpen = true;
            if (onOpen) onOpen();
            debugLog(`Circuit breaker opened for ${serviceKey} after ${state.failures} failures`);
        }

        throw error;
    }
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    circuitBreakers.forEach((state, key) => {
        status[key] = { ...state };
    });
    return status;
}

/**
 * Reset a specific circuit breaker
 */
export function resetCircuitBreaker(serviceKey: string): void {
    circuitBreakers.delete(serviceKey);
}
