import jwt from 'jsonwebtoken';
import { config } from '../../config/index.js';
import { IUser } from '../users/User.model.js';

export interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
}

export const generateAccessToken = (user: IUser): string => {
    const payload: TokenPayload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
        expiresIn: config.jwt.accessExpiresIn,
    } as jwt.SignOptions);
};

export const generateRefreshToken = (user: IUser): string => {
    const payload = {
        userId: user._id.toString(),
        type: 'refresh',
    };

    return jwt.sign(payload, config.jwt.refreshSecret, {
        expiresIn: config.jwt.refreshExpiresIn,
    } as jwt.SignOptions);
};

export const generateTokenPair = (user: IUser): TokenPair => {
    return {
        accessToken: generateAccessToken(user),
        refreshToken: generateRefreshToken(user),
    };
};

export const verifyAccessToken = (token: string): TokenPayload => {
    return jwt.verify(token, config.jwt.accessSecret) as TokenPayload;
};

export const verifyRefreshToken = (token: string): { userId: string; type: string } => {
    return jwt.verify(token, config.jwt.refreshSecret) as { userId: string; type: string };
};

export const decodeToken = (token: string): TokenPayload | null => {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch {
        return null;
    }
};

// Calculate expiry date for refresh token storage
export const getRefreshTokenExpiry = (): Date => {
    const expiresIn = config.jwt.refreshExpiresIn;
    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
        return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }

    const [, value, unit] = match;
    const num = parseInt(value, 10);

    const multipliers: Record<string, number> = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + num * multipliers[unit]);
};
