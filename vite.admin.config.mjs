import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve('src/admin'),
  base: '/admin/',
  publicDir: false,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve('dist/admin'),
    emptyOutDir: false,
  },
});
