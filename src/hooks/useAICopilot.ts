import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/api/client';

// Use backend API proxy instead of direct AI service calls

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
            const data = await api.post<{ captions: string[]; modelUsed: string }>('/ai/generate-caption', {
                context: context.trim(),
                image_description: imageDescription?.trim() || null
            });

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
            const data = await api.post<{ hashtags: string[]; trending: string[]; modelUsed: string }>('/ai/suggest-hashtags', {
                content: content.trim()
            });

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
            const data = await api.post<{ ideas: PostIdea[]; modelUsed: string }>('/ai/generate-ideas', {
                topic: topic.trim(),
                style
            });

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
