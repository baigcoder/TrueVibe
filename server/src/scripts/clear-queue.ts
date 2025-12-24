// Utility script to clear stale AI analysis jobs from BullMQ queue
import { Queue } from 'bullmq';
import { getRedisClient } from '../config/redis.js';

async function clearQueue() {
    console.log('🧹 Connecting to Redis...');

    const redis = getRedisClient();

    const queue = new Queue('ai-analysis', {
        connection: redis,
        skipVersionCheck: true
    });

    // Get job counts
    const counts = await queue.getJobCounts();
    console.log('📊 Current queue state:', counts);

    // Clean failed jobs (all of them)
    if (counts.failed > 0) {
        const removedFailed = await queue.clean(0, counts.failed, 'failed');
        console.log(`🗑️  Removed ${removedFailed.length} failed jobs`);
    }

    // Clean delayed jobs
    if (counts.delayed > 0) {
        const removedDelayed = await queue.clean(0, counts.delayed, 'delayed');
        console.log(`🗑️  Removed ${removedDelayed.length} delayed jobs`);
    }

    // Drain waiting jobs (remove all waiting jobs)
    if (counts.waiting > 0) {
        await queue.drain();
        console.log(`🗑️  Drained waiting queue`);
    }

    // Final count
    const finalCounts = await queue.getJobCounts();
    console.log('✅ Final queue state:', finalCounts);

    await queue.close();
    console.log('🎉 Done!');
    process.exit(0);
}

clearQueue().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});
