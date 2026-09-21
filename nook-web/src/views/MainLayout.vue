<template>
  <div 
    class="layout-container" 
    :style="{ backgroundColor: store.themeColor }"
  >
    <button
      v-if="isMobile && !isSidebarOpen"
      type="button"
      class="mobile-menu-trigger"
      aria-label="打开导航菜单"
      @click="toggleSidebar"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <line x1="3" y1="6" x2="21" y2="6"></line>
        <line x1="3" y1="12" x2="21" y2="12"></line>
        <line x1="3" y1="18" x2="21" y2="18"></line>
      </svg>
    </button>

    <Transition name="sidebar-fade">
      <div
        v-if="isMobile && isSidebarOpen"
        class="sidebar-backdrop"
        aria-hidden="true"
        @click="isSidebarOpen = false"
      ></div>
    </Transition>

    <Sidebar 
      :class="{
        'sidebar-open-width': isSidebarOpen && !isMobile,
        'mobile-sidebar': isMobile,
        'mobile-sidebar-open': isMobile && isSidebarOpen
      }"
      :username="currentUsername" 
      :is-open="isSidebarOpen"
      @logout="handleLogout"
      @toggle-menu="toggleSidebar"
    />
    <main class="content-area">
      <router-view></router-view>
    </main>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import axios from 'axios';
import Sidebar from '../components/Sidebar.vue';
import { store, updateTheme } from '../store'; 
import { authUser, clearAuthUser } from '@/auth';

const router = useRouter();
const route = useRoute();
const currentUsername = computed(() => authUser.value?.username || authUser.value?.email || 'User');
const isSidebarOpen = ref(true); 
const isMobile = ref(false);

const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value; };

const updateResponsiveSidebar = () => {
  const nextMobile = window.innerWidth <= 768;
  if (nextMobile !== isMobile.value) {
    isMobile.value = nextMobile;
    isSidebarOpen.value = !nextMobile;
  }
};

watch(() => route.fullPath, () => {
  if (isMobile.value) isSidebarOpen.value = false;
});

onMounted(() => {
  updateResponsiveSidebar();
  window.addEventListener('resize', updateResponsiveSidebar);
});

onBeforeUnmount(() => window.removeEventListener('resize', updateResponsiveSidebar));

const handleLogout = async () => {
  try {
    await axios.post('/api/auth/logout');
  } finally {
    clearAuthUser();
    updateTheme('#ffffff');
    router.push('/login');
  }
};
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  transition: background-color 0.3s ease; 
  overflow: hidden;
  position: relative;
}

/* ✨ 修复点：将固定的 class 改为专属的展开状态 class */
.sidebar-open-width {
  width: 14vw !important;
  flex-shrink: 0;
}

.content-area {
  flex: 1; 
  position: relative;
  overflow-y: auto;
  overflow-x: hidden;
  background-color: transparent; 
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@media (max-width: 768px) {
  .mobile-sidebar {
    position: fixed !important;
    inset: 0 auto 0 0;
    z-index: 1001;
    width: min(82vw, 280px) !important;
    height: 100dvh;
    padding: 20px !important;
    transform: translateX(-102%);
    transition: transform 0.24s cubic-bezier(0.4, 0, 0.2, 1) !important;
    background: var(--sidebar-bg, #ffffff) !important;
    box-shadow: 18px 0 45px rgba(15, 23, 42, 0.16);
  }

  .mobile-sidebar.mobile-sidebar-open {
    transform: translateX(0);
  }

  .mobile-menu-trigger {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 900;
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(148, 163, 184, 0.28);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.92);
    color: #334155;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.1);
    backdrop-filter: blur(12px);
    cursor: pointer;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1000;
    border: 0;
    padding: 0;
    background: rgba(15, 23, 42, 0.32);
    backdrop-filter: blur(2px);
    cursor: pointer;
  }

  .content-area { width: 100%; }
}

.mobile-menu-trigger:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.35);
  outline-offset: 2px;
}

.sidebar-fade-enter-active,
.sidebar-fade-leave-active { transition: opacity 0.2s ease; }
.sidebar-fade-enter-from,
.sidebar-fade-leave-to { opacity: 0; }
</style>
