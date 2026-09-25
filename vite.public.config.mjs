import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'node:path';

export default defineConfig({
  root: resolve('src/public'),
  publicDir: false,
  plugins: [tailwindcss()],
  build: {
    outDir: resolve('dist'),
    emptyOutDir: true,
    manifest: true,
    rollupOptions: { input: {
      styles: resolve('src/public/styles.css'),
      interactions: resolve('src/public/interactions.js'),
    } },
  },
});
