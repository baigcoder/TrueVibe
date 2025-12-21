import { z } from 'zod';

export const updateProfileSchema = z.object({
    name: z
        .string()
        .min(1, 'Name is required')
        .max(100, 'Name cannot exceed 100 characters')
        .optional(),
    bio: z
        .string()
        .max(500, 'Bio cannot exceed 500 characters')
        .optional(),
    location: z
        .string()
        .max(100, 'Location cannot exceed 100 characters')
        .optional(),
    website: z
        .string()
        .max(200, 'Website URL cannot exceed 200 characters')
        .optional(),
    avatar: z.string().url('Invalid avatar URL').optional(),
    coverImage: z.string().url('Invalid cover image URL').optional(),
});

export const updateSettingsSchema = z.object({
    privacy: z.object({
        profileVisibility: z.enum(['public', 'followers', 'private']).optional(),
        showTrustScore: z.boolean().optional(),
        allowMessages: z.enum(['everyone', 'followers', 'none']).optional(),
    }),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
