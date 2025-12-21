/**
 * Standardized API Response Utilities
 * Industry standard response format
 */

import { Response } from 'express';

interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

interface SuccessResponse<T> {
    success: true;
    data: T;
    meta?: Partial<PaginationMeta>;
    message?: string;
}

interface ErrorResponse {
    success: false;
    error: {
        code: string;
        message: string;
        details?: Record<string, string[]>;
    };
    requestId?: string;
}

/**
 * Send a success response
 */
export const sendSuccess = <T>(
    res: Response,
    data: T,
    statusCode: number = 200,
    meta?: Partial<PaginationMeta>,
    message?: string
): Response => {
    const response: SuccessResponse<T> = {
        success: true,
        data,
    };

    if (meta) {
        response.meta = meta;
    }

    if (message) {
        response.message = message;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send a created response (201)
 */
export const sendCreated = <T>(
    res: Response,
    data: T,
    message?: string
): Response => {
    return sendSuccess(res, data, 201, undefined, message);
};

/**
 * Send a paginated response
 */
export const sendPaginated = <T>(
    res: Response,
    data: T[],
    page: number,
    limit: number,
    total: number
): Response => {
    const totalPages = Math.ceil(total / limit);

    return sendSuccess(res, data, 200, {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
    });
};

/**
 * Send an error response
 */
export const sendError = (
    res: Response,
    statusCode: number,
    code: string,
    message: string,
    details?: Record<string, string[]>,
    requestId?: string
): Response => {
    const response: ErrorResponse = {
        success: false,
        error: {
            code,
            message,
        },
    };

    if (details) {
        response.error.details = details;
    }

    if (requestId) {
        response.requestId = requestId;
    }

    return res.status(statusCode).json(response);
};

/**
 * Send a not found response
 */
export const sendNotFound = (
    res: Response,
    resource: string = 'Resource'
): Response => {
    return sendError(res, 404, 'NOT_FOUND', `${resource} not found`);
};

/**
 * Send an unauthorized response
 */
export const sendUnauthorized = (
    res: Response,
    message: string = 'Unauthorized'
): Response => {
    return sendError(res, 401, 'UNAUTHORIZED', message);
};

/**
 * Send a forbidden response
 */
export const sendForbidden = (
    res: Response,
    message: string = 'Access denied'
): Response => {
    return sendError(res, 403, 'FORBIDDEN', message);
};

/**
 * Send a validation error response
 */
export const sendValidationError = (
    res: Response,
    details: Record<string, string[]>
): Response => {
    return sendError(res, 400, 'VALIDATION_ERROR', 'Validation failed', details);
};

/**
 * Send a no content response (204)
 */
export const sendNoContent = (res: Response): Response => {
    return res.status(204).send();
};
