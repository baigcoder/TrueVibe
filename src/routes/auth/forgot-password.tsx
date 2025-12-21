import { createFileRoute } from '@tanstack/react-router';
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage';

export const Route = createFileRoute('/auth/forgot-password' as any)({
    component: ForgotPasswordPage,
});
