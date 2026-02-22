import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === 'true' ? '/rogue-like-black-jack/' : '/',
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist-gui',
  },
  server: {
    port: 3000,
    open: true,
  },
});
