import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Environment variables used by the app (all optional):
//   VITE_API_BASE_URL - Base URL for the backend API
//   VITE_API_MODE     - API mode, e.g. "mock" or "http"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-mobx': ['mobx', 'mobx-react-lite'],
          'vendor-ui': ['framer-motion', 'katex'],
          'vendor-graph': ['dagre'],
        },
      },
    },
  },
})
