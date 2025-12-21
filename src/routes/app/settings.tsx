import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load for better initial bundle
const SettingsPage = lazy(() => import('@/pages/settings/SettingsPage'))

function SettingsLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

export const Route = createFileRoute('/app/settings')({
  component: () => (
    <Suspense fallback={<SettingsLoading />}>
      <SettingsPage />
    </Suspense>
  ),
})
