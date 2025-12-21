import winston from 'winston';
import { config } from '../../config/index.js';

// Define log formats
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
        return `${timestamp} ${level}: ${message} ${metaStr}`;
    })
);

// Create transports based on environment
const transports: winston.transport[] = [];

// Console transport (always enabled in dev)
if (config.env !== 'production') {
    transports.push(
        new winston.transports.Console({
            format: consoleFormat,
            level: 'debug',
        })
    );
}

// Production console (JSON format)
if (config.env === 'production') {
    transports.push(
        new winston.transports.Console({
            format: logFormat,
            level: 'info',
        })
    );
}

// Create logger instance
export const logger = winston.createLogger({
    level: config.env === 'production' ? 'info' : 'debug',
    format: logFormat,
    defaultMeta: { service: 'truevibe-api' },
    transports,
    exceptionHandlers: [
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ],
    rejectionHandlers: [
        new winston.transports.Console({
            format: consoleFormat,
        }),
    ],
});

// Request logger middleware
import { Request, Response, NextFunction } from 'express';

interface RequestLog {
    method: string;
    path: string;
    query?: Record<string, unknown>;
    userId?: string;
    ip: string;
    userAgent?: string;
    duration?: number;
    statusCode?: number;
    error?: string;
}

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const start = Date.now();

    // Log request start
    const requestLog: RequestLog = {
        method: req.method,
        path: req.path,
        query: Object.keys(req.query).length ? req.query as Record<string, unknown> : undefined,
        userId: req.user?.userId,
        ip: req.ip || req.socket.remoteAddress || 'unknown',
        userAgent: req.get('user-agent'),
    };

    logger.debug('Request started', requestLog);

    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

        logger.log(level, 'Request completed', {
            ...requestLog,
            duration,
            statusCode: res.statusCode,
        });

        // Log slow requests
        if (duration > 1000) {
            logger.warn('Slow request detected', {
                path: req.path,
                method: req.method,
                duration,
                threshold: 1000,
            });
        }
    });

    next();
};

// Utility logging functions
export const logInfo = (message: string, meta?: Record<string, unknown>): void => {
    logger.info(message, meta);
};

export const logError = (message: string, error?: Error | unknown, meta?: Record<string, unknown>): void => {
    logger.error(message, {
        ...meta,
        error: error instanceof Error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
        } : error,
    });
};

export const logWarn = (message: string, meta?: Record<string, unknown>): void => {
    logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: Record<string, unknown>): void => {
    logger.debug(message, meta);
};

// Log database operations
export const logDb = (operation: string, collection: string, duration: number, meta?: Record<string, unknown>): void => {
    const level = duration > 100 ? 'warn' : 'debug';
    logger.log(level, `DB ${operation}`, {
        collection,
        duration,
        ...meta,
        slow: duration > 100,
    });
};

// Log Socket.IO events
export const logSocket = (event: string, userId?: string, meta?: Record<string, unknown>): void => {
    logger.debug(`Socket ${event}`, {
        userId,
        ...meta,
    });
};

// Log authentication events
export const logAuth = (event: string, userId?: string, success: boolean = true, meta?: Record<string, unknown>): void => {
    const level = success ? 'info' : 'warn';
    logger.log(level, `Auth ${event}`, {
        userId,
        success,
        ...meta,
    });
};
