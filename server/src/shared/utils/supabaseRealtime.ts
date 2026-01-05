/**
 * Supabase Realtime Utility for Backend
 * Broadcasts events to Supabase Realtime channels
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
    if (!supabase && supabaseUrl && supabaseServiceKey) {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('[Supabase Realtime] Client initialized');
    }
    return supabase;
}

export interface AIAnalysisPayload {
    postId: string;
    trustLevel: 'authentic' | 'suspicious' | 'fake' | 'likely_fake';
    fakeScore: number;
    realScore: number;
    classification: string;
    processingTimeMs?: number;
    facesDetected?: number;
    avgFaceScore?: number;
    avgFftScore?: number;
    avgEyeScore?: number;
    fftBoost?: number;
    eyeBoost?: number;
    temporalBoost?: number;
    mediaType?: 'image' | 'video';
    framesAnalyzed?: number;
}

/**
 * Broadcast AI analysis complete event to all clients via Supabase Realtime
 */
export async function broadcastAIAnalysisComplete(payload: AIAnalysisPayload): Promise<boolean> {
    const client = getSupabaseClient();

    if (!client) {
        console.warn('[Supabase Realtime] Client not available (missing env vars), skipping broadcast');
        return false;
    }

    try {
        const channelName = 'ai-analysis-updates';
        const channel = client.channel(channelName);

        // Wait for subscription to be fully ready
        await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Subscription timeout'));
            }, 5000);

            channel.subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    clearTimeout(timeout);
                    resolve();
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    clearTimeout(timeout);
                    reject(new Error(`Channel subscription failed: ${status}`));
                }
            });
        });

        // Now send the broadcast
        const result = await channel.send({
            type: 'broadcast',
            event: 'ai:analysis-complete',
            payload,
        });

        console.log(`[Supabase Realtime] Broadcasted ai:analysis-complete for post ${payload.postId}`, result);

        // Small delay before cleanup to ensure message is sent
        await new Promise(resolve => setTimeout(resolve, 100));

        // Unsubscribe after sending
        await client.removeChannel(channel);

        return true;
    } catch (error) {
        console.error('[Supabase Realtime] Failed to broadcast:', error);
        return false;
    }
}
