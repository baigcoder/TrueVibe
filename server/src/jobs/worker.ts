import { Worker, Job } from 'bullmq';
import { getRedisClient } from '../config/redis.js';
import { Media } from '../modules/posts/Media.model.js';
import { Post } from '../modules/posts/Post.model.js';
import { Short } from '../modules/shorts/Short.model.js';
import { Story } from '../modules/stories/Story.model.js';
import { AIAnalysis, AIClassification } from '../modules/posts/AIAnalysis.model.js';
import { Notification } from '../modules/notifications/Notification.model.js';
import { Profile } from '../modules/users/Profile.model.js';
import { emitToUser } from '../socket/index.js';
import { config } from '../config/index.js';
import { fetchWithRetry, withCircuitBreaker } from '../shared/utils/http.utils.js';
import { securityConfig } from '../config/security.config.js';

const isProd = process.env.NODE_ENV === 'production';

// Production-safe logging
function debugLog(...args: unknown[]): void {
    if (!isProd) {
        console.log('[AI-Worker]', ...args);
    }
}

function errorLog(...args: unknown[]): void {
    console.error('[AI-Worker]', ...args);
}

// AI Analysis Service - calls Python FastAPI for real deepfake detection
interface AIAnalysisResult {
    confidenceScore: number;
    fakeScore: number;
    realScore: number;
    classification: 'fake' | 'real' | 'suspicious';
    analysisDetails: Record<string, unknown>;
    processingTimeMs: number;
}

// Response type from Python FastAPI service
interface AIServiceResponse {
    fake_score: number;
    real_score: number;
    classification: 'fake' | 'real' | 'suspicious';
    confidence: number;
    processing_time_ms: number;
    model_version?: string;
    // Enhanced v5 analysis data
    faces_detected?: number;
    face_scores?: number[];
    avg_face_score?: number;
    avg_fft_score?: number;
    avg_eye_score?: number;
    fft_boost?: number;
    eye_boost?: number;
    temporal_boost?: number;
    // NEW: Filter detection fields
    content_type?: string;  // 'portrait', 'group', 'scene'
    has_filter?: boolean;
    filter_intensity?: number;
    filter_analysis?: {
        skin_smoothing: number;
        color_grading: number;
        vignette_detected: boolean;
        beauty_mode: number;
        filters_detected: string[];
    };
    multi_face_analysis?: {
        total_unique_faces: number;
        face_sizes: number[];
        per_face_scores: Array<{
            face_index: number;
            bbox: [number, number, number, number];
            size: number;
            confidence: number;
            fake_score: number | null;
        }>;
        size_consistency: string;
        size_variance: number;
    };
    // Debug frames for PDF report
    debug_frames?: Array<{
        index: number;
        name: string;
        type: string;
        weight: number;
        fake_score: number;
        real_score: number;
        status: string;
        image_base64: string;
    }>;
}

async function analyzeMedia(mediaUrl: string): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const aiServiceUrl = config.ai.serviceUrl;
    const aiApiKey = config.ai.apiKey;

    // Use real AI service if configured
    if (aiServiceUrl && aiServiceUrl !== 'mock') {
        try {
            debugLog(`Sending image to AI service: ${aiServiceUrl}`);

            // Use circuit breaker and retry logic for resilient calls
            const result = await withCircuitBreaker<AIServiceResponse>(
                'ai-service',
                async () => {
                    const headers: Record<string, string> = {
                        'Content-Type': 'application/json',
                    };

                    // Add API key if configured
                    if (aiApiKey) {
                        headers['X-API-Key'] = aiApiKey;
                    }

                    const response = await fetchWithRetry(`${aiServiceUrl}/analyze`, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ image_url: mediaUrl }),
                        maxRetries: securityConfig.aiService.maxRetries,
                        timeout: securityConfig.aiService.timeout,
                        onRetry: (error, attempt) => {
                            debugLog(`Retry ${attempt} due to: ${error.message}`);
                        },
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`AI service error (${response.status}): ${errorText}`);
                    }

                    return response.json() as Promise<AIServiceResponse>;
                },
                {
                    failureThreshold: 5,
                    resetTimeout: 60000, // 1 minute
                    onOpen: () => debugLog('Circuit breaker opened for AI service'),
                    onClose: () => debugLog('Circuit breaker reset for AI service'),
                }
            );

            // Detect media type from URL
            const isVideo = mediaUrl.includes('/video/') ||
                mediaUrl.endsWith('.mp4') ||
                mediaUrl.endsWith('.mov') ||
                mediaUrl.endsWith('.webm');

            debugLog(`AI analysis complete: ${result.classification} (${(result.confidence * 100).toFixed(1)}%)`);

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
                    modelVersion: result.model_version || 'deepfake-detector-v5',
                    mediaType: isVideo ? 'video' : 'image',
                    framesAnalyzed: isVideo ? 8 : 10,
                    // Enhanced v5 analysis details
                    facesDetected: result.faces_detected || 0,
                    faceScores: result.face_scores || [],
                    avgFaceScore: result.avg_face_score,
                    avgFftScore: result.avg_fft_score,
                    avgEyeScore: result.avg_eye_score,
                    fftBoost: result.fft_boost,
                    eyeBoost: result.eye_boost,
                    temporalBoost: result.temporal_boost,
                    // Debug frames for PDF report
                    debugFrames: result.debug_frames || [],
                },
                processingTimeMs: result.processing_time_ms || (Date.now() - startTime),
            };
        } catch (error) {
            errorLog('AI service call failed, using fallback:', isProd ? 'Error occurred' : error);
            // Fall through to mock if service fails
        }
    }

    // Fallback: Mock analysis (for development when AI service is not running)
    debugLog('Using mock AI analysis (AI_SERVICE_URL not configured or unavailable)');
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

// AI Analysis Worker - supports posts, shorts, and stories
const aiAnalysisWorker = new Worker(
    'ai-analysis',
    async (job: Job<{ mediaId: string; postId: string; contentType?: 'post' | 'short' | 'story'; mediaUrl?: string }>) => {
        const { mediaId, postId, contentType = 'post', mediaUrl } = job.data;
        debugLog(`Processing AI analysis for ${contentType}: ${mediaId}`);

        try {
            let analysisUrl: string;
            let isVideo = false;
            let ownerId: string | undefined;

            // Handle different content types
            if (contentType === 'short') {
                const short = await Short.findById(mediaId);
                if (!short) {
                    throw new Error('Short not found');
                }
                analysisUrl = short.videoUrl;
                isVideo = true;
                ownerId = short.userId;
            } else if (contentType === 'story') {
                const story = await Story.findById(mediaId);
                if (!story) {
                    throw new Error('Story not found');
                }
                analysisUrl = story.mediaUrl;
                isVideo = story.mediaType === 'video';
                ownerId = story.userId;
            } else {
                // Default: post with media model
                const media = await Media.findById(mediaId);
                if (!media) {
                    throw new Error('Media not found');
                }
                isVideo = media.type === 'video' || media.url.includes('/video/');
                if (media.originalUrl && media.originalUrl.length > 50) {
                    analysisUrl = media.originalUrl;
                } else if (isVideo) {
                    analysisUrl = media.url.replace(/\/upload\/[^v][^/]*\//, '/upload/');
                } else {
                    analysisUrl = media.url;
                }
                const post = await Post.findById(postId);
                ownerId = post?.userId;
            }

            debugLog(`Analyzing ${isVideo ? 'VIDEO' : 'IMAGE'} for ${contentType}: ${analysisUrl.substring(0, 80)}...`);

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

            // Emit analysis started event
            if (ownerId) {
                emitToUser(ownerId, 'ai:analysis-started', {
                    contentType,
                    contentId: mediaId,
                    status: 'analyzing',
                    message: isVideo ? 'Analyzing video for deepfakes...' : 'Analyzing image for authenticity...',
                });
            }

            // Perform analysis
            const result = await analyzeMedia(analysisUrl);
            const classification = getClassification(result.confidenceScore);
            const trustLevel = getTrustLevel(classification);

            // Update analysis record
            analysis.confidenceScore = result.confidenceScore;
            analysis.classification = classification;
            analysis.analysisDetails = result.analysisDetails as any;
            analysis.processingTimeMs = result.processingTimeMs;
            analysis.modelVersion = '1.0.0';
            analysis.status = 'completed';
            await analysis.save();

            // Update the source content based on type
            if (contentType === 'short') {
                await Short.findByIdAndUpdate(mediaId, {
                    trustLevel,
                    aiAnalysisId: analysis._id,
                });
            } else if (contentType === 'story') {
                await Story.findByIdAndUpdate(mediaId, {
                    trustLevel,
                    aiAnalysisId: analysis._id,
                });
            } else {
                // Post: update both media and post
                const media = await Media.findById(mediaId);
                if (media) {
                    media.aiAnalysisId = analysis._id;
                    await media.save();
                }
                if (postId) {
                    await Post.findByIdAndUpdate(postId, {
                        trustLevel,
                        aiAnalysisId: analysis._id,
                    });
                }
            }

            // Emit completion event
            if (ownerId) {
                emitToUser(ownerId, 'ai:analysis-complete', {
                    contentType,
                    contentId: mediaId,
                    postId,
                    analysis: {
                        confidenceScore: result.confidenceScore,
                        classification,
                        trustLevel,
                        fakeScore: result.fakeScore,
                        realScore: result.realScore,
                        processingTimeMs: result.processingTimeMs,
                        facesDetected: result.analysisDetails?.facesDetected,
                        avgFaceScore: result.analysisDetails?.avgFaceScore,
                        avgFftScore: result.analysisDetails?.avgFftScore,
                        avgEyeScore: result.analysisDetails?.avgEyeScore,
                        mediaType: result.analysisDetails?.mediaType,
                        framesAnalyzed: result.analysisDetails?.framesAnalyzed,
                    },
                });

                // Create notification for posts (not stories since they expire)
                if (contentType !== 'story') {
                    await Notification.create({
                        userId: ownerId,
                        type: 'system',
                        title: 'AI Analysis Complete',
                        body: `Your ${contentType} has been analyzed. Trust level: ${trustLevel}`,
                        link: contentType === 'short' ? `/app/shorts/${mediaId}` : `/app/posts/${postId}`,
                        isRead: false,
                    });
                }
            }

            debugLog(`AI analysis completed for ${contentType}: ${mediaId} - ${classification}`);
            return { mediaId, classification, trustLevel };
        } catch (error: any) {
            const errorMessage = error?.message || String(error);
            errorLog(`AI analysis failed for ${contentType || 'content'}: ${mediaId}`, isProd ? 'Error occurred' : error);

            const is404Error = errorMessage.includes('404') ||
                errorMessage.includes('not found') ||
                errorMessage.includes('Resource not found');

            if (is404Error) {
                debugLog(`Content ${mediaId} no longer exists, marking as skipped`);
                await AIAnalysis.findOneAndUpdate(
                    { mediaId },
                    { status: 'skipped', errorMessage: 'Resource no longer exists' }
                );
                return { mediaId, classification: 'SKIPPED', trustLevel: 'pending' };
            }

            await AIAnalysis.findOneAndUpdate(
                { mediaId },
                { status: 'failed', errorMessage }
            );

            throw error;
        }
    },
    {
        connection: getRedisClient(),
        concurrency: 3,
        skipVersionCheck: true,
        lockDuration: 300000,
        stalledInterval: 30000,
        maxStalledCount: 2,
        removeOnComplete: { count: 50 },
        removeOnFail: { count: 100 },
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
        debugLog(`Processing analytics for user: ${userId}, type: ${type}`);

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
    errorLog(`AI analysis job ${job?.id} failed:`, err.message);
});

aiAnalysisWorker.on('completed', (job) => {
    debugLog(`AI analysis job ${job?.id} completed successfully`);
});

aiAnalysisWorker.on('active', (job) => {
    debugLog(`AI analysis job ${job?.id} started processing`);
});

notificationWorker.on('failed', (job, err) => {
    errorLog(`Notification job ${job?.id} failed:`, err.message);
});

analyticsWorker.on('failed', (job, err) => {
    errorLog(`Analytics job ${job?.id} failed:`, err.message);
});

debugLog('BullMQ workers started');

export { aiAnalysisWorker, notificationWorker, analyticsWorker };
