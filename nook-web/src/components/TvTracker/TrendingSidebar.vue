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
            • ⭐ {{ show.vote_average.toFixed(1) }}
          </span>
        </div>
      </div>
    </div>
    <div v-else class="loading-state">加载中...</div>
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
  width: 320px;
  background: #ffffff;
  border-left: 1px solid #e2e8f0;
  padding: 20px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
/* 这里可以补充美化 CSS，比如 Tab 按钮样式、列表项 flex 布局、缩略图圆角等 */
.show-item { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.mini-poster { width: 50px; border-radius: 6px; }
.title { font-weight: 600; font-size: 0.95rem; display: block; }
.meta { font-size: 0.8rem; color: #64748b; }
.rank { font-weight: 800; font-size: 1.2rem; color: #cbd5e1; width: 20px; text-align: center; }
</style>