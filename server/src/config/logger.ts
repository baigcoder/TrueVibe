/**
 * Structured Logger - Industry Standard Logging with Pino
 */

import pino from 'pino';
import { config } from './index.js';

// Create logger instance
export const logger = pino({
    level: process.env.LOG_LEVEL || (config.env === 'production' ? 'info' : 'debug'),
    transport: config.env !== 'production' ? {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    } : undefined,
    base: {
        env: config.env,
    },
    formatters: {
        level: (label) => ({ level: label }),
    },
});

// Request logger middleware
export const requestLogger = () => {
    return (req: any, res: any, next: () => void) => {
        const start = Date.now();
        const requestId = req.headers['x-request-id'] || crypto.randomUUID();

        // Attach request ID to request object
        req.requestId = requestId;

        // Log on response finish
        res.on('finish', () => {
            const duration = Date.now() - start;
            const logData = {
                requestId,
                method: req.method,
                url: req.originalUrl || req.url,
                statusCode: res.statusCode,
                duration: `${duration}ms`,
                userId: req.user?.userId,
            };

            if (res.statusCode >= 400) {
                logger.warn(logData, 'Request completed with error');
            } else {
                logger.info(logData, 'Request completed');
            }
        });

        next();
    };
};

// Utility log functions with context
export const logInfo = (message: string, context?: Record<string, unknown>) => {
    logger.info(context, message);
};

export const logWarn = (message: string, context?: Record<string, unknown>) => {
    logger.warn(context, message);
};

export const logError = (message: string, error?: Error, context?: Record<string, unknown>) => {
    logger.error({
        ...context,
        error: error ? {
            message: error.message,
            stack: error.stack,
            name: error.name,
        } : undefined,
    }, message);
};

export const logDebug = (message: string, context?: Record<string, unknown>) => {
    logger.debug(context, message);
};
