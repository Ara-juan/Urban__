import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend Node.js corre en http://localhost:3000 (carpeta react/backend)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Todas las llamadas a /api se reenvían al backend Express,
      // evitando problemas de CORS en desarrollo
      '/api': {
        target: process.env.BACKEND_URL || 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
