<template>
  <div class="layout-container">
    <Sidebar 
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
import { updateTheme } from '../store'; // 引入 store 用于重置主题

const router = useRouter();
const currentUsername = ref('');
const isSidebarOpen = ref(true); 

const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

onMounted(() => {
  const userStr = sessionStorage.getItem('current_user');
  if (userStr) {
    const user = JSON.parse(userStr);
    currentUsername.value = user.username || user.email;
  } else {
    router.push('/login');
  }
});

// 直接退出逻辑
const handleLogout = () => {
  // 1. 清除 Session
  sessionStorage.removeItem('current_user');
  
  // 2. 重置全局主题颜色为白色 (恢复出厂设置)
  updateTheme('#ffffff');

  // 3. 直接跳转回登录页
  router.push('/login');
};
</script>

<style scoped>
.layout-container {
  display: flex;
  height: 100vh;
  width: 100vw;
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
}

.content-area {
  flex: 1; 
  position: relative;
  overflow-y: auto;
  background-color: #ffffff;
  transition: width 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>