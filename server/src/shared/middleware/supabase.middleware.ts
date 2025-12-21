/**
 * Supabase Authentication Middleware
 * Verifies Supabase JWT tokens and extracts user info
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Supabase config
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET || '';

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

        // Verify JWT token
        let payload: JWTPayload;

        console.log('[Auth Debug] JWT Secret configured:', !!SUPABASE_JWT_SECRET, 'Token length:', token.length);

        if (SUPABASE_JWT_SECRET) {
            // Verify with JWT secret
            try {
                payload = jwt.verify(token, SUPABASE_JWT_SECRET) as JWTPayload;
                console.log('[Auth Debug] Verified with secret, sub:', payload.sub);
            } catch (verifyError: any) {
                console.error('[Auth Debug] Verification failed:', verifyError.message);
                throw verifyError;
            }
        } else {
            // Fallback: decode without verification (for development)
            console.log('[Auth Debug] No secret, using decode fallback');
            const decoded = jwt.decode(token);
            console.log('[Auth Debug] Decoded token:', decoded ? 'Success' : 'Failed');
            if (!decoded || typeof decoded === 'string') {
                throw new Error('Invalid token format');
            }
            payload = decoded as JWTPayload;
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

        console.log('[Auth Debug] Auth successful, userId:', payload.sub);
        next();
    } catch (error: any) {
        console.error('[Auth Debug] Supabase auth error:', error.message);
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
            } else {
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
 * Admin-only middleware (basic implementation)
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

        // For now, deny all admin access until properly configured
        res.status(403).json({
            success: false,
            error: {
                code: 'FORBIDDEN',
                message: 'Admin access required',
            },
        });
        return;
    } catch (error) {
        next(error);
    }
};
