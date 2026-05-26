import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: 'src/client',
  build: {
    outDir: '../../dist/client',
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': 'http://192.168.10.19:3000',
      '/uploads': 'http://192.168.10.19:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/client'),
    },
  },
});
