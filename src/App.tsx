import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { SocketProvider } from "@/context/SocketContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CallProvider } from "@/context/CallContext";
import { VoiceRoomProvider } from "@/context/VoiceRoomContext";
import { CallOverlay } from "@/components/chat/CallOverlay";
import { VoiceRoomPanel } from "@/components/chat/VoiceRoomPanel";
import { Toaster } from "sonner";
import { useEffect, useState } from "react";
import { NotificationManager } from "@/components/NotificationManager";

// Create a new router instance
const router = createRouter({ routeTree });

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Component to handle OAuth callback redirect and URL cleanup
// Supabase with detectSessionInUrl: true already processes the tokens
// This component just waits for auth to be ready and handles cleanup
function AuthLoader({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    // Check if we have OAuth tokens in the URL hash
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('refresh_token'))) {
      console.log('OAuth tokens detected in URL, Supabase will handle them...');
      setIsRedirecting(true);

      // Clean up the URL hash after a short delay
      // Supabase detectSessionInUrl already processes the tokens
      setTimeout(() => {
        const cleanUrl = window.location.origin + window.location.pathname;
        window.history.replaceState(null, '', cleanUrl);

        // Small delay to let auth state update, then redirect
        setTimeout(() => {
          window.location.href = '/app/feed';
        }, 500);
      }, 1000);
    }
  }, []);

  // Show loading while auth is initializing or we're redirecting after OAuth
  if (isLoading || isRedirecting) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/60 text-sm font-medium">
            {isRedirecting ? 'Completing sign in...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Wrapper component that uses the auth context
function AppContent() {
  return (
    <AuthLoader>
      <RouterProvider router={router} />
      <NotificationManager />
      <CallOverlay />
      <VoiceRoomPanel />
      <Toaster position="top-right" theme="dark" richColors />
    </AuthLoader>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <AuthProvider>
          <CallProvider>
            <VoiceRoomProvider>
              <AppContent />
            </VoiceRoomProvider>
          </CallProvider>
        </AuthProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}
