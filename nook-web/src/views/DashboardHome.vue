<template>
  <div class="dashboard-module">
    <div class="dashboard-header">
      <div class="header-text">
        <h1>Dashboard</h1>
        <p class="subtitle">欢迎回来，查看您的追剧数据概览</p>
      </div>
      <button class="manage-btn" @click="$router.push('/home/tv-shows')">
        管理剧集 <span>→</span>
      </button>
    </div>

    <div class="stats-section">
      <TvStatsOverview 
        :status-counts="statusCounts"
        :progress-stats="progressStats"
      />
    </div>

    <div class="heatmap-section-card">
      <div class="card-header">
        <h2>观影活跃度</h2>
        <div class="header-legend">
          <span class="legend-text">Less</span>
          <div class="legend-dots">
            <div class="dot l-0"></div>
            <div class="dot l-1"></div>
            <div class="dot l-2"></div>
            <div class="dot l-3"></div>
            <div class="dot l-4"></div>
          </div>
          <span class="legend-text">More</span>
        </div>
      </div>
      
      <div class="card-body">
        <TvHeatmap :activities="historyData" />
      </div>
    </div>

    <div v-if="isLoading" class="state-box">
      <div class="spinner"></div> 数据加载中...
    </div>
    
    <div v-if="!isLoading && shows.length === 0" class="state-box empty">
      <p>暂无数据，快去添加第一部剧集吧！</p>
      <button class="primary-btn" @click="$router.push('/home/tv-shows')">去添加</button>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { updateTheme } from '@/store';
import { fetchTvLogApi } from '@/api/shows'; // 注意：只留获取热力图的API

// 👇 新增：引入全局剧集状态
import { useGlobalShows } from '@/composables/useGlobalShows';

import TvStatsOverview from '@/components/home/TvStatsOverview.vue';
import TvHeatmap from '@/components/home/TvHeatmap.vue';
import { useTvStatistics } from '@/composables/useTvStatistics';

// 👇 解构出全局变量和方法
const { shows, isLoading, fetchGlobalShows } = useGlobalShows();

const historyData = ref({}); 
const { statusCounts, progressStats } = useTvStatistics(shows);

const getCurrentUserId = () => { 
  const userStr = sessionStorage.getItem('current_user'); 
  return userStr ? JSON.parse(userStr).id : null; 
};

// 获取热力图数据保持不变
const fetchHistory = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  try {
    const res = await fetchTvLogApi(userId);
    const map = {};
    if (Array.isArray(res.data)) {
      res.data.forEach(item => {
        const dateObj = new Date(item.date);
        const dateStr = dateObj.toLocaleDateString('en-CA'); 
        map[dateStr] = (map[dateStr] || 0) + item.count;
      });
    }
    historyData.value = map;
  } catch (err) {
    console.error("❌ 获取热力图数据失败:", err);
  }
};

onMounted(async () => {
  updateTheme('#f7f9fc'); 
  const userId = getCurrentUserId();
  
  // 👇 并发请求全局剧集和热力图数据
  await Promise.all([
    fetchGlobalShows(userId), 
    fetchHistory()
  ]);
});
</script>

<style scoped>
.dashboard-module {
  padding: 40px 60px;
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部 */
.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
.dashboard-header h1 { font-size: 2.2rem; font-weight: 800; color: #1d1d1f; margin: 0 0 6px 0; letter-spacing: -1px; }
.subtitle { color: #64748b; font-size: 1rem; margin: 0; }

.manage-btn {
  background: transparent; border: none; color: #2563eb; font-weight: 600; font-size: 0.95rem; 
  cursor: pointer; display: flex; align-items: center; gap: 4px; padding: 8px 0; transition: opacity 0.2s;
}
.manage-btn:hover { opacity: 0.7; }
.manage-btn span { transition: transform 0.2s; }
.manage-btn:hover span { transform: translateX(3px); }

/* 区域 1: 统计 */
.stats-section { margin-bottom: 24px; }

/* 区域 2: 热力图卡片 */
.heatmap-section-card {
  background: #fff;
  border-radius: 20px;
  padding: 24px 30px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0,0,0,0.03);
}

.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.card-header h2 { font-size: 1.1rem; font-weight: 700; color: #334155; margin: 0; }

.header-legend { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #94a3b8; }
.legend-dots { display: flex; gap: 3px; }
.dot { width: 10px; height: 10px; border-radius: 2px; }
/* 图例颜色保持一致 */
.l-0 { background-color: #f1f5f9; } .l-1 { background-color: #bfdbfe; } 
.l-2 { background-color: #60a5fa; } .l-3 { background-color: #3b82f6; } .l-4 { background-color: #1e40af; }

/* 状态提示 */
.state-box { padding: 60px; text-align: center; color: #999; border-radius: 16px; border: 2px dashed #e2e8f0; margin-top: 20px; }
.primary-btn { margin-top: 15px; background: #000; color: #fff; border: none; padding: 10px 24px; border-radius: 8px; cursor: pointer; font-weight: 600; }
.primary-btn:hover { opacity: 0.8; }

@media (max-width: 768px) {
  .dashboard-module { padding: 20px; }
  .dashboard-header { flex-direction: column; align-items: flex-start; gap: 10px; }
}
</style>