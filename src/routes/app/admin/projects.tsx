import { createFileRoute } from '@tanstack/react-router'
import AdminProjectsPage from '@/pages/admin/projects/AdminProjectsPage'

export const Route = createFileRoute('/app/admin/projects')({
    component: AdminProjectsPage,
})
