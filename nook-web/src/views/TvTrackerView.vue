<template>
  <div class="tv-container" ref="mainContainer">
    
    <transition name="toast-slide">
      <div v-if="toast.visible" class="toast-notification" :class="toast.type">
        <div class="toast-icon">{{ toast.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="toast-content">{{ toast.message }}</div>
      </div>
    </transition>

    <TvHeader 
      :is-visible="isHeaderVisible"
      :notifications="notifications"
      :has-new="hasNewNotis"
      :view-mode="viewMode"
      :total-count="shows.length"
      @update:viewMode="viewMode = $event"
      @add="openAddModal"
      @remove-noti="removeNotification"
      @clear-notis="clearNotifications"
      @noti-read="hasNewNotis = false"
    >
      <template #filters>
        <FilterBar 
          v-model:category="currentCategory"
          v-model:status="currentStatus"
          v-model:network="currentNetwork"
          :networks="uniqueNetworks"
          :shows="shows"
        />
      </template>
    </TvHeader>

    <div class="content-body">
      
      <ShowSortToolbar 
        v-if="!isLoading && displayShows.length > 0"
        :sortBy="sortBy" 
        :sortDesc="sortDesc" 
        @change="handleSort" 
      />

      <div v-if="isLoading" class="loading-state">
        <div class="spinner"></div>
        <p>数据加载中...</p>
      </div>

      <div v-else-if="displayShows.length === 0" class="empty-state">
        <div class="empty-icon">🍿</div>
        <h3>这里空空如也</h3>
        <p>没有找到相关剧集，快去添加一部吧！</p>
        <button class="add-action-btn" @click="openAddModal">
          去添加
        </button>
      </div>

      <template v-else>
        <div v-if="viewMode === 'grid'" class="grid-layout">
          <ShowGridCard 
            v-for="show in displayShows" 
            :key="show._id" 
            :show="show"
            :is-pending-delete="!!pendingDeletes[show._id]"
            @edit="openEditModal"
            @update-progress="updateProgress"
            @delete="requestHardDelete"
            @restore="restoreShow"
            @drop="dropShow"
            @cancel-delete="cancelDelete"
            @pause-delete="pauseDeleteTimer"
            @resume-delete="resumeDeleteTimer"
          />
        </div>

        <div v-else class="list-layout-container">
          <ShowListItem
            v-for="show in displayShows" 
            :key="show._id" 
            :show="show"
            :is-pending-delete="!!pendingDeletes[show._id]"
            @edit="openEditModal"
            @update-progress="updateProgress"
            @delete="requestHardDelete"
            @restore="restoreShow"
            @drop="dropShow"
            @cancel-delete="cancelDelete(show._id)"
            @pause-delete="pauseDeleteTimer"
            @resume-delete="resumeDeleteTimer"
          />
        </div>
      </template>
    </div>

    <EditShowModal 
      v-model:visible="showModal"
      :edit-data="editingShow"
      @save="saveShow" 
    />
    
    <CalendarModal 
      v-model:visible="showCalendar"
      :shows="shows"
    />

    <FabMenu 
      :is-open="isMenuOpen"
      :is-syncing="isSyncing"
      @toggle="isMenuOpen = !isMenuOpen"
      @sync="syncData"
      @export="exportData"
      @import="triggerImport"
      @open-calendar="showCalendar = true"
    />
    
    <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileUpload" />

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { updateTheme } from '../store';

// 导入封装好的 API 方法
import { 
  fetchShowsApi, addShowApi, updateShowApi, deleteShowApi, 
  syncShowsApi, importShowsApi, addTvLogApi 
} from '@/api/shows';

// 引入组件
import TvHeader from '@/components/TvTracker/TvHeader.vue';
import FilterBar from '@/components/TvTracker/FilterBar.vue';
import ShowGridCard from '@/components/TvTracker/ShowGridCard.vue';
import ShowListItem from '@/components/TvTracker/ShowListItem.vue';
import EditShowModal from '@/components/TvTracker/EditShowModal.vue';
import CalendarModal from '@/components/TvTracker/CalendarModal.vue';
import FabMenu from '@/components/TvTracker/FabMenu.vue';

// 引入排序逻辑
import { useShowSort } from '@/composables/useShowSort';
import ShowSortToolbar from '@/components/TvTracker/ShowSortToolbar.vue';

// --- 状态定义 ---
const viewMode = ref('grid');
const currentCategory = ref('all');
const currentStatus = ref('watching'); 
const currentNetwork = ref('all');
const showModal = ref(false);
const showCalendar = ref(false);
const isMenuOpen = ref(false);
const isSyncing = ref(false);
const isLoading = ref(false); // ★ 加载状态标志

const shows = ref([]);
const editingShow = ref(null);
const pendingDeletes = reactive({});

// 用于存放各个剧集的防抖定时器和累计变化量
const updateTimers = {};
const pendingDeltas = {}; 

const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);

const toast = reactive({ visible: false, message: '', type: 'success' });

// --- 计算属性 ---

// 提取所有不重复的播放平台
const uniqueNetworks = computed(() => {
  const nets = new Map();
  shows.value.forEach(s => {
    if (s.network && !nets.has(s.network)) {
      nets.set(s.network, { name: s.network, logo: s.networkLogo });
    }
  });
  return Array.from(nets.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// 筛选逻辑 (Category/Status/Network)
const filteredShows = computed(() => {
  return shows.value.filter(s => {
    const catMatch = currentCategory.value === 'all' || s.category === currentCategory.value;
    const statusMatch = currentStatus.value === 'all' || s.status === currentStatus.value;
    const netMatch = currentNetwork.value === 'all' || s.network === currentNetwork.value;
    return catMatch && statusMatch && netMatch;
  });
});

// 排序逻辑 (使用 Composable)
const { sortBy, sortDesc, sortedShows, handleSort } = useShowSort(filteredShows);

// 处理“全部”分类下的强制排序
const displayShows = computed(() => {
  if (currentStatus.value === 'all') {
    const statusOrder = { 'watching': 1, 'wish': 2, 'watched': 3, 'dropped': 4 };
    return [...sortedShows.value].sort((a, b) => {
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      return orderA - orderB; 
    });
  }
  return sortedShows.value;
});

// --- 滚动与交互逻辑 ---
const isHeaderVisible = ref(true);
const mainContainer = ref(null);
let lastScrollY = 0;

const handleScroll = () => {
  const container = mainContainer.value;
  if (!container) return;
  const currentScrollY = container.scrollTop;
  
  if (currentScrollY < 10) { 
    isHeaderVisible.value = true; 
    lastScrollY = currentScrollY; 
    return; 
  }
  
  if (Math.abs(currentScrollY - lastScrollY) < 10) return;
  isHeaderVisible.value = currentScrollY <= lastScrollY || (lastScrollY - currentScrollY > 20);
  lastScrollY = currentScrollY;
};

const handleMouseMove = (e) => { 
  if (e.clientY < 50) isHeaderVisible.value = true; 
};

// --- 生命周期 ---
onMounted(() => {
  fetchShows();
  updateTheme('#fcfcfc');
  
  const savedNotis = localStorage.getItem('tv_notifications');
  if (savedNotis) notifications.value = JSON.parse(savedNotis);
  
  if (mainContainer.value) mainContainer.value.addEventListener('scroll', handleScroll);
  window.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  if (mainContainer.value) mainContainer.value.removeEventListener('scroll', handleScroll);
  window.removeEventListener('mousemove', handleMouseMove);
  
  // 清理所有尚未执行的删除定时器
  Object.values(pendingDeletes).forEach(timer => clearTimeout(timer));

  // 如果用户没等防抖结束就离开了页面，立即把积累的改动发送给后端
  Object.keys(updateTimers).forEach(showId => {
    clearTimeout(updateTimers[showId]); 
    const show = shows.value.find(s => s._id === showId);
    if (show && pendingDeltas[showId] !== 0) {
      updateShowApi(show._id, { watchedEpisodes: show.watchedEpisodes, status: show.status }).catch(()=>{});
      const userId = getCurrentUserId();
      if (userId) addTvLogApi({ userId, showId, showTitle: show.title, count: pendingDeltas[showId], date: new Date() }).catch(()=>{});
    }
  });
});

watch(notifications, (newVal) => { 
  localStorage.setItem('tv_notifications', JSON.stringify(newVal)); 
}, { deep: true });

// --- 核心业务逻辑 ---

const getCurrentUserId = () => { 
  const userStr = sessionStorage.getItem('current_user'); 
  return userStr ? JSON.parse(userStr).id : null; 
};

const showToast = (msg, type = 'success') => { 
  toast.message = msg; 
  toast.type = type; 
  toast.visible = true; 
  setTimeout(() => { toast.visible = false; }, 3000); 
};

// 获取剧集列表
const fetchShows = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  isLoading.value = true;
  try {
    const res = await fetchShowsApi(userId);
    shows.value = res.data;
  } catch (err) { console.error(err); } 
  finally { setTimeout(() => { isLoading.value = false; }, 300); }
};

// 状态自动计算逻辑
const calcStatus = (watched, aired, total) => { 
  if (watched === 0) return 'wish'; 
  const target = (total > 0) ? total : aired; 
  if (target > 0 && watched >= target) return 'watched'; 
  return 'watching'; 
};

// 保存/添加剧集
const saveShow = async (formData) => {
  const userId = getCurrentUserId();
  if (!userId || !formData.title) return showToast("请输入作品名称", "error");
  
  try {
    let res;
    if (editingShow.value && editingShow.value._id) {
      res = await updateShowApi(editingShow.value._id, formData);
      const index = shows.value.findIndex(s => s._id === editingShow.value._id);
      if (index !== -1) shows.value[index] = res.data;
      showToast("编辑成功", "success");
    } else {
      const initialStatus = calcStatus(formData.watchedEpisodes, formData.airedEpisodes, formData.totalEpisodes);
      res = await addShowApi({ userId, ...formData, status: initialStatus });
      shows.value.unshift(res.data);
      showToast("添加成功", "success");
    }
    showModal.value = false;
  } catch (err) {
    console.error(err);
    showToast("保存失败", "error");
  }
};

// ★★★ 核心逻辑：更新进度 & 记录历史 (带防抖优化) ★★★
const updateProgress = (show, delta) => {
  if (show.status === 'dropped') return;
  
  const newVal = Math.max(0, show.watchedEpisodes + delta);
  if (newVal === show.watchedEpisodes && delta < 0) return; 

  show.watchedEpisodes = newVal;
  const newStatus = calcStatus(newVal, show.airedEpisodes, show.totalEpisodes);
  if (newStatus !== show.status) show.status = newStatus;

  pendingDeltas[show._id] = (pendingDeltas[show._id] || 0) + delta;

  if (updateTimers[show._id]) {
    clearTimeout(updateTimers[show._id]);
  }

  updateTimers[show._id] = setTimeout(async () => {
    const finalDelta = pendingDeltas[show._id];
    delete pendingDeltas[show._id];
    delete updateTimers[show._id];

    if (finalDelta === 0) return; 

    try {
      await updateShowApi(show._id, { 
        watchedEpisodes: show.watchedEpisodes, 
        status: show.status 
      });

      const userId = getCurrentUserId();
      if (userId) {
        await addTvLogApi({
          userId: userId,
          showId: show._id,
          showTitle: show.title,
          count: finalDelta, 
          date: new Date()
        });
      }
    } catch (e) {
      console.error(e);
      show.watchedEpisodes = Math.max(0, show.watchedEpisodes - finalDelta);
      show.status = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
      showToast("更新进度失败，已回滚", "error");
    }
  }, 500); 
};

const openAddModal = () => { editingShow.value = null; showModal.value = true; };
const openEditModal = (show) => { editingShow.value = { ...show }; showModal.value = true; };

const dropShow = async (show) => {
  show.status = 'dropped';
  try { await updateShowApi(show._id, { status: 'dropped' }); } catch(e){}
};

const restoreShow = async (show) => {
  const correctStatus = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
  show.status = correctStatus;
  try { await updateShowApi(show._id, { status: correctStatus }); } catch(e){}
};

// --- 删除逻辑 ---
const requestHardDelete = (id) => { 
  pendingDeletes[id] = setTimeout(() => { confirmDelete(id); }, 3000); 
};
const cancelDelete = (id) => { 
  if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } 
};
const pauseDeleteTimer = (id) => { 
  if (pendingDeletes[id]) clearTimeout(pendingDeletes[id]); 
};
const resumeDeleteTimer = (id) => {
  if (pendingDeletes[id] !== undefined) {
    clearTimeout(pendingDeletes[id]); 
    pendingDeletes[id] = setTimeout(() => { confirmDelete(id); }, 3000);
  }
};
const confirmDelete = async (id) => {
  if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; }
  const backup = shows.value.find(s => s._id === id);
  shows.value = shows.value.filter(s => s._id !== id);
  try { 
    await deleteShowApi(id); 
    showToast("删除成功", "success"); 
  } catch (err) { 
    console.error(err); 
    if(backup) shows.value.push(backup); 
    showToast("删除失败", "error"); 
  }
};

// --- 通知与同步 ---
const clearNotifications = () => { notifications.value = []; };
const removeNotification = (index) => { notifications.value.splice(index, 1); };

const syncData = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  isSyncing.value = true;
  showToast("正在同步...", "success");
  try {
    const res = await syncShowsApi(userId);
    await fetchShows();
    
    if (res.data.updatedCount > 0) {
      if (res.data.logs?.length) {
        const existingSignatures = new Set(notifications.value.map(n => `${n.title}|${n.newEp}|${n.updateDate}`));
        const uniqueNewItems = res.data.logs
          .filter(log => !existingSignatures.has(`${log.title}|${log.newEp}|${log.date}`))
          .map(log => ({ ...log, updateDate: log.date, uniqueId: Date.now() + Math.random() }));
          
        if (uniqueNewItems.length) { 
          notifications.value = [...uniqueNewItems, ...notifications.value]; 
          hasNewNotis.value = true; 
        }
      }
      showToast(`同步完成！更新 ${res.data.updatedCount} 部`, "success");
    } else { 
      showToast('暂无新内容', "success"); 
    }
  } catch (err) { 
    console.error(err); 
    showToast('同步失败', "error"); 
  } finally { 
    isSyncing.value = false; 
  }
};

// --- 导入导出 ---
const triggerImport = () => { fileInput.value.click(); };
const exportData = () => { 
  const userId = getCurrentUserId(); 
  if (!userId) return; 
  window.open(`/api/shows/export?userId=${userId}`, '_blank'); 
  showToast("备份下载中...", "success"); 
};
const handleFileUpload = (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      if (!Array.isArray(parsedData)) return showToast("文件格式错误", "error");
      const userId = getCurrentUserId();
      showToast("正在导入...", "success");
      await importShowsApi(userId, parsedData);
      showToast("导入成功", "success");
      await fetchShows();
    } catch (err) { showToast("导入失败", "error"); } 
    finally { event.target.value = ''; }
  };
  reader.readAsText(file);
};
</script>

<style scoped>
/* 容器级布局 */
.tv-container { 
  padding: 0; 
  height: 100%; 
  overflow-y: auto; 
  background-color: #f7f9fc; 
  color: #333; 
}
.content-body { padding: 30px 60px 40px 40px; }
.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 40px; padding-bottom: 60px; }
.list-layout-container { display: flex; flex-direction: column; gap: 1px; }

/* ★ 优化 4：加载状态样式 (Loading) */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0;
  color: #94a3b8;
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f4f6;
  border-top: 3px solid #4f46e5; /* 靛蓝色圆环 */
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
@keyframes spin { 
  0% { transform: rotate(0deg); } 
  100% { transform: rotate(360deg); } 
}

/* ★ 优化 5：精致的空状态样式 (Empty State) */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  color: #64748b;
  grid-column: 1 / -1; /* 确保在网格布局中能独占一行 */
}
.empty-icon {
  font-size: 3.5rem;
  margin-bottom: 16px;
  opacity: 0.9;
}
.empty-state h3 {
  font-size: 1.25rem;
  color: #1e293b;
  margin: 0 0 8px 0;
  font-weight: 700;
}
.empty-state p {
  font-size: 0.95rem;
  margin: 0 0 24px 0;
}
.add-action-btn {
  background: #111;
  color: white;
  border: none;
  padding: 10px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
}
.add-action-btn:hover {
  background: #333;
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
}
.add-action-btn:active {
  transform: translateY(0);
}

/* Toast */
.toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; align-items: center; gap: 12px; background: white; padding: 12px 20px; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); min-width: 300px; max-width: 90%; }
.toast-notification.success { border-left: 4px solid #10b981; }
.toast-notification.error { border-left: 4px solid #ef4444; }
.toast-icon { font-size: 1.2rem; }
.toast-content { font-size: 0.95rem; font-weight: 500; color: #333; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translate(-50%, -20px); }

@media (max-width: 768px) {
  .content-body { padding: 15px; }
  .grid-layout { grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 100px; }
}
</style>