import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for PillPulse frontend
// Enables React plugin and sets up development server
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API requests to Express backend during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})