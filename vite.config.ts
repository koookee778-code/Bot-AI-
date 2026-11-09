import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: false,
      watch: {
        ignored: [
          '**/.wwebjs_auth/**',
          '**/.wwebjs_cache/**',
          '**/*.json',
          '**/uploads/**',
          '**/node_modules/**',
        ],
      },
    },
  };
});
