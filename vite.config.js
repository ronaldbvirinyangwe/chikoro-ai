import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react()
  ],
  build: {
    minify: 'terser', // Use Terser for stronger minification
    terserOptions: {
      compress: {
        drop_console: true, // Optionally remove console statements
      },
      mangle: {
        toplevel: true, // Mangle top-level variable and function names
      }
    },
    sourcemap: false, // Disable source maps to make reverse engineering harder
  },
  server: {
    host: '0.0.0.0', 
    port: 5173, 
    proxy: {
      '/bhadhara': {
        target: 'http://localhost:3080',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  // --- Add this entire 'preview' section ---
  preview: {
    host: true,
    port: 5173, // Or whatever port you are exposing on Runpod
    allowedHosts: ['chikoro-ai.com']
  }
});