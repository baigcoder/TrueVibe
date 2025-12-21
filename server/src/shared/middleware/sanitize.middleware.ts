/**
 * Input Sanitization Middleware
 * Prevents XSS attacks and MongoDB injection
 */

import { Request, Response, NextFunction } from 'express';

// Characters that could be used for XSS
const XSS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
];

// MongoDB operators that should be blocked in user input
const MONGO_OPERATORS = ['$where', '$regex', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$or', '$and'];

/**
 * Sanitize a string value by removing dangerous patterns
 */
const sanitizeString = (value: string): string => {
    let sanitized = value;

    // Remove HTML script tags and event handlers
    for (const pattern of XSS_PATTERNS) {
        sanitized = sanitized.replace(pattern, '');
    }

    // Escape HTML entities
    sanitized = sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    return sanitized;
};

/**
 * Check if object contains MongoDB operators
 */
const containsMongoOperators = (obj: unknown): boolean => {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }

    for (const key of Object.keys(obj as Record<string, unknown>)) {
        if (MONGO_OPERATORS.includes(key)) {
            return true;
        }
        if (containsMongoOperators((obj as Record<string, unknown>)[key])) {
            return true;
        }
    }

    return false;
};

/**
 * Recursively sanitize an object
 */
const sanitizeObject = (obj: unknown, depth: number = 0): unknown => {
    // Prevent deep recursion attacks
    if (depth > 10) {
        return {};
    }

    if (typeof obj === 'string') {
        return sanitizeString(obj);
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => sanitizeObject(item, depth + 1));
    }

    if (typeof obj === 'object' && obj !== null) {
        const sanitized: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            // Skip keys that look like MongoDB operators
            if (key.startsWith('$')) {
                continue;
            }
            sanitized[key] = sanitizeObject(value, depth + 1);
        }
        return sanitized;
    }

    return obj;
};

/**
 * Middleware to sanitize request body
 */
export const sanitizeBody = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.body && typeof req.body === 'object') {
        // Check for MongoDB injection attempts
        if (containsMongoOperators(req.body)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid input detected',
                },
            });
            return;
        }

        // Sanitize the body
        req.body = sanitizeObject(req.body);
    }
    next();
};

/**
 * Middleware to sanitize query parameters
 */
export const sanitizeQuery = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (req.query && typeof req.query === 'object') {
        // Check for MongoDB injection in query params
        if (containsMongoOperators(req.query)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid query parameters',
                },
            });
            return;
        }

        req.query = sanitizeObject(req.query) as typeof req.query;
    }
    next();
};

/**
 * Combined sanitization middleware
 */
export const sanitize = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Sanitize body
    if (req.body && typeof req.body === 'object') {
        if (containsMongoOperators(req.body)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid input detected',
                },
            });
            return;
        }
        req.body = sanitizeObject(req.body);
    }

    // Sanitize query
    if (req.query && typeof req.query === 'object') {
        if (containsMongoOperators(req.query)) {
            res.status(400).json({
                success: false,
                error: {
                    code: 'INVALID_INPUT',
                    message: 'Invalid query parameters',
                },
            });
            return;
        }
        req.query = sanitizeObject(req.query) as typeof req.query;
    }

    next();
};
