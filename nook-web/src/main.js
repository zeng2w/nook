import { createApp } from 'vue'
import './api/http'
import App from './App.vue'
import router from './router' // 引入路由配置

// 在 Vue 实例挂载之前执行
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      // 强制注销所有旧的 Service Worker
      registration.unregister();
    }
  }).catch(() => {});

  // 2. 清理缓存库
  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    }).catch(() => {});
  }
}

const app = createApp(App)

app.use(router) // 挂载路由
app.mount('#app')
