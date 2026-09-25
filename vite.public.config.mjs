import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig(({ command }) => ({
  root: resolve('src/public'),
  publicDir: command === 'serve' ? resolve('.generated/static') : false,
  plugins: [react(), tailwindcss()],
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    manifest: true,
  },
}));
