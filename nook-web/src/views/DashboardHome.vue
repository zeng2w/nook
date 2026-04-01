<template>
  <div class="dashboard-module">
    <div class="ambient-glow glow-1"></div>
    <div class="ambient-glow glow-2"></div>

    <div class="dashboard-content">
      <div class="dashboard-header">
        <div class="header-text">
          <h1>Dashboard</h1>
          <p class="subtitle">欢迎回来，查看您的追剧数据概览</p>
        </div>
        <button class="manage-btn" @click="$router.push('/home/tv-shows')">
          管理剧集 <span>→</span>
        </button>
      </div>

      <div v-if="isLoading" class="glass-card state-box">
        <div class="spinner"></div> <span>数据加载中...</span>
      </div>

      <template v-else>
        <div v-if="shows.length === 0" class="glass-card state-box empty">
          <p>暂无数据，快去添加第一部剧集吧！</p>
          <button class="primary-btn" @click="$router.push('/home/tv-shows')">去添加</button>
        </div>

        <div v-else>
          <div class="stats-section">
            <TvStatsOverview 
              :status-counts="statusCounts"
              :progress-stats="progressStats"
            />
          </div>

          <div class="glass-card heatmap-section-card">
            <div class="card-header">
              <div class="title-with-select">
                <h2>观影活跃度</h2>
                <select v-model="heatmapYearMode" class="glass-selector">
                  <option value="rolling">最近一年</option>
                  <option v-for="year in availableYears" :key="year" :value="year">
                    {{ year }} 年
                  </option>
                </select>
              </div>

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
              <TvHeatmap :activities="historyData" :year-mode="heatmapYearMode" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { updateTheme } from '@/store';
import { fetchShowsApi, fetchTvLogApi } from '@/api/shows';

import TvStatsOverview from '@/components/home/TvStatsOverview.vue';
import TvHeatmap from '@/components/home/TvHeatmap.vue';
import { useTvStatistics } from '@/composables/useTvStatistics';

const shows = ref([]);
const historyData = ref({}); 
const isLoading = ref(true);
const heatmapYearMode = ref('rolling');

const { statusCounts, progressStats } = useTvStatistics(shows);

// ★ 优化：自动往前填充过去 5 年的年份选项
const availableYears = computed(() => {
  const years = new Set();
  const currentYear = new Date().getFullYear();
  
  // 强制灌入最近的 5 个年份作为基础选项
  for (let y = currentYear; y >= currentYear - 5; y--) {
    years.add(y);
  }

  // 如果历史数据里有更早的，也自动加进来
  if (historyData.value) {
    Object.keys(historyData.value).forEach(dateStr => {
      const year = parseInt(dateStr.substring(0, 4), 10);
      if (!isNaN(year)) years.add(year);
    });
  }
  
  return Array.from(years).sort((a, b) => b - a);
});

const getCurrentUserId = () => { 
  try {
    const userStr = sessionStorage.getItem('current_user'); 
    return userStr ? JSON.parse(userStr).id : null; 
  } catch(e) {
    return null;
  }
};

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

const fetchShows = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  try {
    const res = await fetchShowsApi(userId); 
    shows.value = res.data;
  } catch (err) {
    console.error("❌ 获取剧集数据失败:", err);
  } 
};

onMounted(async () => {
  updateTheme('#f5f7fa'); // 换一个更加素雅干净的底色
  isLoading.value = true;
  await Promise.all([fetchShows(), fetchHistory()]);
  isLoading.value = false;
});
</script>

<style scoped>
/* 整个模块基础与环境光底色 */
.dashboard-module { 
  position: relative;
  min-height: 100vh;
  padding: 40px 60px; 
  background-color: #f5f7fa;
  overflow: hidden;
}

/* ★ 高级感环境光球：给毛玻璃提供柔和的色彩折射 */
.ambient-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  z-index: 0;
  opacity: 0.6;
  pointer-events: none;
}
.glow-1 {
  top: -100px;
  left: -50px;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, rgba(219, 234, 254, 0.8) 0%, rgba(255,255,255,0) 70%); /* 柔和浅蓝 */
}
.glow-2 {
  bottom: -150px;
  right: 10%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(243, 232, 255, 0.7) 0%, rgba(255,255,255,0) 70%); /* 柔和浅紫 */
}

/* 内容层提上去 */
.dashboard-content {
  position: relative;
  max-width: 1200px; 
  margin: 0 auto;
  z-index: 1;
}

.dashboard-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 30px; }
.dashboard-header h1 { font-size: 2.4rem; font-weight: 800; color: #1e293b; margin: 0 0 6px 0; letter-spacing: -1px; }
.subtitle { color: #64748b; font-size: 1.05rem; margin: 0; }

.manage-btn { 
  background: rgba(255, 255, 255, 0.4); 
  border: 1px solid rgba(255, 255, 255, 0.6); 
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  color: #3b82f6; font-weight: 600; font-size: 0.95rem; 
  cursor: pointer; display: flex; align-items: center; gap: 6px; 
  padding: 8px 16px; border-radius: 12px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); 
  box-shadow: 0 2px 10px rgba(0,0,0,0.02);
}
.manage-btn:hover { background: rgba(255, 255, 255, 0.8); transform: translateY(-2px); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.manage-btn span { transition: transform 0.2s; }
.manage-btn:hover span { transform: translateX(3px); }

/* ★ 核心：通用毛玻璃卡片样式 */
.glass-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
}

.stats-section { margin-bottom: 24px; }
.heatmap-section-card { padding: 30px; }

/* 头部与选择器 */
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.title-with-select { display: flex; align-items: center; gap: 16px; }
.title-with-select h2 { font-size: 1.15rem; font-weight: 700; color: #1e293b; margin: 0; }

.glass-selector {
  appearance: none;
  background-color: rgba(255, 255, 255, 0.4);
  background-image: url('data:image/svg+xml;utf8,<svg fill="none" stroke="%23475569" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>');
  background-repeat: no-repeat; background-position: right 10px center; background-size: 14px;
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 10px;
  padding: 6px 36px 6px 14px;
  font-size: 0.85rem; font-weight: 600; color: #334155;
  cursor: pointer; outline: none; transition: all 0.3s;
  backdrop-filter: blur(10px);
}
.glass-selector:hover, .glass-selector:focus {
  background-color: rgba(255, 255, 255, 0.7);
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

/* 图例 */
.header-legend { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #64748b; font-weight: 500; }
.legend-dots { display: flex; gap: 4px; }
.dot { width: 10px; height: 10px; border-radius: 3px; }
.l-0 { background-color: rgba(235, 237, 240, 0.6); border: 1px solid rgba(255,255,255,0.4); } 
.l-1 { background-color: #bfdbfe; } .l-2 { background-color: #60a5fa; } .l-3 { background-color: #3b82f6; } .l-4 { background-color: #1e40af; }

/* 状态框 */
.state-box { padding: 60px; text-align: center; color: #64748b; margin-top: 20px; font-weight: 500; display: flex; flex-direction: column; align-items: center; gap: 12px;}
.primary-btn { margin-top: 15px; background: #1e293b; color: #fff; border: none; padding: 10px 28px; border-radius: 12px; cursor: pointer; font-weight: 600; transition: all 0.3s; box-shadow: 0 4px 15px rgba(30, 41, 59, 0.2); }
.primary-btn:hover { background: #0f172a; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(30, 41, 59, 0.3); }

.spinner { width: 28px; height: 28px; border: 3px solid rgba(59, 130, 246, 0.2); border-top: 3px solid #3b82f6; border-radius: 50%; animation: spin 1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

@media (max-width: 768px) { .dashboard-module { padding: 20px; } .dashboard-header { flex-direction: column; align-items: flex-start; gap: 10px; } }
</style>