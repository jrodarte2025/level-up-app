import { defineConfig } from 'vite';
import svgr from 'vite-plugin-svgr';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svgr({ svgrOptions: { icon: true }, enforce: 'pre' }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Level Up',
        short_name: 'LevelUp',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#1e2d5f',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  server: {
    host: true
  }
});