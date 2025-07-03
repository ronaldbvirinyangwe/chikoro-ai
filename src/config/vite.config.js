import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
      },
      mangle: {
        toplevel: true,
      }
    },
    sourcemap: false,
  },
  server: {
    host: '0.0.0.0', 
    port: 80, 
    proxy: {
      '/bhadhara': {
        target: 'http://localhost:3080',
        changeOrigin: true,
        secure: false,
      }, // <--- COMMA ADDED HERE
      '/api': {
        target: 'http://localhost:3000', // Your backend server
        changeOrigin: true,
      },
    }
  },
    
  // --- Add this entire 'preview' section ---
  preview: {
    host: true,
    port: 5173, // Or whatever port you are exposing on Runpod
    allowedHosts: ['chikoro-ai.com']
  }
});
