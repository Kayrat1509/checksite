import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // В режиме разработки отключаем Service Worker
      devOptions: {
        enabled: false,
        type: 'module'
      },
      manifest: {
        name: 'Check Site',
        short_name: 'CheckSite',
        description: 'Система контроля качества строительных работ',
        theme_color: '#1890ff',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Очистка старого кеша при обновлении
        cleanupOutdatedCaches: true,
        // Пропускать ожидание и активировать новый SW сразу
        skipWaiting: true,
        // Получить контроль над всеми клиентами сразу
        clientsClaim: true,
        runtimeCaching: [
          {
            // API запросы - всегда сначала сеть
            urlPattern: /^https?:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 минут вместо 24 часов
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Изображения - сначала сеть, потом кеш (для свежих изображений)
            urlPattern: /^https?:\/\/.*\/media\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 час
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Статические ресурсы (JS, CSS) - только для production
            urlPattern: /\.(?:js|css|woff2?|eot|ttf|otf)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 дней
              }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    // Добавляем хэш к именам файлов для предотвращения кеширования
    rollupOptions: {
      output: {
        manualChunks: undefined,
      },
    },
    // Очищаем выходную директорию перед сборкой
    emptyOutDir: true,
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    // Отключаем кеширование в режиме разработки
    headers: {
      'Cache-Control': 'no-store',
    },
    // Настройки для работы HMR в Docker
    watch: {
      usePolling: true,  // Используем polling для отслеживания изменений файлов в Docker
      interval: 1000     // Проверка каждую секунду
    },
    hmr: {
      host: '194.34.232.112', // Адрес для WebSocket соединения HMR
      port: 5174,        // Порт хоста (mapped port)
      protocol: 'ws'     // Использовать WebSocket
    },
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true
      },
      '/ws': {
        target: 'ws://backend:8000',
        ws: true
      }
    }
  }
})
