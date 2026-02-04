<template>
  <aside 
    class="sidebar" 
    :class="{ 'closed': !isOpen, 'light-theme': store.isLightMode }"
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

      <div class="nav-item disabled" :title="!isOpen ? 'Accounting (Soon)' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
        <span v-if="isOpen">Accounting</span>
      </div>

      <router-link to="/home/counter" class="nav-item" active-class="active" :title="!isOpen ? 'Simple Counter' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
        <span v-if="isOpen">Counter</span>
      </router-link>
      
      <router-link to="/home/tv-shows" class="nav-item" active-class="active" :title="!isOpen ? 'TV Shows' : ''">
        <svg class="icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
        <span v-if="isOpen">TV Shows</span>
      </router-link>
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
import { store } from '../store'; 

defineProps({
  username: { type: String, default: 'User' },
  isOpen: { type: Boolean, default: true }
});

defineEmits(['logout', 'toggle-menu']);
</script>

<style scoped>
.sidebar {
  width: 260px;
  height: 100vh;
  /* 【核心修改】文字改为深色，以适应浅色背景 */
  color: rgba(0, 0, 0, 0.7); 
  display: flex; 
  flex-direction: column; 
  padding: 20px; 
  box-sizing: border-box;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  overflow: hidden; 
  /* 【核心修改】透明背景 */
  background-color: transparent; 
  border-right: 1px solid rgba(0,0,0,0.05);
  position: relative;
}

.sidebar.closed { width: 80px; padding: 20px 10px; }

/* === 样式调整 === */
.username { color: #333; }
.menu-toggle-btn { color: #333; }
.menu-toggle-btn:hover { background-color: rgba(0,0,0,0.05); }

.nav-item {
  display: flex; align-items: center; gap: 12px; 
  padding: 12px; border-radius: 8px; 
  text-decoration: none; color: inherit; font-weight: 500;
  transition: all 0.2s; white-space: nowrap; cursor: pointer; height: 48px;
}
.nav-item:hover, .nav-item.active {
  background-color: rgba(0,0,0,0.05); color: #000;
}
.sidebar.closed .nav-item { justify-content: center; }
.nav-item.disabled { opacity: 0.3; cursor: not-allowed; }
.icon { min-width: 24px; }

.sidebar-header { display: flex; align-items: center; justify-content: space-between; height: 50px; margin-bottom: 40px; }
.sidebar.closed .sidebar-header { justify-content: center; }
.user-profile { display: flex; align-items: center; gap: 12px; white-space: nowrap; overflow: hidden; }
.avatar-placeholder { min-width: 36px; width: 36px; height: 36px; background-color: #333; color: white; border-radius: 50%; display: flex; justify-content: center; align-items: center; font-weight: bold; font-size: 1rem; }
.user-info { display: flex; flex-direction: column; }
.welcome-text { font-size: 0.7rem; opacity: 0.7; line-height: 1.2; }
.username { font-weight: 600; font-size: 0.9rem; }
.menu-toggle-btn { background: transparent; border: none; cursor: pointer; padding: 8px; border-radius: 8px; color: inherit; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.nav-menu { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.logout-section { margin-top: auto; padding-top: 20px; }
.logout-btn { width: 100%; display: flex; align-items: center; gap: 10px; padding: 12px; border: none; background: transparent; border-radius: 8px; color: inherit; font-weight: 500; cursor: pointer; transition: 0.2s; white-space: nowrap; height: 48px; }
.logout-btn:hover { background-color: rgba(0,0,0,0.05); color: #d32f2f; }
.sidebar.closed .logout-btn { justify-content: center; }
</style>