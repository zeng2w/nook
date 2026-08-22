<template>
  <div 
    class="layout-container" 
    :style="{ backgroundColor: store.themeColor }"
  >
    <Sidebar 
      :class="{ 'sidebar-open-width': isSidebarOpen }"
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';
import Sidebar from '../components/Sidebar.vue';
import { store, updateTheme } from '../store'; 
import { authUser, clearAuthUser } from '@/auth';

const router = useRouter();
const currentUsername = computed(() => authUser.value?.username || authUser.value?.email || 'User');
const isSidebarOpen = ref(true); 
let isMobile = false;

const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value; };

const updateResponsiveSidebar = () => {
  const nextMobile = window.innerWidth <= 768;
  if (nextMobile !== isMobile) {
    isMobile = nextMobile;
    isSidebarOpen.value = !nextMobile;
  }
};

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
  background-color: transparent; 
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

@media (max-width: 768px) {
  .sidebar-open-width { width: 220px !important; }
}
</style>
