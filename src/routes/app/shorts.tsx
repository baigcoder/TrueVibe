import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load for better initial bundle
const ShortsPage = lazy(() => import('@/pages/shorts/ShortsPage'))

function ShortsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

export const Route = createFileRoute('/app/shorts')({
  component: () => (
    <Suspense fallback={<ShortsLoading />}>
      <ShortsPage />
    </Suspense>
  ),
})
