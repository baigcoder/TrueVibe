import { createFileRoute } from '@tanstack/react-router'
import ParticipationAgreementPage from '@/pages/ParticipationAgreementPage'

export const Route = createFileRoute('/terms')({
    component: ParticipationAgreementPage,
})
