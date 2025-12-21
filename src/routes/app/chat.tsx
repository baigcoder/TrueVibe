import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { Loader2 } from 'lucide-react'

// Lazy load for better initial bundle
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'))

function ChatLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
    </div>
  )
}

export const Route = createFileRoute('/app/chat')({
  component: () => (
    <Suspense fallback={<ChatLoading />}>
      <ChatPage />
    </Suspense>
  ),
})
