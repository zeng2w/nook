import { createApp } from 'vue'
import './api/http'
import App from './App.vue'
import router from './router' // 引入路由配置

const LEGACY_CACHE_CLEANUP_KEY = 'nook:legacy-cache-cleanup:v1'

// 旧版本曾注册过 Service Worker。清理只执行一次，避免每次启动都删除缓存。
const cleanupLegacyBrowserCachesOnce = async () => {
  try {
    if (localStorage.getItem(LEGACY_CACHE_CLEANUP_KEY) === 'done') return
  } catch {
    // 隐私模式下 localStorage 可能不可用，仍尝试完成本次清理。
  }

  const cleanupTasks = []
  if ('serviceWorker' in navigator) {
    cleanupTasks.push(
      navigator.serviceWorker.getRegistrations().then(registrations => (
        Promise.all(registrations.map(registration => registration.unregister()))
      ))
    )
  }
  if (window.caches) {
    cleanupTasks.push(
      window.caches.keys().then(keys => Promise.all(keys.map(key => window.caches.delete(key))))
    )
  }

  await Promise.allSettled(cleanupTasks)
  try {
    localStorage.setItem(LEGACY_CACHE_CLEANUP_KEY, 'done')
  } catch {
    // 无法持久化标记时不影响应用启动。
  }
}

void cleanupLegacyBrowserCachesOnce()

const app = createApp(App)

app.use(router) // 挂载路由
app.mount('#app')
