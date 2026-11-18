import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// In development the browser talks to Vite (same origin) and Vite forwards /api to the backend.
// That mirrors production, where Vercel rewrites /api to the Render backend, so cookies stay first-party.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_DEV_API || 'http://localhost:5000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          motion: ['framer-motion', 'gsap'],
        },
      },
    },
  },
});
