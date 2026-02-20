import { createApp } from 'vue'
import App from './App.vue'
import router from './router' // 引入路由配置

// 在 Vue 实例挂载之前执行
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(registrations) {
    for (let registration of registrations) {
      // 强制注销所有旧的 Service Worker
      registration.unregister();
      console.log('旧版 Service Worker 已注销');
    }
  }).catch(function(err) {
    console.log('注销 Service Worker 失败: ', err);
  });

  // 2. 清理缓存库
  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(key => caches.delete(key));
    });
  }
}

const app = createApp(App)

app.use(router) // 挂载路由
app.mount('#app')