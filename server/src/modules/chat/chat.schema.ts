import { z } from 'zod';

// ============== SERVER SCHEMAS ==============

export const createServerSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, 'Server name is required')
            .max(100, 'Server name cannot exceed 100 characters')
            .trim(),
        description: z.string()
            .max(500, 'Description cannot exceed 500 characters')
            .optional(),
        icon: z.string().url().optional(),
        isPublic: z.boolean().default(true),
    }),
});

export const joinServerSchema = z.object({
    body: z.object({
        inviteCode: z.string().optional(),
    }),
});

// ============== CHANNEL SCHEMAS ==============

export const createChannelSchema = z.object({
    params: z.object({
        serverId: z.string().min(1, 'Server ID is required'),
    }),
    body: z.object({
        name: z.string()
            .min(1, 'Channel name is required')
            .max(100, 'Channel name cannot exceed 100 characters')
            .trim()
            .regex(/^[a-z0-9-]+$/, 'Channel name can only contain lowercase letters, numbers, and hyphens'),
        type: z.enum(['text', 'voice', 'announcement']).default('text'),
        topic: z.string().max(500, 'Topic cannot exceed 500 characters').optional(),
    }),
});

export const sendChannelMessageSchema = z.object({
    params: z.object({
        serverId: z.string().min(1, 'Server ID is required'),
        channelId: z.string().min(1, 'Channel ID is required'),
    }),
    body: z.object({
        content: z.string()
            .min(1, 'Message content is required')
            .max(5000, 'Message cannot exceed 5000 characters'),
        media: z.array(z.object({
            type: z.enum(['image', 'video', 'file', 'voice']),
            url: z.string().url(),
            name: z.string().optional(),
            duration: z.number().optional(),
        })).optional(),
        replyTo: z.string().optional(),
    }),
});

// ============== CONVERSATION SCHEMAS ==============

export const createConversationSchema = z.object({
    body: z.object({
        participantIds: z.array(z.string()).min(1, 'At least one participant is required'),
        type: z.enum(['direct', 'group']).default('direct'),
        groupName: z.string().max(100).optional(),
    }),
});

export const sendMessageSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Conversation ID is required'),
    }),
    body: z.object({
        content: z.string()
            .min(1, 'Message content is required')
            .max(5000, 'Message cannot exceed 5000 characters'),
        media: z.array(z.object({
            type: z.enum(['image', 'video', 'file', 'voice']),
            url: z.string().url(),
            name: z.string().optional(),
            duration: z.number().optional(),
        })).optional(),
        replyTo: z.string().optional(),
    }),
});

// ============== REACTION SCHEMAS ==============

export const addReactionSchema = z.object({
    params: z.object({
        messageId: z.string().min(1, 'Message ID is required'),
    }),
    body: z.object({
        emoji: z.string().min(1, 'Emoji is required').max(10),
    }),
});

export const removeReactionSchema = z.object({
    params: z.object({
        messageId: z.string().min(1, 'Message ID is required'),
        emoji: z.string().min(1, 'Emoji is required'),
    }),
});

// ============== POST SCHEMAS ==============

export const createPostSchema = z.object({
    body: z.object({
        content: z.string()
            .min(1, 'Post content is required')
            .max(5000, 'Post content cannot exceed 5000 characters'),
        mediaIds: z.array(z.string()).optional(),
        visibility: z.enum(['public', 'followers', 'private']).default('public'),
    }),
});

export const updatePostSchema = z.object({
    params: z.object({
        id: z.string().min(1, 'Post ID is required'),
    }),
    body: z.object({
        content: z.string().max(5000).optional(),
        visibility: z.enum(['public', 'followers', 'private']).optional(),
    }),
});

// ============== USER SCHEMAS ==============

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        bio: z.string().max(500).optional(),
        location: z.string().max(100).optional(),
        website: z.string().url().optional().or(z.literal('')),
        avatar: z.string().url().optional(),
        coverImage: z.string().url().optional(),
    }),
});

export const updateSettingsSchema = z.object({
    body: z.object({
        privacy: z.object({
            profileVisibility: z.enum(['public', 'followers', 'private']).optional(),
            showTrustScore: z.boolean().optional(),
            allowMessages: z.enum(['everyone', 'followers', 'none']).optional(),
        }).optional(),
    }),
});

// Type exports
export type CreateServerInput = z.infer<typeof createServerSchema>;
export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type SendChannelMessageInput = z.infer<typeof sendChannelMessageSchema>;
export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type AddReactionInput = z.infer<typeof addReactionSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
