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
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import Sidebar from '../components/Sidebar.vue';
import { store, updateTheme } from '../store'; 

const router = useRouter();
const currentUsername = ref('');
const isSidebarOpen = ref(true); 

const toggleSidebar = () => { isSidebarOpen.value = !isSidebarOpen.value; };

onMounted(() => {
  const userStr = sessionStorage.getItem('current_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    currentUsername.value = user.username || user.email;
  } else {
    router.push('/login');
  }
});

const handleLogout = () => {
  sessionStorage.removeItem('current_user');
  updateTheme('#ffffff');
  router.push('/login');
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
  width: 16vw !important;
  flex-shrink: 0;
}

.content-area {
  flex: 1; 
  position: relative;
  overflow-y: auto;
  background-color: transparent; 
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>