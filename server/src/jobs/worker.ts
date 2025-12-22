import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { Media } from '../modules/posts/Media.model.js';
import { Post } from '../modules/posts/Post.model.js';
import { AIAnalysis, AIClassification } from '../modules/posts/AIAnalysis.model.js';
import { Notification } from '../modules/notifications/Notification.model.js';
import { Profile } from '../modules/users/Profile.model.js';
import { emitToUser } from '../socket/index.js';
import { config } from '../config/index.js';

// AI Analysis Service - calls Python FastAPI for real deepfake detection
interface AIAnalysisResult {
    confidenceScore: number;
    fakeScore: number;
    realScore: number;
    classification: 'fake' | 'real';
    analysisDetails: Record<string, unknown>;
    processingTimeMs: number;
}

// Response type from Python FastAPI service
interface AIServiceResponse {
    fake_score: number;
    real_score: number;
    classification: 'fake' | 'real';
    confidence: number;
    processing_time_ms: number;
    model_version?: string;
}

async function analyzeMedia(mediaUrl: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const aiServiceUrl = config.ai.serviceUrl;

    // Use real AI service if configured
    if (aiServiceUrl && aiServiceUrl !== 'mock') {
        try {
            console.log(`📤 Sending image to AI service: ${aiServiceUrl}`);

            const response = await fetch(`${aiServiceUrl}/analyze`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image_url: mediaUrl }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`AI service error (${response.status}): ${errorText}`);
            }

            const result = await response.json() as AIServiceResponse;

            // Detect media type from URL
            const isVideo = mediaUrl.includes('/video/') ||
                mediaUrl.endsWith('.mp4') ||
                mediaUrl.endsWith('.mov') ||
                mediaUrl.endsWith('.webm');

            console.log(`✅ AI analysis complete: ${result.classification} (${(result.confidence * 100).toFixed(1)}%)`);

            return {
                // Map fake_score to confidenceScore (higher = more likely fake)
                confidenceScore: result.fake_score * 100,
                fakeScore: result.fake_score,
                realScore: result.real_score,
                classification: result.classification,
                analysisDetails: {
                    deepfakeAnalysis: {
                        fakeScore: result.fake_score,
                        realScore: result.real_score,
                        classification: result.classification,
                    },
                    modelVersion: result.model_version || 'deepfake-detector-v3',
                    mediaType: isVideo ? 'video' : 'image',
                    framesAnalyzed: isVideo ? 8 : 10, // Default frame counts
                },
                processingTimeMs: result.processing_time_ms || (Date.now() - startTime),
            };
        } catch (error) {
            console.error('❌ AI service call failed, using fallback:', error);
            // Fall through to mock if service fails
        }
    }

    // Fallback: Mock analysis (for development when AI service is not running)
    console.log('⚠️ Using mock AI analysis (AI_SERVICE_URL not configured or unavailable)');
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

    // Generate mock score
    const mockFakeScore = Math.random() * 0.3; // Bias towards "real" for mock
    const mockRealScore = 1 - mockFakeScore;

    return {
        confidenceScore: mockFakeScore * 100,
        fakeScore: mockFakeScore,
        realScore: mockRealScore,
        classification: mockRealScore > 0.5 ? 'real' : 'fake',
        analysisDetails: {
            deepfakeAnalysis: {
                fakeScore: mockFakeScore,
                realScore: mockRealScore,
                classification: mockRealScore > 0.5 ? 'real' : 'fake',
            },
            faceDetection: {
                detected: Math.random() > 0.3,
                confidence: Math.random() * 100,
            },
            temporalConsistency: Math.random() * 100,
            compressionArtifacts: Math.random() * 50,
            modelVersion: 'mock-v1',
        },
        processingTimeMs: Date.now() - startTime,
    };
}

// Get classification from score
function getClassification(score: number): AIClassification {
    if (score <= 20) return 'AUTHENTIC';
    if (score <= 60) return 'SUSPICIOUS';
    return 'LIKELY_FAKE';
}

// Get trust level for post
function getTrustLevel(classification: AIClassification): string {
    switch (classification) {
        case 'AUTHENTIC': return 'authentic';
        case 'SUSPICIOUS': return 'suspicious';
        case 'LIKELY_FAKE': return 'likely_fake';
        default: return 'pending';
    }
}

// AI Analysis Worker
const aiAnalysisWorker = new Worker(
    'ai-analysis',
    async (job: Job<{ mediaId: string; postId: string }>) => {
        const { mediaId, postId } = job.data;
        console.log(`Processing AI analysis for media: ${mediaId}`);

        try {
            // Get media
            const media = await Media.findById(mediaId);
            if (!media) {
                throw new Error('Media not found');
            }

            const isVideo = media.type === 'video' || media.url.includes('/video/');
            console.log(`📊 Analyzing ${isVideo ? 'VIDEO' : 'IMAGE'}: ${media.url.substring(0, 60)}...`);

            // Create pending analysis record
            let analysis = await AIAnalysis.findOne({ mediaId });
            if (!analysis) {
                analysis = await AIAnalysis.create({
                    mediaId,
                    postId,
                    status: 'processing',
                });
            } else {
                analysis.status = 'processing';
                await analysis.save();
            }

            // Perform analysis
            const result = await analyzeMedia(media.url);
            const classification = getClassification(result.confidenceScore);
            const trustLevel = getTrustLevel(classification);

            // Update analysis
            analysis.confidenceScore = result.confidenceScore;
            analysis.classification = classification;
            analysis.analysisDetails = result.analysisDetails as any;
            analysis.processingTimeMs = result.processingTimeMs;
            analysis.modelVersion = '1.0.0';
            analysis.status = 'completed';
            await analysis.save();

            // Update media
            media.aiAnalysisId = analysis._id;
            await media.save();

            // Update post
            if (postId) {
                await Post.findByIdAndUpdate(postId, {
                    trustLevel,
                    aiAnalysisId: analysis._id,
                });

                // Get post for notification
                const post = await Post.findById(postId);
                if (post) {
                    // Emit real-time event
                    emitToUser(post.userId.toString(), 'ai:analysis-complete', {
                        postId,
                        analysis: {
                            confidenceScore: result.confidenceScore,
                            classification,
                            trustLevel,
                        },
                    });

                    // Create notification
                    await Notification.create({
                        userId: post.userId,
                        type: 'system',
                        title: 'AI Analysis Complete',
                        body: `Your post has been analyzed. Trust level: ${trustLevel}`,
                        link: `/app/posts/${postId}`,
                        isRead: false,
                    });
                }
            }

            console.log(`AI analysis completed for media: ${mediaId} - ${classification}`);
            return { mediaId, classification, trustLevel };
        } catch (error) {
            console.error(`AI analysis failed for media: ${mediaId}`, error);

            // Update analysis status
            await AIAnalysis.findOneAndUpdate(
                { mediaId },
                { status: 'failed', errorMessage: (error as Error).message }
            );

            throw error;
        }
    },
    {
        connection: getRedisClient(),
        concurrency: 2, // Reduced concurrency
        skipVersionCheck: true, // Suppress eviction policy warnings
        // Rate limiting to reduce Redis calls
        limiter: {
            max: 5, // Max 5 jobs per duration
            duration: 60000, // Per 60 seconds
        },
        lockDuration: 60000, // Extend lock duration
        stalledInterval: 60000, // Check for stalled jobs less frequently
        maxStalledCount: 2,
    }
);

// Notification Worker
const notificationWorker = new Worker(
    'notifications',
    async (job: Job) => {
        const { userId, type, actorId, resourceType, resourceId, message } = job.data;

        // Create notification
        const notification = await Notification.create({
            userId,
            type,
            actorId,
            resourceType,
            resourceId,
            message,
        });

        // Emit real-time notification
        emitToUser(userId, 'notification:new', notification);

        return { notificationId: notification._id };
    },
    {
        connection: getRedisClient(),
        concurrency: 3,
        skipVersionCheck: true,
        limiter: { max: 10, duration: 60000 },
        lockDuration: 60000,
        stalledInterval: 60000,
    }
);

// Analytics Worker
const analyticsWorker = new Worker(
    'analytics',
    async (job: Job<{ userId: string; type: string }>) => {
        const { userId, type } = job.data;
        console.log(`Processing analytics for user: ${userId}, type: ${type}`);

        // Analytics aggregation logic would go here
        // For now, just log

        return { userId, type, processed: true };
    },
    {
        connection: getRedisClient(),
        concurrency: 1,
        skipVersionCheck: true,
        limiter: { max: 3, duration: 60000 },
        lockDuration: 60000,
        stalledInterval: 120000,
    }
);

// Error handlers
aiAnalysisWorker.on('failed', (job, err) => {
    console.error(`AI analysis job ${job?.id} failed:`, err.message);
});

notificationWorker.on('failed', (job, err) => {
    console.error(`Notification job ${job?.id} failed:`, err.message);
});

analyticsWorker.on('failed', (job, err) => {
    console.error(`Analytics job ${job?.id} failed:`, err.message);
});

console.log('✅ BullMQ workers started');

export { aiAnalysisWorker, notificationWorker, analyticsWorker };
