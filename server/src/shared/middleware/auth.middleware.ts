import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, TokenPayload } from '../../modules/auth/jwt.service.js';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';
import { config } from '../../config/index.js';
import { loggingConfig } from '../../config/security.config.js';
import { User } from '../../modules/users/User.model.js';

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
    exp?: number;
}

// Environment check
const isProd = config.env === 'production';

// Secure logging - only in development
const debugLog = (...args: unknown[]) => {
    if (loggingConfig.enabled) {
        console.log('[Auth]', ...args);
    }
};

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
            debugLog('Local verification successful');
            return next();
        } catch (localError) {
            // If local verification fails, try Supabase
            const supabaseSecret = config.supabase.jwtSecret;

            // In production, require Supabase secret - no fallback
            if (isProd && !supabaseSecret) {
                throw new UnauthorizedError('Server configuration error');
            }

            try {
                let payload: SupabasePayload;

                if (supabaseSecret) {
                    // Verify with JWT secret
                    payload = jwt.verify(token, supabaseSecret) as SupabasePayload;

                    // Check token expiry
                    if (payload.exp && payload.exp * 1000 < Date.now()) {
                        throw new UnauthorizedError('Token expired');
                    }

                    debugLog('Supabase verification successful');
                } else {
                    // Development only: decode without verification
                    if (isProd) {
                        throw new UnauthorizedError('Invalid token');
                    }
                    debugLog('Development mode - decoding without verification');
                    payload = jwt.decode(token) as SupabasePayload;
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
            } catch (supabaseError: unknown) {
                const errorMessage = supabaseError instanceof Error ? supabaseError.message : 'Unknown error';
                debugLog('Verification failed:', errorMessage);
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
                    let payload: SupabasePayload | null = null;
                    if (supabaseSecret) {
                        payload = jwt.verify(token, supabaseSecret) as SupabasePayload;
                    } else if (!isProd) {
                        // Development only
                        payload = jwt.decode(token) as SupabasePayload;
                    }

                    if (payload?.sub) {
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

// Admin-only middleware with database verification
export const adminOnly = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        if (!req.user) {
            next(new UnauthorizedError('Authentication required'));
            return;
        }

        // Verify admin role from database (not just JWT)
        const user = await User.findOne({
            $or: [
                { _id: req.user.userId },
                { email: req.user.email }
            ]
        });

        if (!user) {
            next(new UnauthorizedError('User not found'));
            return;
        }

        if (user.role !== 'admin') {
            debugLog(`Admin access denied for user: ${req.user.userId}`);
            next(new ForbiddenError('Admin access required'));
            return;
        }

        if (user.status !== 'active') {
            next(new ForbiddenError('Account is not active'));
            return;
        }

        debugLog(`Admin access granted for user: ${req.user.userId}`);
        next();
    } catch (error) {
        next(error);
    }
};

