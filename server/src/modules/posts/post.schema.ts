import { z } from 'zod';

export const createPostSchema = z.object({
    content: z
        .string()
        .max(5000, 'Post content cannot exceed 5000 characters')
        .optional()
        .default(''),
    mediaIds: z
        .array(z.string())
        .max(10, 'Maximum 10 media files per post')
        .optional(),
    visibility: z.enum(['public', 'followers', 'private']).default('public'),
});

export const updatePostSchema = z.object({
    content: z
        .string()
        .min(1, 'Post content is required')
        .max(5000, 'Post content cannot exceed 5000 characters')
        .optional(),
    visibility: z.enum(['public', 'followers', 'private']).optional(),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
