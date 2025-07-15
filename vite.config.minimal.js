import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Minimal configuration to avoid memory issues
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false,
    },
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/dist/**',
        '**/coverage/**',
        '**/*.log',
        '**/debug-*.js',
        '**/test-*.js',
        '**/.*-test.*',
        '**/portfolio-debug-report.md',
        '**/MEMORY_LEAK_FIXES.md'
      ]
    }
  },
  build: {
    target: 'esnext',
    minify: false,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['react', 'react-dom']
  },
  esbuild: {
    target: 'esnext',
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
}) 