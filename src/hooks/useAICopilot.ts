import { useState, useCallback } from 'react';
import { toast } from 'sonner';

const AI_SERVICE_URL = import.meta.env.VITE_AI_SERVICE_URL || 'http://localhost:8000';

interface CaptionResult {
    captions: string[];
    modelUsed: string;
}

interface HashtagResult {
    hashtags: string[];
    trending: string[];
    modelUsed: string;
}

interface PostIdea {
    title: string;
    caption: string;
    hashtags: string[];
}

interface IdeasResult {
    ideas: PostIdea[];
    modelUsed: string;
}

export function useAICopilot() {
    const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
    const [isGeneratingHashtags, setIsGeneratingHashtags] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);

    const generateCaption = useCallback(async (
        context: string,
        imageDescription?: string
    ): Promise<CaptionResult | null> => {
        if (!context.trim()) {
            toast.error('Please provide some context for caption generation');
            return null;
        }

        setIsGeneratingCaption(true);
        try {
            const response = await fetch(`${AI_SERVICE_URL}/generate-caption`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    context: context.trim(),
                    image_description: imageDescription?.trim() || null
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate caption');
            }

            const data = await response.json();
            toast.success(`Generated ${data.captions.length} captions`);
            return {
                captions: data.captions,
                modelUsed: data.modelUsed,
            };
        } catch (error) {
            console.error('Caption generation error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate caption');
            return null;
        } finally {
            setIsGeneratingCaption(false);
        }
    }, []);

    const suggestHashtags = useCallback(async (content: string): Promise<HashtagResult | null> => {
        if (!content.trim()) {
            toast.error('Please provide content to suggest hashtags for');
            return null;
        }

        setIsGeneratingHashtags(true);
        try {
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
            toast.success(`Found ${data.hashtags.length} relevant hashtags`);
            return {
                hashtags: data.hashtags,
                trending: data.trending,
                modelUsed: data.modelUsed,
            };
        } catch (error) {
            console.error('Hashtag suggestion error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to suggest hashtags');
            return null;
        } finally {
            setIsGeneratingHashtags(false);
        }
    }, []);

    const generateIdeas = useCallback(async (
        topic: string,
        style: 'trendy' | 'professional' | 'casual' | 'humorous' = 'trendy'
    ): Promise<IdeasResult | null> => {
        if (!topic.trim()) {
            toast.error('Please provide a topic for idea generation');
            return null;
        }

        setIsGeneratingIdeas(true);
        try {
            const response = await fetch(`${AI_SERVICE_URL}/generate-ideas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    topic: topic.trim(),
                    style
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to generate ideas');
            }

            const data = await response.json();
            toast.success(`Generated ${data.ideas.length} post ideas`);
            return {
                ideas: data.ideas,
                modelUsed: data.modelUsed,
            };
        } catch (error) {
            console.error('Ideas generation error:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate ideas');
            return null;
        } finally {
            setIsGeneratingIdeas(false);
        }
    }, []);

    return {
        // Caption generation
        generateCaption,
        isGeneratingCaption,

        // Hashtag suggestions
        suggestHashtags,
        isGeneratingHashtags,

        // Idea generation
        generateIdeas,
        isGeneratingIdeas,

        // Combined loading state
        isLoading: isGeneratingCaption || isGeneratingHashtags || isGeneratingIdeas,
    };
}

export type { CaptionResult, HashtagResult, PostIdea, IdeasResult };
