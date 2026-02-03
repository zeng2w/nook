import { createRouter, createWebHistory } from 'vue-router';
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import SimpleCounter from '../components/SimpleCounter.vue';
import MainLayout from '../views/MainLayout.vue'; // 新建的布局
import DashboardHome from '../components/DashboardHome.vue'; // 新建的空白页

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', name: 'Login', component: Login },
  { path: '/register', name: 'Register', component: Register },
  
  // --- 嵌套路由配置 ---
  {
    path: '/home',
    component: MainLayout, // 只要是 /home 开头的，都使用这个带侧边栏的布局
    meta: { requiresAuth: true },
    // 子路由：它们会显示在 MainLayout 的 <router-view> 位置
    children: [
      {
        path: '', // 默认 /home 跳转到 dashboard
        redirect: '/home/dashboard'
      },
      {
        path: 'dashboard', // 地址: /home/dashboard
        name: 'Dashboard',
        component: DashboardHome
      },
      {
        path: 'counter', // 地址: /home/counter
        name: 'Counter',
        component: SimpleCounter
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫保持不变
router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('current_user');
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;