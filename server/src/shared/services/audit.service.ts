/**
 * Audit Logger Service
 * Logs sensitive administrative actions for security compliance
 */

import mongoose, { Schema, Document } from 'mongoose';

// Audit action types
export type AuditAction =
    | 'ADMIN_LOGIN'
    | 'ADMIN_LOGOUT'
    | 'USER_SUSPENDED'
    | 'USER_UNSUSPENDED'
    | 'USER_BANNED'
    | 'USER_ROLE_CHANGED'
    | 'CONTENT_MODERATED'
    | 'CONTENT_DELETED'
    | 'AI_OVERRIDE'
    | 'REPORT_RESOLVED'
    | 'API_KEY_CREATED'
    | 'API_KEY_REVOKED'
    | 'CONFIG_CHANGED'
    | 'MASS_ACTION';

export interface IAuditLog extends Document {
    action: AuditAction;
    actorId: string;
    actorEmail: string;
    actorRole: string;
    targetType: 'user' | 'post' | 'comment' | 'report' | 'config' | 'api_key';
    targetId: string;
    details: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    status: 'success' | 'failure';
    errorMessage?: string;
    createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
    {
        action: {
            type: String,
            required: true,
            enum: [
                'ADMIN_LOGIN', 'ADMIN_LOGOUT', 'USER_SUSPENDED', 'USER_UNSUSPENDED',
                'USER_BANNED', 'USER_ROLE_CHANGED', 'CONTENT_MODERATED', 'CONTENT_DELETED',
                'AI_OVERRIDE', 'REPORT_RESOLVED', 'API_KEY_CREATED', 'API_KEY_REVOKED',
                'CONFIG_CHANGED', 'MASS_ACTION'
            ],
            index: true,
        },
        actorId: {
            type: String,
            required: true,
            index: true,
        },
        actorEmail: {
            type: String,
            required: true,
        },
        actorRole: {
            type: String,
            required: true,
        },
        targetType: {
            type: String,
            required: true,
            enum: ['user', 'post', 'comment', 'report', 'config', 'api_key'],
        },
        targetId: {
            type: String,
            required: true,
            index: true,
        },
        details: {
            type: Schema.Types.Mixed,
            default: {},
        },
        ipAddress: String,
        userAgent: String,
        status: {
            type: String,
            enum: ['success', 'failure'],
            default: 'success',
        },
        errorMessage: String,
    },
    {
        timestamps: { createdAt: true, updatedAt: false },
    }
);

// Index for efficient querying
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ actorId: 1, createdAt: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);

// Environment check
const isProd = process.env.NODE_ENV === 'production';

/**
 * Audit Logger utility class
 */
class AuditLoggerClass {
    /**
     * Log an administrative action
     */
    async log(params: {
        action: AuditAction;
        actorId: string;
        actorEmail: string;
        actorRole: string;
        targetType: IAuditLog['targetType'];
        targetId: string;
        details?: Record<string, unknown>;
        ipAddress?: string;
        userAgent?: string;
        status?: 'success' | 'failure';
        errorMessage?: string;
    }): Promise<IAuditLog | null> {
        try {
            const log = await AuditLog.create({
                action: params.action,
                actorId: params.actorId,
                actorEmail: params.actorEmail,
                actorRole: params.actorRole,
                targetType: params.targetType,
                targetId: params.targetId,
                details: params.details || {},
                ipAddress: params.ipAddress,
                userAgent: params.userAgent,
                status: params.status || 'success',
                errorMessage: params.errorMessage,
            });

            // In development, also log to console
            if (!isProd) {
                console.log(`[AUDIT] ${params.action} by ${params.actorEmail} on ${params.targetType}:${params.targetId}`);
            }

            return log;
        } catch (error) {
            // Don't throw - audit logging should not break operations
            console.error('[AUDIT] Failed to create audit log:', error);
            return null;
        }
    }

    /**
     * Query audit logs
     */
    async query(params: {
        action?: AuditAction;
        actorId?: string;
        targetId?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        skip?: number;
    }): Promise<IAuditLog[]> {
        const filter: Record<string, unknown> = {};

        if (params.action) filter.action = params.action;
        if (params.actorId) filter.actorId = params.actorId;
        if (params.targetId) filter.targetId = params.targetId;

        if (params.startDate || params.endDate) {
            filter.createdAt = {};
            if (params.startDate) (filter.createdAt as Record<string, Date>).$gte = params.startDate;
            if (params.endDate) (filter.createdAt as Record<string, Date>).$lte = params.endDate;
        }

        return AuditLog.find(filter)
            .sort({ createdAt: -1 })
            .limit(params.limit || 50)
            .skip(params.skip || 0)
            .exec();
    }
}

export const AuditLogger = new AuditLoggerClass();
