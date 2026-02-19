import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import { VitePWA } from 'vite-plugin-pwa' // 👈 引入 PWA 插件

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    // 👇 新增 PWA 配置
    VitePWA({
      registerType: 'autoUpdate', // 自动更新 Service Worker
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'], // 静态资源
      manifest: {
        name: 'Nook 追剧记录', // 安装后 App 的全称
        short_name: 'Nook TV',   // 桌面图标下的短名字
        description: '你的个人追剧与观影记录管家',
        theme_color: '#fcfcfc',  // 手机状态栏的主题色
        background_color: '#fcfcfc', // App 启动时的闪屏背景色
        display: 'standalone',   // 独立显示，隐藏浏览器 UI (关键！)
        icons: [
          // 注意：这里默认你 public 目录下有 favicon.ico。
          // 以后如果你想让图标在手机上更清晰，可以在 public 里放两张 png 图片，然后取消下面这两段的注释：
          /*
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
          */
        ]
      }
    })
  ],
  server: {
    // 【关键配置】本地开发时的代理
    proxy: {
      '/api': {
        target: 'http://localhost:5001', // 本地后端的地址
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})