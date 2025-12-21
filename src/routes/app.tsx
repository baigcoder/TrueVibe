import { createFileRoute, redirect } from '@tanstack/react-router'
import AppLayout from '@/layouts/AppLayout'
import { supabase } from '@/lib/supabase'

export const Route = createFileRoute('/app')({
  beforeLoad: async ({ location }) => {
    // Check if this is an OAuth callback with hash fragment
    // The hash contains access_token after OAuth redirect
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      // Wait for Supabase to process the OAuth callback
      // This gives time for the auth state to be established
      await new Promise(resolve => setTimeout(resolve, 500))

      // Try to get the session after the OAuth callback is processed
      const { data: { session } } = await supabase.auth.getSession()

      if (session) {
        // Clear the hash from URL for cleaner navigation
        window.history.replaceState(null, '', window.location.pathname)

        // Redirect to feed if at /app
        if (location.pathname === '/app') {
          throw redirect({ to: '/app/feed' })
        }
        return
      }
    }

    // Check for authenticated session
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw redirect({
        to: '/auth/login',
        search: {
          redirect: location.href,
        },
      })
    }

    // Redirect /app to /app/feed
    if (location.pathname === '/app') {
      throw redirect({ to: '/app/feed' })
    }
  },
  component: AppLayout,
})
