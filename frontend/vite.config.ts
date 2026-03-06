import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { keycloakify } from 'keycloakify/vite-plugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    keycloakify({
      accountThemeImplementation: 'none',
      themeName: 'mat-tutor',
    }),
  ],
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
