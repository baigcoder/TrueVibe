import { createFileRoute } from '@tanstack/react-router'
import SearchPage from '@/pages/search/SearchPage'

export const Route = createFileRoute('/app/search')({
  component: SearchPage,
})
