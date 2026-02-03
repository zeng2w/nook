<template>
  <div class="dashboard-empty-state">
    <h1>Welcome back!</h1>
    <p>Select a tool from the sidebar to get started.</p>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { updateTheme } from '../store';

onMounted(() => {
  // 进 Dashboard 时，强制变回白色背景 (Light Mode)
  updateTheme('#ffffff');
});
</script>

<style scoped>
.dashboard-empty-state {
  display: flex; flex-direction: column; justify-content: center; align-items: center;
  height: 100%; width: 100%;
  background-color: #ffffff; /* Dashboard 是白色的 */
  color: #333;
}
</style>