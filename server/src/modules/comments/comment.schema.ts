import { z } from 'zod';

export const createCommentSchema = z.object({
    postId: z.string().optional(),
    shortId: z.string().optional(),
    parentId: z.string().optional(),
    content: z
        .string()
        .min(1, 'Comment content is required')
        .max(1000, 'Comment cannot exceed 1000 characters'),
}).refine(data => data.postId || data.shortId, {
    message: "Either postId or shortId is required",
    path: ["postId"]
});

export const updateCommentSchema = z.object({
    content: z
        .string()
        .min(1, 'Comment content is required')
        .max(1000, 'Comment cannot exceed 1000 characters'),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
