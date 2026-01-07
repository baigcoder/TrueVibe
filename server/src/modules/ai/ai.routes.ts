import { Router, Request, Response, NextFunction } from 'express';
import { config } from '../../config/index.js';
import { authenticate } from '../../shared/middleware/auth.middleware.js';

const router = Router();

// Proxy AI service requests - routes through backend to avoid CORS and expose proper AI_SERVICE_URL
const AI_SERVICE_URL = config.ai.serviceUrl;

// Generate captions
router.post('/generate-caption', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { context, image_description } = req.body;

        if (!context?.trim()) {
            res.status(400).json({ error: 'Context is required' });
            return;
        }

        // Check if AI service is configured
        if (!AI_SERVICE_URL || AI_SERVICE_URL === 'mock') {
            // Return mock response for development
            res.json({
                captions: [
                    `✨ ${context.trim()} #authentic #truevibe`,
                    `🌟 ${context.trim()} #realcontent #nofilter`,
                    `💫 ${context.trim()} #genuine #verified`
                ],
                modelUsed: 'mock'
            });
            return;
        }

        const response = await fetch(`${AI_SERVICE_URL}/generate-caption`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: context.trim(), image_description }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate caption');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI caption generation error:', error);
        next(error);
    }
});

// Suggest hashtags
router.post('/suggest-hashtags', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { content } = req.body;

        if (!content?.trim()) {
            res.status(400).json({ error: 'Content is required' });
            return;
        }

        // Check if AI service is configured
        if (!AI_SERVICE_URL || AI_SERVICE_URL === 'mock') {
            // Return mock response for development
            const words = content.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
            res.json({
                hashtags: words.slice(0, 5).map((w: string) => `#${w}`).concat(['#truevibe', '#authentic', '#verified']),
                trending: ['#fyp', '#viral', '#trending'],
                modelUsed: 'mock'
            });
            return;
        }

        const response = await fetch(`${AI_SERVICE_URL}/suggest-hashtags`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: content.trim() }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to suggest hashtags');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI hashtag suggestion error:', error);
        next(error);
    }
});

// Generate post ideas
router.post('/generate-ideas', authenticate, async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { topic, style = 'trendy' } = req.body;

        if (!topic?.trim()) {
            res.status(400).json({ error: 'Topic is required' });
            return;
        }

        // Check if AI service is configured
        if (!AI_SERVICE_URL || AI_SERVICE_URL === 'mock') {
            // Return mock response for development
            res.json({
                ideas: [
                    {
                        title: `${topic} Story`,
                        caption: `Share your authentic ${topic} journey! 🌟`,
                        hashtags: [`#${topic.toLowerCase().replace(/\s+/g, '')}`, '#authentic', '#truevibe']
                    },
                    {
                        title: `${topic} Tips`,
                        caption: `Top tips for ${topic} that actually work! 💡`,
                        hashtags: [`#${topic.toLowerCase().replace(/\s+/g, '')}tips`, '#verified', '#realadvice']
                    },
                    {
                        title: `${topic} Behind the Scenes`,
                        caption: `The real story behind ${topic} 🎬`,
                        hashtags: [`#bts`, '#${topic.toLowerCase().replace(/\s+/g, '')}`, '#raw']
                    }
                ],
                modelUsed: 'mock'
            });
            return;
        }

        const response = await fetch(`${AI_SERVICE_URL}/generate-ideas`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: topic.trim(), style }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to generate ideas');
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('AI ideas generation error:', error);
        next(error);
    }
});

export default router;
