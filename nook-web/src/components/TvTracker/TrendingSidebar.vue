<template>
  <div class="trending-sidebar">
    <div class="sidebar-header">
      <h3>探索发现</h3>
    </div>
    
    <div class="tabs">
      <button :class="{ active: activeTab === 'popular' }" @click="activeTab = 'popular'">排行榜</button>
      <button :class="{ active: activeTab === 'new' }" @click="activeTab = 'new'">刚上映</button>
    </div>

    <div class="show-list" v-if="!isLoading">
      <div v-for="(show, index) in displayList" :key="show.id" class="show-item">
        <div class="rank" v-if="activeTab === 'popular'">{{ index + 1 }}</div>
        <img :src="getPosterUrl(show.poster_path)" :alt="show.name" class="mini-poster" />
        <div class="show-info">
          <span class="title">{{ show.name }}</span>
          <span class="meta">
            {{ show.first_air_date ? show.first_air_date.substring(0, 4) : '未知年份' }} 
            • ⭐ {{ show.vote_average ? show.vote_average.toFixed(1) : '暂无' }}
          </span>
        </div>
      </div>
    </div>
    
    <div v-else class="loading-state">数据加载中...</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchTrendingShows, fetchNewReleases } from '@/api/tmdb';

const activeTab = ref('popular');
const popularShows = ref([]);
const newShows = ref([]);
const isLoading = ref(true);

const displayList = computed(() => {
  return activeTab.value === 'popular' ? popularShows.value : newShows.value;
});

const getPosterUrl = (path) => {
  return path ? `https://image.tmdb.org/t/p/w92${path}` : '/placeholder.jpg';
};

onMounted(async () => {
  try {
    isLoading.value = true;
    const [popRes, newRes] = await Promise.all([
      fetchTrendingShows(),
      fetchNewReleases()
    ]);
    popularShows.value = popRes.data;
    newShows.value = newRes.data;
  } catch (error) {
    console.error("加载侧边栏失败", error);
  } finally {
    isLoading.value = false;
  }
});
</script>

<style scoped>
.trending-sidebar {
  /* ✨ 优化：将宽度缩小到 280px */
  width: 280px; 
  background: #ffffff;
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.03); 
  padding: 30px 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  z-index: 5;
}

.sidebar-header h3 {
  font-size: 1.25rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 20px;
  letter-spacing: 0.5px;
}

.tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 12px;
  padding: 4px;
  margin-bottom: 24px;
}

.tabs button {
  flex: 1;
  border: none;
  background: transparent;
  padding: 8px 0;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tabs button.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); 
}

/* ✨ 优化：把侧边栏列表项变成一张张独立的“卡片” */
.show-item { 
  display: flex; 
  gap: 12px; 
  /* 增加卡片之间的上下间距 */
  margin-bottom: 16px; 
  align-items: center; 
  padding: 12px;
  border-radius: 12px;
  background: #ffffff; /* 独立纯白背景 */
  border: 1px solid #f1f5f9; /* 描边确立卡片边界 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.02); /* 微弱的底部阴影 */
  transition: all 0.2s ease;
  cursor: pointer;
}

/* 悬浮时卡片浮起，间距感更强 */
.show-item:hover {
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
  border-color: #e2e8f0;
}

.mini-poster { 
  width: 48px; /* 侧边栏变窄，海报稍微缩小一点适配 */
  border-radius: 6px; 
}

.show-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1; /* 让文字部分占据剩余空间 */
}

.title { 
  font-weight: 700; 
  font-size: 0.9rem; 
  color: #1e293b;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.meta { font-size: 0.75rem; color: #94a3b8; font-weight: 500; }
.rank { font-weight: 800; font-size: 1rem; color: #cbd5e1; width: 20px; text-align: center; flex-shrink: 0; }

.loading-state {
  text-align: center;
  color: #94a3b8;
  margin-top: 40px;
  font-size: 0.9rem;
}
</style>