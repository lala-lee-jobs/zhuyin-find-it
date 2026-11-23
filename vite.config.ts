import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // 相對路徑：build 出來的 dist/ 可以放在任何子目錄或靜態主機
  base: './',
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: '注音找找看',
        short_name: '注音找找看',
        description: '互動式注音符號學習遊戲，支援離線遊玩',
        theme_color: '#FFD600',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'any',
        lang: 'zh-Hant-TW',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // 把所有靜態資源（含音檔、圖片）都預先快取
        globPatterns: ['**/*.{js,css,html,svg,png,wav,mp3,ogg,woff2}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
})
