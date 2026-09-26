<template>
  <div v-if="loading" class="calendar-load-status" role="status">正在刷新日历…</div>
  <div v-else-if="error" class="calendar-load-status" role="alert">
    {{ error }}{{ hasData ? '，当前显示上次加载的数据。' : '。' }}
    <button type="button" @click="$emit('retry')">重试</button>
  </div>
</template>
<script setup>
defineProps({ loading: Boolean, error: { type: String, default: '' }, hasData: Boolean });
defineEmits(['retry']);
</script>
<style scoped>
.calendar-load-status { padding: 10px 12px; font-size: 12px; color: #756684; background: #f7f4fb; flex-shrink: 0; }
button { margin-left: 6px; border: 0; background: transparent; color: #6f489a; cursor: pointer; text-decoration: underline; }
</style>
