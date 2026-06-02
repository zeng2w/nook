<template>
  <div class="trending-sidebar-modern">
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
/* ★ 与 UpdateCalendar 保持 100% 一致的卡片风格 */
.trending-sidebar-modern {
  width: 100%; 
  flex: 1; /* 让它占满边栏剩下的所有空间 */
  box-sizing: border-box;
  background: #ffffff;
  border-radius: 20px; /* 统一圆角 */
  padding: 20px 16px; /* 统一内边距 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04); /* 统一阴影 */
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden; /* 防止内部溢出破坏圆角 */
}

.sidebar-header h3 {
  font-size: 1.05rem; /* 与日历组件对齐 */
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 16px 0;
}

.tabs {
  display: flex;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  margin-bottom: 16px;
  flex-shrink: 0;
}

.tabs button {
  flex: 1; border: none; background: transparent; padding: 6px 0; border-radius: 8px; font-weight: 600; font-size: 0.8rem; color: #64748b; cursor: pointer; transition: all 0.3s ease;
}
.tabs button.active { background: #ffffff; color: #0f172a; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }

/* ★ 加入内部独立滚动 */
.show-list {
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  display: flex;
  flex-direction: column;
}
.show-list::-webkit-scrollbar { width: 4px; }
.show-list::-webkit-scrollbar-track { background: transparent; }
.show-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.show-list::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.show-item { 
  display: flex; gap: 12px; margin-bottom: 12px; align-items: center; padding: 8px; border-radius: 10px; background-color: #ffffff; border: 1px solid #f1f5f9; box-shadow: 0 2px 6px rgba(0, 0, 0, 0.02); transition: all 0.2s ease; cursor: pointer;
}
.show-item:hover { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06); transform: translateY(-2px); border-color: #e2e8f0; }

.mini-poster { width: 36px; height: 50px; border-radius: 6px; object-fit: cover; }
.show-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; justify-content: center; }
.title { font-weight: 700; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 0.7rem; color: #94a3b8; font-weight: 500; }
.rank { font-weight: 800; font-size: 1rem; color: #cbd5e1; width: 18px; text-align: center; flex-shrink: 0; }
.loading-state { text-align: center; color: #94a3b8; margin-top: 40px; font-size: 0.85rem; }
</style>