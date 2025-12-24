import { Queue, QueueEvents } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

const isProd = process.env.NODE_ENV === 'production';

// ============================================
// AI ANALYSIS QUEUE - Enhanced for Multi-User
// ============================================
export const aiAnalysisQueue = new Queue('ai-analysis', {
    connection: getRedisClient(),
    skipVersionCheck: true,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2s delay
        },
        removeOnComplete: 50,  // Keep fewer completed jobs
        removeOnFail: 100,
    },
});

// Queue event listeners for debugging (only in non-production to reduce connections)
if (!isProd) {
    try {
        const aiQueueEvents = new QueueEvents('ai-analysis', {
            connection: getRedisClient(),
        });

        aiQueueEvents.on('waiting', ({ jobId }) => {
            console.log(`[Queue] AI job ${jobId} waiting...`);
        });

        aiQueueEvents.on('active', ({ jobId }) => {
            console.log(`[Queue] AI job ${jobId} started processing`);
        });

        aiQueueEvents.on('completed', ({ jobId }) => {
            console.log(`[Queue] AI job ${jobId} completed ✅`);
        });

        aiQueueEvents.on('failed', ({ jobId, failedReason }) => {
            console.error(`[Queue] AI job ${jobId} failed: ${failedReason}`);
        });
    } catch (err) {
        console.warn('QueueEvents initialization skipped:', err);
    }
}

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

// Helper to add AI analysis job with confirmation
export const addAIAnalysisJob = async (data: {
    mediaId: string;
    postId: string;
}): Promise<string> => {
    const job = await aiAnalysisQueue.add('analyze-media', data, {
        priority: 1,
        jobId: `ai-${data.mediaId}-${Date.now()}`, // Unique job ID
    });
    console.log(`[Queue] Added AI job: ${job.id} for media: ${data.mediaId}`);
    return job.id!;
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

// Queue health check
export const getQueueHealth = async () => {
    const [waiting, active, completed, failed] = await Promise.all([
        aiAnalysisQueue.getWaitingCount(),
        aiAnalysisQueue.getActiveCount(),
        aiAnalysisQueue.getCompletedCount(),
        aiAnalysisQueue.getFailedCount(),
    ]);
    return { waiting, active, completed, failed };
};

console.log('✅ BullMQ queues initialized (enhanced)');
