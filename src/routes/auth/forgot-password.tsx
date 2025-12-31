import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load for better initial bundle
const ForgotPasswordPage = lazy(() => import('@/pages/auth/ForgotPasswordPage'))

function AuthLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
    )
}

export const Route = createFileRoute('/auth/forgot-password')({
    component: () => (
        <Suspense fallback={<AuthLoading />}>
            <ForgotPasswordPage />
        </Suspense>
    ),
})
