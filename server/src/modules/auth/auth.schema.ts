import { z } from 'zod';

// Schema for syncing Supabase user profile to backend
export const syncProfileSchema = z.object({
    supabaseId: z.string().min(1, 'Supabase ID is required'),
    email: z.string().email('Valid email is required').optional(),
    name: z.string().min(1, 'Name is required').max(100),
    avatar: z.string().url().optional().nullable(),
});

export type SyncProfileInput = z.infer<typeof syncProfileSchema>;
