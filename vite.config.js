import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          charts: ['recharts'],
          icons: ['lucide-react'],
        },
      },
    },
    sourcemap: false, // Disable sourcemaps for faster builds
    target: 'esnext',
    minify: 'esbuild',
  },
  server: {
    port: 5173, // Fixed: Changed back to 5173 to match OAuth redirect configuration
    host: true,
    hmr: {
      overlay: false, // Disable error overlay that might cause issues
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: ['lucide-react'], // Let lucide-react be tree-shaken
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }, // Suppress ESM warnings
  },
}) 