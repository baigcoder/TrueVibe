import { createFileRoute } from '@tanstack/react-router'
import ProjectDetailPage from '@/pages/projects/ProjectDetailPage'

export const Route = createFileRoute('/app/projects/$id')({
    component: ProjectDetailPage,
})
