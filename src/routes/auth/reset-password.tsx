import { createFileRoute } from '@tanstack/react-router';
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage';

export const Route = createFileRoute('/auth/reset-password' as any)({
    component: ResetPasswordPage,
});
