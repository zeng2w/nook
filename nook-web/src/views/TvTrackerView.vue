<template>
  <div class="tv-page-modern-layout">
    
    <transition name="toast-slide">
      <div v-if="toast.visible" class="toast-notification" :class="toast.type">
        <div class="toast-icon">{{ toast.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="toast-content">{{ toast.message }}</div>
      </div>
    </transition>

    <header class="top-header-section">
      <TvHeader 
        :is-visible="isHeaderVisible"
        :notifications="notifications"
        :has-new="hasNewNotis"
        :total-count="shows.length"
        :is-syncing="isSyncing"
        v-model:searchQuery="searchQuery"  @add="openAddModal"
        @sync="syncData"
        @export="exportData"
        @import="triggerImport"
        @open-calendar="showCalendar = true"
        @remove-noti="removeNotification"
        @clear-notis="clearNotifications"
        @noti-read="hasNewNotis = false"
      />
    </header>

    <div class="bottom-main-layout">
      
      <div class="main-content-column" ref="mainContainer">
        
        <div class="sticky-filter-bar" v-if="!isLoading && shows.length > 0">
          <FilterBar 
            v-model:category="currentCategory"
            v-model:status="currentStatus"
            v-model:network="currentNetwork"
            v-model:viewMode="viewMode"
            :sortBy="sortBy"          
            :sortDesc="sortDesc"      
            :networks="uniqueNetworks"
            :shows="shows"
            @change-sort="handleSort"
          />
        </div>

        <div class="content-body">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>数据加载中...</p>
          </div>

          <div v-else-if="displayShows.length === 0" class="empty-state">
            <div class="empty-icon">🍿</div>
            <h3>这里空空如也</h3>
            <p>没有找到相关剧集，快去添加一部吧！</p>
            <button class="add-action-btn" @click="openAddModal">去添加</button>
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
                @toggle-favorite="toggleFavorite"
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
                @toggle-favorite="toggleFavorite"
              />
            </div>
          </template>
        </div>
      </div>

      <div class="discovery-sidebar-column">
        <TrendingSidebar 
          :shows="shows"
          @open-calendar="showCalendar = true"
          @edit="openEditModal"
        />
        <UpdateCalendar :shows="shows" />

      </div>

    </div>

    <EditShowModal v-model:visible="showModal" :edit-data="editingShow" @save="saveShow" />
    <CalendarModal v-model:visible="showCalendar" :shows="shows" />
    <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileUpload" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { updateTheme } from '../store';
import { fetchShowsApi, addShowApi, updateShowApi, deleteShowApi, syncShowsApi, importShowsApi, addTvLogApi } from '@/api/shows';

import TvHeader from '@/components/TvTracker/TvHeader.vue';
import FilterBar from '@/components/TvTracker/FilterBar.vue';
import ShowGridCard from '@/components/TvTracker/ShowGridCard.vue';
import ShowListItem from '@/components/TvTracker/ShowListItem.vue';
import EditShowModal from '@/components/TvTracker/EditShowModal.vue';
import CalendarModal from '@/components/TvTracker/CalendarModal.vue';
import TrendingSidebar from '@/components/TvTracker/TrendingSidebar.vue';
// ✨ 引入你刚刚封装好的 UpdateCalendar
import UpdateCalendar from '@/components/TvTracker/UpdateCalendar.vue'; 
import { useShowSort } from '@/composables/useShowSort';

// 🎨 动态主题注入逻辑 (科技蓝紫方案)
const THEME_SAAS = {
  '--theme-primary': '#6366F1',
  '--theme-primary-hover': '#4F46E5',
  '--theme-primary-light': '#E0E7FF',
  '--theme-bg': '#F9FAFB',
  '--theme-surface': '#FFFFFF',
};
const searchQuery = ref('');

const applyModernTheme = () => {
  const root = document.documentElement;
  Object.entries(THEME_SAAS).forEach(([key, value]) => root.style.setProperty(key, value));
};

const removeModernTheme = () => {
  const root = document.documentElement;
  Object.keys(THEME_SAAS).forEach(key => root.style.removeProperty(key));
};

// --- 以下为你原有的业务逻辑 (完全保留) ---
const viewMode = ref('grid');
const currentCategory = ref('all');
const currentStatus = ref('watching'); 
const currentNetwork = ref('all');
const showModal = ref(false);
const showCalendar = ref(false);
const isSyncing = ref(false);
const isLoading = ref(false); 

const shows = ref([]);
const editingShow = ref(null);
const pendingDeletes = reactive({});
const updateTimers = {};
const pendingDeltas = {}; 
const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);
const toast = reactive({ visible: false, message: '', type: 'success' });
const isHeaderVisible = ref(true);
const mainContainer = ref(null);

const uniqueNetworks = computed(() => {
  const nets = new Map();
  shows.value.forEach(s => {
    if (s.network && !nets.has(s.network)) nets.set(s.network, { name: s.network, logo: s.networkLogo });
  });
  return Array.from(nets.values()).sort((a, b) => a.name.localeCompare(b.name));
});

const filteredShows = computed(() => {
  return shows.value.filter(s => {
    const catMatch = currentCategory.value === 'all' || s.category === currentCategory.value;
    const statusMatch = currentStatus.value === 'all' || s.status === currentStatus.value;
    const netMatch = currentNetwork.value === 'all' || s.network === currentNetwork.value;
    
    const searchMatch = !searchQuery.value || 
      (s.title && s.title.toLowerCase().includes(searchQuery.value.toLowerCase())) ||
      (s.name && s.name.toLowerCase().includes(searchQuery.value.toLowerCase()));

    return catMatch && statusMatch && netMatch && searchMatch;
  });
});

const { sortBy, sortDesc, sortedShows, handleSort } = useShowSort(filteredShows);

const displayShows = computed(() => {
  if (currentStatus.value === 'all') {
    const statusOrder = { 'watching': 1, 'wish': 2, 'watched': 3, 'dropped': 4 };
    return [...sortedShows.value].sort((a, b) => {
      if (a.isFavorite && !b.isFavorite) return -1;
      if (!a.isFavorite && b.isFavorite) return 1;
      const orderA = statusOrder[a.status] || 99;
      const orderB = statusOrder[b.status] || 99;
      return orderA - orderB; 
    });
  }
  return sortedShows.value;
});

onMounted(() => {
  fetchShows();
  applyModernTheme(); 
  updateTheme('#F9FAFB');
  const savedNotis = localStorage.getItem('tv_notifications');
  if (savedNotis) notifications.value = JSON.parse(savedNotis);
});

onUnmounted(() => {
  removeModernTheme(); 
  updateTheme('#ffffff');
  Object.values(pendingDeletes).forEach(timer => clearTimeout(timer));
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

watch(notifications, (newVal) => { localStorage.setItem('tv_notifications', JSON.stringify(newVal)); }, { deep: true });

const getCurrentUserId = () => { const userStr = sessionStorage.getItem('current_user'); return userStr ? JSON.parse(userStr).id : null; };
const showToast = (msg, type = 'success') => { toast.message = msg; toast.type = type; toast.visible = true; setTimeout(() => { toast.visible = false; }, 3000); };

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

const calcStatus = (watched, aired, total) => { 
  if (watched === 0) return 'wish'; 
  const target = (total > 0) ? total : aired; 
  if (target > 0 && watched >= target) return 'watched'; 
  return 'watching'; 
};

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

const updateProgress = (show, delta) => {
  if (show.status === 'dropped') return;
  const newVal = Math.max(0, show.watchedEpisodes + delta);
  if (newVal === show.watchedEpisodes && delta < 0) return; 
  show.watchedEpisodes = newVal;
  const newStatus = calcStatus(newVal, show.airedEpisodes, show.totalEpisodes);
  if (newStatus !== show.status) show.status = newStatus;
  pendingDeltas[show._id] = (pendingDeltas[show._id] || 0) + delta;
  if (updateTimers[show._id]) clearTimeout(updateTimers[show._id]);
  updateTimers[show._id] = setTimeout(async () => {
    const finalDelta = pendingDeltas[show._id];
    delete pendingDeltas[show._id];
    delete updateTimers[show._id];
    if (finalDelta === 0) return; 
    try {
      await updateShowApi(show._id, { watchedEpisodes: show.watchedEpisodes, status: show.status });
      const userId = getCurrentUserId();
      if (userId) {
        await addTvLogApi({ userId: userId, showId: show._id, showTitle: show.title, count: finalDelta, date: new Date() });
      }
    } catch (e) {
      console.error(e);
      show.watchedEpisodes = Math.max(0, show.watchedEpisodes - finalDelta);
      show.status = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
      showToast("更新进度失败，已回滚", "error");
    }
  }, 500); 
};

const toggleFavorite = async (show) => {
  const originalState = !!show.isFavorite; 
  const newState = !originalState;
  show.isFavorite = newState; 
  try {
    await updateShowApi(show._id, { isFavorite: newState });
    showToast(newState ? "已加入喜爱并置顶" : "已取消喜爱", "success");
  } catch (err) {
    console.error("更新喜爱状态失败:", err);
    show.isFavorite = originalState; 
    showToast("状态更新失败，请重试", "error");
  }
};

const openAddModal = () => { editingShow.value = null; showModal.value = true; };
const openEditModal = (show) => { editingShow.value = { ...show }; showModal.value = true; };
const dropShow = async (show) => { show.status = 'dropped'; try { await updateShowApi(show._id, { status: 'dropped' }); } catch(e){} };
const restoreShow = async (show) => { const correctStatus = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes); show.status = correctStatus; try { await updateShowApi(show._id, { status: correctStatus }); } catch(e){} };
const requestHardDelete = (id) => { pendingDeletes[id] = setTimeout(() => confirmDelete(id), 3000); };
const cancelDelete = (id) => { if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } };
const pauseDeleteTimer = (id) => { if (pendingDeletes[id]) clearTimeout(pendingDeletes[id]); };
const resumeDeleteTimer = (id) => { if (pendingDeletes[id] !== undefined) { clearTimeout(pendingDeletes[id]); pendingDeletes[id] = setTimeout(() => confirmDelete(id), 3000); } };
const confirmDelete = async (id) => {
  if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; }
  const backup = shows.value.find(s => s._id === id);
  shows.value = shows.value.filter(s => s._id !== id);
  try { await deleteShowApi(id); showToast("删除成功", "success"); } catch (err) { console.error(err); if(backup) shows.value.push(backup); showToast("删除失败", "error"); }
};

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
        if (uniqueNewItems.length) { notifications.value = [...uniqueNewItems, ...notifications.value]; hasNewNotis.value = true; }
      }
      showToast(`同步完成！更新 ${res.data.updatedCount} 部`, "success");
    } else { showToast('暂无新内容', "success"); }
  } catch (err) { console.error(err); showToast('同步失败', "error"); } finally { isSyncing.value = false; }
};

const triggerImport = () => { fileInput.value.click(); };
const exportData = () => { const userId = getCurrentUserId(); if (!userId) return; window.open(`/api/shows/export?userId=${userId}`, '_blank'); showToast("备份下载中...", "success"); };
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
    } catch (err) { showToast("导入失败", "error"); } finally { event.target.value = ''; }
  };
  reader.readAsText(file);
};
</script>

<style scoped>
.tv-page-modern-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden; 
  background-color: var(--theme-bg, #F9FAFB); 
  color: #0f172a; 
}

.top-header-section {
  width: 100%;
  flex-shrink: 0;
  background-color: transparent; 
  border-bottom: none; 
  z-index: 30;
}

.bottom-main-layout {
  display: flex;
  width: 100%;
  flex: 1;
  overflow: hidden; 
}

/* 🎯 改为 flex: 1，自适应占据剩余的宽度 */
.main-content-column {
  flex: 1; 
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto; 
  position: relative;
}

/* 🎯 侧边栏整体父容器 */
.discovery-sidebar-column {
  width: 16vw; 
  min-width: 240px; /* 稍微缩小最小宽度，防止把主内容挤压过小 */
  flex-shrink: 0;
  /* 关键：取消白色背景，使用透明，让底层的浅灰色透上来，从而凸显白色的卡片 */
  background-color: transparent; 
  z-index: 10;
  display: flex;
  flex-direction: column;
  padding: 10px 14px; /* 给外围增加呼吸空间，推开屏幕边缘 */
  gap: 5px; /* 两个卡片之间的完美间距 */
  overflow-y: hidden; /* 隐藏整个边栏的滚动条，让卡片内部去滚动 */
}

/* 模块分割线 */
.sidebar-divider {
  height: 8px;
  background-color: var(--theme-bg, #F9FAFB);
  border-top: 1px solid rgba(226, 232, 240, 0.6);
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
}

.sticky-filter-bar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: transparent; 
  padding: 10px 3vw; 
  border-bottom: none;
}

.content-body { 
  padding: 0px 3vw 60px 3vw; 
  flex: 1;
}

.grid-layout { 
  display: grid; 
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); 
  gap: 32px 24px; 
  padding-bottom: 60px; 
}

.list-layout-container { display: flex; flex-direction: column; gap: 8px; width: 100%; box-sizing: border-box; }

.add-action-btn { background-color: var(--theme-primary, #6366F1); color: white; border: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.2s; margin-top: 16px; }
.add-action-btn:hover { background-color: var(--theme-primary-hover, #4F46E5); transform: translateY(-2px); }

.loading-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 0; color: #94a3b8; }
.spinner { width: 40px; height: 40px; border: 3px solid #f1f5f9; border-top: 3px solid var(--theme-primary, #6366F1); border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 16px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px 20px; color: #64748b; }
.empty-icon { font-size: 4rem; margin-bottom: 16px; opacity: 0.8; }
.empty-state h3 { font-size: 1.25rem; color: #1e293b; margin: 0 0 8px 0; font-weight: 700; }

/* Toast */
.toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; align-items: center; gap: 12px; background: white; padding: 14px 24px; border-radius: 50px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); min-width: 300px; max-width: 90%; font-weight: 500; }
.toast-notification.success { border-left: 4px solid #10b981; }
.toast-notification.error { border-left: 4px solid #ef4444; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }
</style>