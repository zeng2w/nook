import { createRouter, createWebHistory } from 'vue-router';
import { hydrateAuth } from '@/auth';

// 页面组件按路由懒加载，减少首次打开时需要下载和解析的 JavaScript。
const Login = () => import('../components/Login.vue');
const Register = () => import('../components/Register.vue');
const SimpleCounter = () => import('../components/SimpleCounter.vue');
const MainLayout = () => import('../views/MainLayout.vue');
const DashboardHome = () => import('../views/DashboardHome.vue');
const TvTrackerView = () => import('../views/TvTrackerView.vue');

const routes = [
  // 1. 根路径重定向到登录
  { path: '/', redirect: '/home' },
  
  // 2. 登录页
  { path: '/login', name: 'Login', component: Login },
  
  // 3. 注册页
  { path: '/register', name: 'Register', component: Register },
  
  // 4. 核心功能区 (需要登录 + 侧边栏布局)
  {
    path: '/home',
    component: MainLayout, // 所有 /home 下的页面都共享这个 Sidebar 布局
    meta: { requiresAuth: true }, // 路由守卫标记
    
    // 子路由：渲染在 MainLayout 的 <router-view> 中
    children: [
      {
        path: '', // 默认 /home 自动跳转到 dashboard
        redirect: '/home/dashboard'
      },
      {
        path: 'dashboard', // 完整路径: /home/dashboard
        name: 'Dashboard',
        component: DashboardHome
      },
      {
        path: 'counter', // 完整路径: /home/counter
        name: 'Counter',
        component: SimpleCounter
      },
      {
        path: 'tv-shows', // 完整路径: /home/tv-shows
        name: 'TvShows',
        component: TvTrackerView
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫始终以服务端 Cookie 会话为准，因此新标签页也能恢复登录状态。
router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) return true;

  const user = await hydrateAuth();
  return user ? true : '/login';
});

export default router;
