/**
 * Supabase Authentication Middleware
 * Verifies Supabase JWT tokens and extracts user info
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { loggingConfig } from '../../config/security.config.js';
import { User } from '../../modules/users/User.model.js';

// Supabase config
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';
const isProd = config.env === 'production';

// Secure logging - only in development
const debugLog = (...args: unknown[]) => {
    if (loggingConfig.enabled) {
        console.log('[Supabase Auth]', ...args);
    }
};

// Extend Express Request type for auth
declare global {
    namespace Express {
        interface Request {
            auth?: {
                userId: string;
                email?: string;
            };
        }
    }
}

interface JWTPayload {
    sub: string;
    email?: string;
    aud: string;
    exp: number;
    iat: number;
}

/**
 * Middleware that requires authentication
 * Use this for protected routes
 */
export const requireAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }

        const token = authHeader.replace('Bearer ', '');
        let payload: JWTPayload;

        // In production, JWT secret is required
        if (isProd && !SUPABASE_JWT_SECRET) {
            debugLog('CRITICAL: No JWT secret configured in production');
            res.status(500).json({
                success: false,
                error: {
                    code: 'SERVER_ERROR',
                    message: 'Server configuration error',
                },
            });
            return;
        }

        if (SUPABASE_JWT_SECRET) {
            // Verify with JWT secret
            try {
                payload = jwt.verify(token, SUPABASE_JWT_SECRET) as JWTPayload;
                debugLog('Token verified successfully');
            } catch (verifyError: unknown) {
                const errorMessage = verifyError instanceof Error ? verifyError.message : 'Unknown error';
                debugLog('Verification failed:', errorMessage);
                throw verifyError;
            }
        } else {
            // Development only: decode without verification
            if (isProd) {
                res.status(401).json({
                    success: false,
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'Invalid token',
                    },
                });
                return;
            }
            debugLog('Development mode - decoding without verification');
            const decoded = jwt.decode(token);
            if (!decoded || typeof decoded === 'string') {
                throw new Error('Invalid token format');
            }
            payload = decoded as JWTPayload;
        }

        // Validate token expiry
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Token expired',
                },
            });
            return;
        }

        if (!payload.sub) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Invalid token',
                },
            });
            return;
        }

        // Attach auth info to request
        req.auth = {
            userId: payload.sub,
            email: payload.email,
        };

        // Also set req.user for backward compatibility with controllers
        req.user = {
            userId: payload.sub,
            email: payload.email || '',
            role: 'user',
        };

        debugLog('Auth successful, userId:', payload.sub);
        next();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        debugLog('Auth error:', errorMessage);
        res.status(401).json({
            success: false,
            error: {
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired token',
            },
        });
    }
};

/**
 * Middleware that optionally adds auth info
 * Use this for routes that work with or without auth
 */
export const optionalAuth = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '');

            let payload: JWTPayload | null = null;

            if (SUPABASE_JWT_SECRET) {
                try {
                    payload = jwt.verify(token, SUPABASE_JWT_SECRET) as JWTPayload;
                } catch {
                    // Invalid token, continue without auth
                }
            } else if (!isProd) {
                // Development only
                payload = jwt.decode(token) as JWTPayload;
            }

            if (payload?.sub) {
                req.auth = {
                    userId: payload.sub,
                    email: payload.email,
                };
                // Also set req.user for backward compatibility
                req.user = {
                    userId: payload.sub,
                    email: payload.email || '',
                    role: 'user',
                };
            }
        }

        next();
    } catch {
        // Continue without authentication
        next();
    }
};

/**
 * Admin-only middleware with database verification
 */
export const adminOnly = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.auth?.userId) {
            res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'Authentication required',
                },
            });
            return;
        }

        // Verify admin role from database
        const user = await User.findOne({
            $or: [
                { _id: req.auth.userId },
                { email: req.auth.email }
            ]
        });

        if (!user || user.role !== 'admin') {
            debugLog(`Admin access denied for user: ${req.auth.userId}`);
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Admin access required',
                },
            });
            return;
        }

        if (user.status !== 'active') {
            res.status(403).json({
                success: false,
                error: {
                    code: 'FORBIDDEN',
                    message: 'Account is not active',
                },
            });
            return;
        }

        debugLog(`Admin access granted for user: ${req.auth.userId}`);
        next();
    } catch (error) {
        next(error);
    }
};
