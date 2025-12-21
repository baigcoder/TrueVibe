import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public code?: string;

    constructor(
        message: string,
        statusCode: number = 500,
        code?: string
    ) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public errors: Record<string, string[]>;

    constructor(errors: Record<string, string[]>) {
        super('Validation failed', 400, 'VALIDATION_ERROR');
        this.errors = errors;
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, 'FORBIDDEN');
    }
}

export class ConflictError extends AppError {
    constructor(message: string = 'Resource already exists') {
        super(message, 409, 'CONFLICT');
    }
}

export class RateLimitError extends AppError {
    constructor(message: string = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
    }
}

export const notFoundHandler = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    next(new NotFoundError(`Route ${req.method} ${req.path}`));
};

export const errorHandler = (
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    // Log error
    console.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Default error response
    let statusCode = 500;
    let response: Record<string, unknown> = {
        success: false,
        error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
        },
    };

    // Handle AppError
    if (err instanceof AppError) {
        statusCode = err.statusCode;
        response.error = {
            message: err.message,
            code: err.code,
        };

        // Include validation errors if present
        if (err instanceof ValidationError) {
            (response.error as Record<string, unknown>).details = err.errors;
        }
    }

    // Handle Mongoose validation errors
    if (err.name === 'ValidationError') {
        statusCode = 400;
        response.error = {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
        };
    }

    // Handle Mongoose CastError (invalid ObjectId)
    if (err.name === 'CastError') {
        statusCode = 400;
        response.error = {
            message: 'Invalid ID format',
            code: 'INVALID_ID',
        };
    }

    // Handle duplicate key errors
    if ((err as any).code === 11000) {
        statusCode = 409;
        response.error = {
            message: 'Duplicate entry',
            code: 'DUPLICATE_KEY',
        };
    }

    res.status(statusCode).json(response);
};
