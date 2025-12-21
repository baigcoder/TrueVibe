import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-vite-plugin'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@tanstack/react-query',
      '@tanstack/react-router',
      'framer-motion',
      'socket.io-client',
      'sonner',
      'lucide-react',
      '@supabase/supabase-js',
    ],
  },
  build: {
    // Disable source maps for smaller production bundles
    sourcemap: false,
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Optimize CSS
    cssCodeSplit: true,
    // Minification settings
    minify: 'esbuild',
    // Rollup options for code splitting
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal loading
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-is'],
          // Routing
          'vendor-router': ['@tanstack/react-router'],
          // Data fetching
          'vendor-query': ['@tanstack/react-query'],
          // UI libraries
          'vendor-ui': [
            '@radix-ui/react-avatar',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tabs',
            '@radix-ui/react-scroll-area',
          ],
          // Animation
          'vendor-motion': ['framer-motion'],
          // Real-time & Auth
          'vendor-realtime': ['socket.io-client', '@supabase/supabase-js'],
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
        },
        // Asset file naming for better caching
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Optimize assets
    assetsInlineLimit: 4096,
  },
  // Preview server configuration
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Development server
  server: {
    port: 5173,
    strictPort: false,
    // Enable CORS for development
    cors: true,
    // HMR configuration
    hmr: {
      overlay: true,
    },
  },
})
