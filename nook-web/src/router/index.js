import { createRouter, createWebHistory } from 'vue-router';

// 引入组件
import Login from '../components/Login.vue';
import Register from '../components/Register.vue';
import SimpleCounter from '../components/SimpleCounter.vue';
import MainLayout from '../views/MainLayout.vue'; // 布局组件
import DashboardHome from '../components/DashboardHome.vue'; // 仪表盘组件
import TvTrackerView from '../views/TvTrackerView.vue'; // 【新增】追剧记录组件

const routes = [
  // 1. 根路径重定向到登录
  { path: '/', redirect: '/login' },
  
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

// 路由守卫：检查用户是否已登录
router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('current_user');
  
  // 如果页面需要权限 (meta.requiresAuth) 且用户没登录 -> 跳回 Login
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;