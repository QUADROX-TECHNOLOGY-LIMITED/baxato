import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/services': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/wallets': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
