import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, TokenPayload } from '../../modules/auth/jwt.service.js';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';
import { config } from '../../config/index.js';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: TokenPayload;
        }
    }
}

interface SupabasePayload {
    sub: string;
    email?: string;
    role?: string;
}

// Authentication middleware
export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        // Try to get token from cookie first, then Authorization header
        let token = req.cookies.accessToken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (!token) {
            throw new UnauthorizedError('Authentication required');
        }

        // Try verifying with local secret first
        try {
            const payload = verifyAccessToken(token);
            req.user = payload;
            return next();
        } catch (localError) {
            // If local verification fails, try Supabase
            const supabaseSecret = config.supabase.jwtSecret;
            console.log('[Auth Debug] Local verification failed, trying Supabase. Secret configured:', !!supabaseSecret);

            try {
                let payload: any;
                if (supabaseSecret) {
                    payload = jwt.verify(token, supabaseSecret);
                    console.log('[Auth Debug] Supabase verification successful');
                } else {
                    console.log('[Auth Debug] No Supabase secret, decoding without verification');
                    payload = jwt.decode(token);
                }

                if (!payload || !payload.sub) {
                    throw new Error('Invalid Supabase token');
                }

                // Map Supabase payload to TokenPayload
                req.user = {
                    userId: payload.sub,
                    email: payload.email || '',
                    role: payload.role || 'user',
                };
                return next();
            } catch (supabaseError: any) {
                console.error('[Auth Debug] Supabase verification failed:', supabaseError.message);
                throw new UnauthorizedError('Invalid or expired token');
            }
        }
    } catch (error) {
        if (error instanceof UnauthorizedError) {
            next(error);
        } else {
            next(new UnauthorizedError('Invalid or expired token'));
        }
    }
};

// Optional authentication (doesn't fail if no token)
export const optionalAuth = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        let token = req.cookies.accessToken;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith('Bearer ')) {
                token = authHeader.substring(7);
            }
        }

        if (token) {
            // Try local first
            try {
                const payload = verifyAccessToken(token);
                req.user = payload;
            } catch {
                // Try Supabase
                const supabaseSecret = config.supabase.jwtSecret;
                try {
                    let payload: any;
                    if (supabaseSecret) {
                        payload = jwt.verify(token, supabaseSecret);
                    } else {
                        payload = jwt.decode(token);
                    }

                    if (payload && payload.sub) {
                        req.user = {
                            userId: payload.sub,
                            email: payload.email || '',
                            role: payload.role || 'user',
                        };
                    }
                } catch {
                    // Ignore errors for optional auth
                }
            }
        }
        next();
    } catch {
        // Continue without authentication
        next();
    }
};

// Role-based authorization
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new UnauthorizedError('Authentication required'));
            return;
        }

        if (!roles.includes(req.user.role)) {
            next(new ForbiddenError('Insufficient permissions'));
            return;
        }

        next();
    };
};

// Admin-only middleware
export const adminOnly = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    if (!req.user) {
        next(new UnauthorizedError('Authentication required'));
        return;
    }

    if (req.user.role !== 'admin') {
        next(new ForbiddenError('Admin access required'));
        return;
    }

    next();
};
