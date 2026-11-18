import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // Relativní cesty umožňují nasazení do podadresáře, například /fakturagen/ na GitHub Pages.
  base: command === 'build' ? './' : '/',
  server: {
    host: '0.0.0.0',
    port: 5180,
    strictPort: true,
  },
}));
