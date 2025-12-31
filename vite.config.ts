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
    // Exclude heavy dependencies from pre-bundling to enable better tree-shaking
    exclude: ['@firebase/app'],
  },
  build: {
    // Disable source maps for smaller production bundles
    sourcemap: false,
    // Target modern browsers for smaller bundles (Vercel Edge supports ES2022)
    target: 'es2022',
    // Optimize CSS
    cssCodeSplit: true,
    // Minification settings - esbuild is fastest
    minify: 'esbuild',
    // Enable CSS minification
    cssMinify: true,
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
          // Animation - keep separate for lazy loading
          'vendor-motion': ['framer-motion'],
          // Real-time & Auth
          'vendor-realtime': ['socket.io-client', '@supabase/supabase-js'],
          // Charts - keep separate as they're heavy
          'vendor-charts': ['recharts'],
          // Utilities
          'vendor-utils': ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
        },
        // Asset file naming for better caching with content hash
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          // Organize assets by type for better caching
          const extType = assetInfo.name?.split('.').pop() || 'misc';
          if (/png|jpe?g|svg|gif|tiff|bmp|ico|webp|avif/i.test(extType)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/woff2?|ttf|eot|otf/i.test(extType)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (/css/i.test(extType)) {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        },
      },
      // Tree-shake unused exports
      treeshake: {
        moduleSideEffects: 'no-external',
        propertyReadSideEffects: false,
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    // Inline small assets for fewer requests
    assetsInlineLimit: 4096,
    // Report compressed size for better build insights
    reportCompressedSize: true,
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
  // Enable esbuild optimizations
  esbuild: {
    // Drop console.log in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
    // Use legal comments for license info
    legalComments: 'none',
  },
})
