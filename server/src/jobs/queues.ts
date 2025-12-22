import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

// AI Analysis Queue
export const aiAnalysisQueue = new Queue('ai-analysis', {
    connection: getRedisClient(),
    skipVersionCheck: true, // Suppress eviction policy warnings
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: 100,
        removeOnFail: 1000,
    },
});

// Analytics Aggregation Queue
export const analyticsQueue = new Queue('analytics', {
    connection: getRedisClient(),
    skipVersionCheck: true,
    defaultJobOptions: {
        attempts: 2,
        removeOnComplete: 50,
    },
});

// Notification Queue
export const notificationQueue = new Queue('notifications', {
    connection: getRedisClient(),
    skipVersionCheck: true,
    defaultJobOptions: {
        attempts: 3,
        removeOnComplete: 100,
    },
});

// Helper to add AI analysis job
export const addAIAnalysisJob = async (data: {
    mediaId: string;
    postId: string;
}): Promise<void> => {
    await aiAnalysisQueue.add('analyze-media', data, {
        priority: 1,
    });
};

// Helper to add analytics job
export const addAnalyticsJob = async (data: {
    userId: string;
    type: 'daily' | 'weekly' | 'monthly';
}): Promise<void> => {
    await analyticsQueue.add('aggregate', data);
};

// Helper to add notification job
export const addNotificationJob = async (data: {
    userId: string;
    type: string;
    actorId?: string;
    resourceType?: string;
    resourceId?: string;
    message: string;
}): Promise<void> => {
    await notificationQueue.add('send', data);
};

console.log('✅ BullMQ queues initialized');
