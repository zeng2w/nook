<template>
  <div class="trending-sidebar-modern">
    <div class="sidebar-header">
      <h3>热门榜单 <span class="top-five">TOP 5</span></h3>
    </div>
    
    <div class="tabs">
      <button :class="{ active: activeTab === 'popular' }" @click="selectTab('popular')">热门排行</button>
      <button :class="{ active: activeTab === 'new' }" @click="selectTab('new')">刚上映</button>
    </div>

    <div v-if="isLoading" class="loading-state">数据加载中...</div>

    <div v-else-if="loadError" class="loading-state error-state">
      <span>{{ loadError }}</span>
      <button @click="loadTrending">重试</button>
    </div>

    <div v-else-if="displayList.length === 0" class="loading-state">暂无内容</div>

    <div v-else class="show-list">
      <div v-for="(show, index) in displayList" :key="show.id" class="show-item">
        <div class="rank" v-if="activeTab === 'popular'">{{ index + 1 }}</div>
        <img v-if="show.poster_path" :src="getPosterUrl(show.poster_path)" :alt="show.name" class="mini-poster" loading="lazy" decoding="async" />
        <div v-else class="mini-poster poster-placeholder" aria-hidden="true">{{ show.name?.charAt(0) || '?' }}</div>
        <div class="show-info">
          <span class="title">{{ show.name }}</span>
          <span class="meta">
            {{ getUpdateText(show) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { fetchTrendingShows, fetchNewReleases } from '@/api/tmdb';
import { getApiErrorMessage } from '@/api/errors';

const props = defineProps({ shows: { type: Array, default: () => [] } });
const getUpdateText = show => {
  const tracked = props.shows.find(item => String(item.tmdbId) === String(show.id));
  if (tracked) return `已更新 ${tracked.airedEpisodes || 0} 集`;
  return show.first_air_date ? `首播 ${show.first_air_date} · ${show.vote_average ? show.vote_average.toFixed(1) + ' 分' : '暂无评分'}` : '播出信息待更新';
};
const activeTab = ref('popular');
const popularShows = ref([]);
const newShows = ref([]);
const loadedTabs = ref({ popular: false, new: false });
const isLoading = ref(false);
const loadError = ref('');

const displayList = computed(() => {
  return (activeTab.value === 'popular' ? popularShows.value : newShows.value).slice(0, 5);
});

const getPosterUrl = (path) => {
  return `https://image.tmdb.org/t/p/w92${path}`;
};

const loadTrending = async () => {
  const requestedTab = activeTab.value;
  try {
    isLoading.value = true;
    loadError.value = '';
    const response = requestedTab === 'popular'
      ? await fetchTrendingShows()
      : await fetchNewReleases();
    if (requestedTab === 'popular') popularShows.value = response.data;
    else newShows.value = response.data;
    loadedTabs.value = { ...loadedTabs.value, [requestedTab]: true };
  } catch (error) {
    console.error("加载侧边栏失败", error);
    loadError.value = getApiErrorMessage(error, '探索内容加载失败');
  } finally {
    isLoading.value = false;
  }
};

const selectTab = (tab) => {
  if (isLoading.value) return;
  activeTab.value = tab;
  loadError.value = '';
  if (!loadedTabs.value[tab]) loadTrending();
};
onMounted(loadTrending);
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
.poster-placeholder { display: grid; place-items: center; flex-shrink: 0; background: #e2e8f0; color: #64748b; font-size: 1rem; font-weight: 800; }
.show-info { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 0; justify-content: center; }
.title { font-weight: 700; font-size: 0.85rem; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta { font-size: 0.7rem; color: #94a3b8; font-weight: 500; }
.rank { font-weight: 800; font-size: 1rem; color: #cbd5e1; width: 18px; text-align: center; flex-shrink: 0; }
.loading-state { text-align: center; color: #94a3b8; margin-top: 40px; font-size: 0.85rem; }
.error-state { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.error-state button { border: 1px solid #cbd5e1; background: #fff; color: #475569; border-radius: 8px; padding: 6px 12px; cursor: pointer; }
.explore-empty { flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 14px; padding: 16px; text-align: center; color: #94a3b8; font-size: 0.78rem; line-height: 1.5; }
.explore-empty button { border: none; background: var(--theme-primary, #6366f1); color: #fff; border-radius: 9px; padding: 8px 14px; font-weight: 600; cursor: pointer; }
.explore-empty button:hover { background: var(--theme-primary-hover, #4f46e5); }

.trending-sidebar-modern { flex: 0 0 auto; border-radius: 16px; padding: 18px 14px 8px; box-shadow: 0 3px 14px #20213c04; }
.sidebar-header h3 { font-size: 13px; display: flex; justify-content: space-between; align-items: center; font-weight: 650; }
.top-five { font-size: 9px; letter-spacing: 1.5px; color: #aca4bb; font-weight: 500; }
.tabs { background: #f7f6fa; margin-bottom: 12px; }.tabs button { font-size: 11px; }.tabs button.active { color: #8670a7; }
.show-list { overflow: visible; padding: 0; }.show-item { gap: 9px; padding: 9px 0; margin: 0; border: 0; border-radius: 0; border-bottom: 1px solid #f3f2f7; box-shadow: none; cursor: default; }.show-item:last-child { border: 0; }.show-item:hover { transform: none; box-shadow: none; }
.rank { width: 12px; font-size: 12px; font-weight: 500; color: #a3a0ad; }.show-item:first-child .rank { color: #9a80bf; }.mini-poster { width: 34px; height: 51px; }.title { font-size: 12px; font-weight: 550; }.meta { font-size: 9px; color: #aaa6b4; }
.loading-state { margin: 12px 0 20px; font-size: 12px; }
</style>
