<template>
  <aside 
    class="sidebar" 
    :class="{ 'closed': !isOpen, 'light-theme': store.isLightMode }"
    :style="{ backgroundColor: store.themeColor }"
  >
    
    <div class="sidebar-header">
      <div class="user-profile" v-show="isOpen">
        <div class="avatar-placeholder" :class="{ 'light-avatar': store.isLightMode }">
          {{ username.charAt(0).toUpperCase() }}
        </div>
        <div class="user-info">
          <span class="welcome-text">Hello,</span>
          <span class="username">{{ username }}</span>
        </div>
      </div>

      <button class="menu-toggle-btn" @click="$emit('toggle-menu')">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>
    </div>

    <nav class="nav-menu">
      <router-link to="/home/dashboard" class="nav-item" active-class="active" :title="!isOpen ? 'Dashboard' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
        <span v-if="isOpen">Dashboard</span>
      </router-link>

      <router-link to="/home/counter" class="nav-item" active-class="active" :title="!isOpen ? 'Simple Counter' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span v-if="isOpen">Simple Counter</span>
      </router-link>

      <div class="nav-item disabled" :title="!isOpen ? 'Expense (Soon)' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span v-if="isOpen">Expense</span>
      </div>
      
      <div class="nav-item disabled" :title="!isOpen ? 'TV Tracker (Soon)' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
        <span v-if="isOpen">TV Tracker</span>
      </div>
    </nav>

    <div class="logout-section">
      <button class="logout-btn" @click="$emit('logout')" :title="!isOpen ? 'Logout' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
        <span v-if="isOpen">Logout</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import { store } from '../store'; // 引入全局 Store

defineProps({
  username: { type: String, default: 'User' },
  isOpen: { type: Boolean, default: true }
});

defineEmits(['logout', 'toggle-menu']);
</script>

<style scoped>
/* 基础样式 (默认深色模式) */
.sidebar {
  width: 260px;
  height: 100vh;
  /* 默认文字灰白 (适合深色背景) */
  color: rgba(255, 255, 255, 0.7); 
  display: flex; 
  flex-direction: column; 
  padding: 20px; 
  box-sizing: border-box;
  /* 平滑过渡：宽度和背景色 */
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), background-color 0.3s ease;
  overflow: hidden; 
  border-right: 1px solid rgba(255,255,255,0.1);
  position: relative;
}

/* 折叠状态 */
.sidebar.closed {
  width: 80px;
  padding: 20px 10px;
}

/* === 浅色模式适配 (Light Mode) === */
.sidebar.light-theme {
  color: #666; /* 浅色模式下文字深灰 */
  border-right: 1px solid #eee;
}
.sidebar.light-theme .username { color: #333; }
.sidebar.light-theme .menu-toggle-btn { color: #333; }
.sidebar.light-theme .menu-toggle-btn:hover { background-color: rgba(0,0,0,0.05); }
.sidebar.light-theme .nav-item:hover,
.sidebar.light-theme .nav-item.active {
  background-color: rgba(0,0,0,0.05); color: #000;
}
.sidebar.light-theme .logout-btn:hover { background-color: rgba(0,0,0,0.05); color: #d32f2f; }
.sidebar.light-theme .avatar-placeholder.light-avatar { background-color: #333; color: white; }

/* === 深色模式默认高亮 === */
.nav-item:hover, .nav-item.active {
  background-color: rgba(255,255,255,0.1); color: white;
}
.menu-toggle-btn:hover { background-color: rgba(255,255,255,0.1); }
.logout-btn:hover { background-color: rgba(255,255,255,0.1); color: #ff5252; }

/* --- 布局细节 --- */

/* Header */
.sidebar-header {
  display: flex; 
  align-items: center; 
  justify-content: space-between; /* 展开时：两端对齐 */
  height: 50px; 
  margin-bottom: 40px;
}
.sidebar.closed .sidebar-header {
  justify-content: center; /* 折叠时：居中 */
}

/* 用户信息 */
.user-profile { 
  display: flex; 
  align-items: center; 
  gap: 12px; 
  white-space: nowrap; 
  overflow: hidden;
}
.avatar-placeholder {
  min-width: 36px; width: 36px; height: 36px;
  background-color: white; color: black; /* 深色模式头像 */
  border-radius: 50%;
  display: flex; justify-content: center; align-items: center; 
  font-weight: bold; font-size: 1rem;
}
.user-info { display: flex; flex-direction: column; }
.welcome-text { font-size: 0.7rem; opacity: 0.7; line-height: 1.2; }
.username { font-weight: 600; font-size: 0.9rem; color: white; }

/* 菜单按钮 */
.menu-toggle-btn {
  background: transparent; 
  border: none; 
  cursor: pointer; 
  padding: 8px; 
  border-radius: 8px;
  color: inherit; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  transition: 0.2s;
}

/* 导航 */
.nav-menu { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.nav-item {
  display: flex; align-items: center; gap: 12px; 
  padding: 12px;
  border-radius: 8px; 
  text-decoration: none; 
  color: inherit; 
  font-weight: 500;
  transition: all 0.2s; 
  white-space: nowrap; 
  cursor: pointer;
  height: 48px;
  box-sizing: border-box;
}
.sidebar.closed .nav-item { justify-content: center; }
.nav-item.disabled { opacity: 0.3; cursor: not-allowed; }
.icon { min-width: 24px; }

/* 退出 */
.logout-section { margin-top: auto; padding-top: 20px; }
.logout-btn {
  width: 100%; 
  display: flex; align-items: center; gap: 10px; 
  padding: 12px;
  border: none; 
  background: transparent; 
  border-radius: 8px;
  color: inherit; 
  font-weight: 500; 
  cursor: pointer; 
  transition: 0.2s; 
  white-space: nowrap;
  height: 48px;
}
.sidebar.closed .logout-btn { justify-content: center; }
</style>