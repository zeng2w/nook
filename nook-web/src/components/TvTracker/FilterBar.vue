<template>
  <div class="filters-container">
    
    <div class="filter-group">
      <div class="scroll-wrapper">
        <button 
          v-for="cat in categories" 
          :key="cat.value" 
          class="filter-pill glass-pill" 
          :class="{ active: category === cat.value }" 
          @click="$emit('update:category', cat.value)"
        >
          <span class="pill-icon" v-if="cat.icon">{{ cat.icon }}</span>
          {{ cat.label }}
        </button>
      </div>
    </div>

    <div class="filter-group">
      <div class="scroll-wrapper">
        <button 
          v-for="st in statuses" 
          :key="st.value" 
          class="filter-pill glass-pill" 
          :class="{ active: status === st.value }" 
          @click="$emit('update:status', st.value)"
        >
          <span class="status-dot" :class="[st.value, { 'force-white': status === st.value }]"></span>
          {{ st.label }}
        </button>
      </div>
    </div>

    <div class="filter-group" v-if="networks.length > 0">
      <div class="scroll-wrapper">
        <button 
          class="filter-pill glass-pill" 
          :class="{ active: network === 'all' }" 
          @click="$emit('update:network', 'all')"
        >
          全部平台
        </button>
        <button 
          v-for="net in networks" 
          :key="net.name" 
          class="filter-pill glass-pill network-pill" 
          :class="{ active: network === net.name }" 
          @click="$emit('update:network', net.name)" 
          :title="net.name"
        >
          <img v-if="net.logo" :src="net.logo" class="network-icon" alt="logo" loading="lazy" />
          <span v-else>{{ net.name }}</span>
        </button>
      </div>
    </div>

  </div>
</template>

<script setup>
defineProps({
  category: String,
  status: String,
  network: String,
  networks: Array
});
defineEmits(['update:category', 'update:status', 'update:network']);

const categories = [
  { label: '全部', value: 'all' },
  { label: '电视剧', value: 'tv', icon: '📺' },
  { label: '动漫', value: 'anime', icon: '🎎' },
  { label: '电影', value: 'movie', icon: '🎬' },
  { label: '综艺', value: 'variety', icon: '🎤' }
];

const statuses = [
  { label: '全部', value: 'all' },
  { label: '想看', value: 'wish' },
  { label: '在看', value: 'watching' },
  { label: '已看', value: 'watched' },
  { label: '弃剧', value: 'dropped' }
];
</script>

<style scoped>
.filters-container {
  padding: 10px 40px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  /* ★ 关键修改：背景透明，边框移除 */
  background: transparent;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  border-bottom: none;
  position: relative;
}

.filter-group { display: flex; align-items: center; }

.scroll-wrapper {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 2px;
  scrollbar-width: none; 
  -ms-overflow-style: none;
  align-items: center;
}
.scroll-wrapper::-webkit-scrollbar { display: none; }

/* 按钮基础样式：毛玻璃感 */
.filter-pill {
  border: 1px solid rgba(255, 255, 255, 0.6);
  background: rgba(255, 255, 255, 0.5); /* 半透明 */
  color: #555;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  display: flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
  flex-shrink: 0;
  height: 28px;
  backdrop-filter: blur(4px);
}

.filter-pill:hover {
  background: rgba(255, 255, 255, 0.8);
  transform: translateY(-1px);
  box-shadow: 0 2px 5px rgba(0,0,0,0.03);
}

/* 选中态：流体渐变 */
.filter-pill.active {
  border: none;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); /* 蓝紫渐变 */
  color: white;
  box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3);
  font-weight: 600;
  transform: translateY(-1px);
}

.pill-icon { font-size: 0.85rem; line-height: 1; }

.status-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background-color: #ccc;
  transition: background-color 0.2s;
}
.status-dot.force-white { background-color: white !important; }
.status-dot.wish { background-color: #f59e0b; }
.status-dot.watching { background-color: #10b981; }
.status-dot.watched { background-color: #3b82f6; }
.status-dot.dropped { background-color: #9ca3af; }

.network-pill { padding: 0 10px; }
.network-icon {
  height: 14px;
  width: auto;
  object-fit: contain;
  display: block;
  filter: none; /* 保持原色 */
  opacity: 1; 
  transition: filter 0.2s;
}
.network-pill.active .network-icon {
  filter: brightness(0) invert(1); /* 选中变白 */
}

@media (max-width: 768px) {
  .filters-container { padding: 8px 16px; gap: 8px; }
  .scroll-wrapper { padding-right: 16px; }
}
</style>