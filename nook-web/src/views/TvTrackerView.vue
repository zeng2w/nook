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
        :notifications="notifications"
        :has-new="hasNewNotis"
        :total-count="showFacets.allCount"
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
      
      <div class="main-content-column">
        
        <div class="sticky-filter-bar" v-if="!isLoading && showFacets.allCount > 0">
          <FilterBar 
            v-model:category="currentCategory"
            v-model:status="currentStatus"
            v-model:network="currentNetwork"
            v-model:viewMode="viewMode"
            :sortBy="sortBy"          
            :sortDesc="sortDesc"      
            :networks="showFacets.networks"
            :status-counts="showFacets.statusCounts"
            :category-counts="showFacets.categoryCounts"
            :network-total="showFacets.networkTotal"
            @change-sort="handleSort"
          />
        </div>

        <div class="content-body">
          <div v-if="isLoading" class="loading-state">
            <div class="spinner"></div>
            <p>数据加载中...</p>
          </div>

          <div v-else-if="loadError && shows.length === 0" class="empty-state error-state">
            <div class="empty-icon">⚠️</div>
            <h3>剧集加载失败</h3>
            <p>{{ loadError }}</p>
            <button class="add-action-btn" @click="fetchShows(true)">重新加载</button>
          </div>

          <div v-else-if="displayShows.length === 0" class="empty-state">
            <div class="empty-icon">🍿</div>
            <h3>这里空空如也</h3>
            <p>{{ hasActiveFilters ? '没有符合当前筛选条件的剧集。' : '没有找到相关剧集，快去添加一部吧！' }}</p>
            <button v-if="hasActiveFilters" class="add-action-btn" @click="resetFilters">清除筛选</button>
            <button v-else class="add-action-btn" @click="openAddModal">去添加</button>
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

            <div v-if="showPagination.hasMore" class="load-more-row">
              <button class="load-more-btn" :disabled="isLoadingMore" @click="fetchShows(false)">
                {{ isLoadingMore ? '加载中...' : `加载更多（已加载 ${shows.length}/${showPagination.total}）` }}
              </button>
            </div>
          </template>
        </div>
      </div>

      <div class="discovery-sidebar-column">
        <TrendingSidebar />
        <UpdateCalendar :shows="calendarShows" @open-calendar="showCalendar = true" />

      </div>

    </div>

    <EditShowModal v-model:visible="showModal" :edit-data="editingShow" @save="saveShow" />
    <CalendarModal v-model:visible="showCalendar" :shows="calendarShows" />
    <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileUpload" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { updateTheme } from '../store';
import { fetchShowsApi, fetchCalendarShowsApi, addShowApi, updateShowApi, deleteShowApi, syncShowsApi, importShowsApi, addTvLogApi } from '@/api/shows';
import { getApiErrorMessage } from '@/api/errors';
import { getAuthUserId } from '@/auth';

import TvHeader from '@/components/TvTracker/TvHeader.vue';
import FilterBar from '@/components/TvTracker/FilterBar.vue';
import ShowGridCard from '@/components/TvTracker/ShowGridCard.vue';
import ShowListItem from '@/components/TvTracker/ShowListItem.vue';
import EditShowModal from '@/components/TvTracker/EditShowModal.vue';
import CalendarModal from '@/components/TvTracker/CalendarModal.vue';
import TrendingSidebar from '@/components/TvTracker/TrendingSidebar.vue';
// ✨ 引入你刚刚封装好的 UpdateCalendar
import UpdateCalendar from '@/components/TvTracker/UpdateCalendar.vue'; 

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
const isLoadingMore = ref(false);
const loadError = ref('');

const shows = ref([]);
const calendarShows = ref([]);
const showPagination = reactive({ page: 0, limit: 24, total: 0, totalPages: 0, hasMore: false });
const showFacets = reactive({
  allCount: 0,
  statusCounts: { watching: 0, watched: 0, wish: 0, dropped: 0 },
  categoryCounts: { tv: 0, anime: 0, movie: 0, variety: 0 },
  networkTotal: 0,
  networks: []
});
const editingShow = ref(null);
const pendingDeletes = reactive({});
const updateTimers = {};
const pendingDeltas = {}; 
const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);
const toast = reactive({ visible: false, message: '', type: 'success' });
let latestFetchId = 0;
let searchTimer = null;

const sortBy = ref('date');
const sortDesc = ref(true);
const displayShows = computed(() => shows.value);
const hasActiveFilters = computed(() => (
  currentCategory.value !== 'all' ||
  currentStatus.value !== 'all' ||
  currentNetwork.value !== 'all' ||
  Boolean(searchQuery.value.trim())
));

const handleSort = (type) => {
  if (sortBy.value === type) sortDesc.value = !sortDesc.value;
  else {
    sortBy.value = type;
    sortDesc.value = true;
  }
};

const resetFilters = () => {
  currentCategory.value = 'all';
  currentStatus.value = 'all';
  currentNetwork.value = 'all';
  searchQuery.value = '';
};

onMounted(() => {
  fetchShows();
  fetchCalendarShows();
  applyModernTheme(); 
  updateTheme('#F9FAFB');
  const notificationKey = getNotificationStorageKey();
  const savedNotis = notificationKey ? localStorage.getItem(notificationKey) : null;
  if (savedNotis) notifications.value = JSON.parse(savedNotis);
});

onUnmounted(() => {
  clearTimeout(searchTimer);
  removeModernTheme(); 
  updateTheme('#ffffff');
  Object.values(pendingDeletes).forEach(timer => clearTimeout(timer));
  Object.keys(updateTimers).forEach(showId => {
    clearTimeout(updateTimers[showId]); 
    const show = shows.value.find(s => s._id === showId);
    if (show && pendingDeltas[showId] !== 0) {
      updateShowApi(show._id, { watchedEpisodes: show.watchedEpisodes, status: show.status }).catch(()=>{});
      addTvLogApi({ showId, showTitle: show.title, count: pendingDeltas[showId], date: new Date() }).catch(()=>{});
    }
  });
});

const getNotificationStorageKey = () => {
  const userId = getAuthUserId();
  return userId ? `nook-tv-notifications-${userId}` : null;
};
watch(notifications, (newVal) => {
  const notificationKey = getNotificationStorageKey();
  if (notificationKey) localStorage.setItem(notificationKey, JSON.stringify(newVal));
}, { deep: true });
const showToast = (msg, type = 'success') => { toast.message = msg; toast.type = type; toast.visible = true; setTimeout(() => { toast.visible = false; }, 3000); };

const fetchShows = async (reset = true) => {
  const userId = getAuthUserId();
  if (!userId) return;
  if (reset) isLoading.value = true;
  else isLoadingMore.value = true;
  loadError.value = '';
  const requestId = ++latestFetchId;
  try {
    const page = reset ? 1 : showPagination.page + 1;
    const res = await fetchShowsApi({
      page,
      limit: showPagination.limit,
      search: searchQuery.value.trim() || undefined,
      status: currentStatus.value,
      category: currentCategory.value,
      network: currentNetwork.value,
      sort: sortBy.value,
      order: sortDesc.value ? 'desc' : 'asc'
    });
    if (requestId !== latestFetchId) return;
    const incoming = res.data.items || [];
    if (reset) {
      shows.value = incoming;
    } else {
      const merged = new Map(shows.value.map(show => [show._id, show]));
      incoming.forEach(show => merged.set(show._id, show));
      shows.value = Array.from(merged.values());
    }
    Object.assign(showPagination, res.data.pagination);
    Object.assign(showFacets, res.data.facets);
  } catch (err) {
    if (requestId !== latestFetchId) return;
    console.error(err);
    const message = getApiErrorMessage(err, '剧集列表加载失败');
    loadError.value = message;
    if (!reset) showToast(message, 'error');
  } finally {
    if (requestId === latestFetchId) {
      isLoading.value = false;
      isLoadingMore.value = false;
    }
  }
};

const fetchCalendarShows = async () => {
  try {
    const response = await fetchCalendarShowsApi();
    calendarShows.value = response.data;
  } catch (error) {
    console.error('Calendar data load failed:', error);
  }
};

const patchShowCollections = (updatedShow, overrides = {}) => {
  if (!updatedShow?._id) return;
  const safeShow = { ...updatedShow };
  delete safeShow.userId;
  delete safeShow.__v;
  const patch = { ...safeShow, ...overrides };
  [shows, calendarShows].forEach(collection => {
    const existing = collection.value.find(show => show._id === patch._id);
    if (existing) Object.assign(existing, patch);
  });
};

const refreshShowData = async () => Promise.all([fetchShows(true), fetchCalendarShows()]);

watch(
  [currentCategory, currentStatus, currentNetwork, sortBy, sortDesc],
  () => fetchShows(true)
);

watch(searchQuery, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fetchShows(true), 300);
});

const calcStatus = (watched, aired, total) => { 
  if (watched === 0) return 'wish'; 
  const target = (total > 0) ? total : aired; 
  if (target > 0 && watched >= target) return 'watched'; 
  return 'watching'; 
};

const saveShow = async (formData) => {
  const userId = getAuthUserId();
  if (!userId || !formData.title) return showToast("请输入作品名称", "error");
  try {
    if (editingShow.value && editingShow.value._id) {
      await updateShowApi(editingShow.value._id, formData);
      showToast("编辑成功", "success");
    } else {
      const initialStatus = calcStatus(formData.watchedEpisodes, formData.airedEpisodes, formData.totalEpisodes);
      await addShowApi({ ...formData, status: initialStatus });
      showToast("添加成功", "success");
    }
    showModal.value = false;
    await refreshShowData();
  } catch (err) {
    console.error(err);
    showToast(getApiErrorMessage(err, '保存失败'), "error");
  }
};

const updateProgress = (show, delta) => {
  if (show.status === 'dropped') return;
  const maximum = show.totalEpisodes > 0 ? show.totalEpisodes : Number.POSITIVE_INFINITY;
  const newVal = Math.min(maximum, Math.max(0, show.watchedEpisodes + delta));
  if (newVal === show.watchedEpisodes) return;
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
    const previousStatus = calcStatus(
      Math.max(0, show.watchedEpisodes - finalDelta),
      show.airedEpisodes,
      show.totalEpisodes
    );
    try {
      const response = await updateShowApi(show._id, {
        watchedEpisodes: show.watchedEpisodes,
        status: show.status
      });
      const queuedDelta = pendingDeltas[show._id] || 0;
      const overrides = queuedDelta === 0 ? {} : {
        watchedEpisodes: response.data.watchedEpisodes + queuedDelta,
        status: calcStatus(
          response.data.watchedEpisodes + queuedDelta,
          response.data.airedEpisodes,
          response.data.totalEpisodes
        )
      };
      patchShowCollections(response.data, overrides);

      if (queuedDelta === 0 && (previousStatus !== response.data.status || sortBy.value === 'lag')) {
        await fetchShows(true);
      }

      try {
        await addTvLogApi({
          showId: show._id,
          showTitle: show.title,
          count: finalDelta,
          date: new Date()
        });
      } catch (logError) {
        console.error('Activity log save failed:', logError);
        showToast('观看进度已保存，但活跃度记录失败', 'error');
      }
    } catch (e) {
      console.error(e);
      show.watchedEpisodes = Math.max(0, show.watchedEpisodes - finalDelta);
      show.status = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
      showToast(`${getApiErrorMessage(e, '更新进度失败')}，已回滚`, "error");
    }
  }, 500); 
};

const toggleFavorite = async (show) => {
  const originalState = !!show.isFavorite; 
  const newState = !originalState;
  show.isFavorite = newState; 
  try {
    const response = await updateShowApi(show._id, { isFavorite: newState });
    patchShowCollections(response.data);
    await fetchShows(true);
    showToast(newState ? "已加入喜爱并置顶" : "已取消喜爱", "success");
  } catch (err) {
    console.error("更新喜爱状态失败:", err);
    show.isFavorite = originalState; 
    showToast(getApiErrorMessage(err, '状态更新失败，请重试'), "error");
  }
};

const openAddModal = () => { editingShow.value = null; showModal.value = true; };
const openEditModal = (show) => { editingShow.value = { ...show }; showModal.value = true; };
const dropShow = async (show) => {
  const originalStatus = show.status;
  show.status = 'dropped';
  try {
    const response = await updateShowApi(show._id, { status: 'dropped' });
    patchShowCollections(response.data);
    await fetchShows(true);
  } catch (err) {
    console.error(err);
    show.status = originalStatus;
    showToast(`${getApiErrorMessage(err, '状态更新失败')}，已回滚`, 'error');
  }
};
const restoreShow = async (show) => {
  const originalStatus = show.status;
  const correctStatus = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
  show.status = correctStatus;
  try {
    const response = await updateShowApi(show._id, { status: correctStatus });
    patchShowCollections(response.data);
    await fetchShows(true);
  } catch (err) {
    console.error(err);
    show.status = originalStatus;
    showToast(`${getApiErrorMessage(err, '状态更新失败')}，已回滚`, 'error');
  }
};
const requestHardDelete = (id) => { pendingDeletes[id] = setTimeout(() => confirmDelete(id), 3000); };
const cancelDelete = (id) => { if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } };
const pauseDeleteTimer = (id) => { if (pendingDeletes[id]) clearTimeout(pendingDeletes[id]); };
const resumeDeleteTimer = (id) => { if (pendingDeletes[id] !== undefined) { clearTimeout(pendingDeletes[id]); pendingDeletes[id] = setTimeout(() => confirmDelete(id), 3000); } };
const confirmDelete = async (id) => {
  if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; }
  const backup = shows.value.find(s => s._id === id);
  shows.value = shows.value.filter(s => s._id !== id);
  calendarShows.value = calendarShows.value.filter(s => s._id !== id);
  try {
    await deleteShowApi(id);
    await fetchShows(true);
    showToast("删除成功", "success");
  } catch (err) {
    console.error(err);
    if (backup) shows.value.push(backup);
    await fetchCalendarShows();
    showToast(getApiErrorMessage(err, '删除失败'), "error");
  }
};

const clearNotifications = () => { notifications.value = []; };
const removeNotification = (index) => { notifications.value.splice(index, 1); };

const syncData = async () => {
  const userId = getAuthUserId();
  if (!userId) return;
  isSyncing.value = true;
  showToast("正在同步...", "success");
  try {
    const res = await syncShowsApi();
    await refreshShowData();
    if (res.data.updatedCount > 0) {
      if (res.data.logs?.length) {
        const existingSignatures = new Set(notifications.value.map(n => `${n.title}|${n.newEp}|${n.updateDate}`));
        const uniqueNewItems = res.data.logs
          .filter(log => !existingSignatures.has(`${log.title}|${log.newEp}|${log.date}`))
          .map(log => ({ ...log, updateDate: log.date, uniqueId: Date.now() + Math.random() }));
        if (uniqueNewItems.length) { notifications.value = [...uniqueNewItems, ...notifications.value]; hasNewNotis.value = true; }
      }
      const failedSuffix = res.data.failedCount > 0 ? `，${res.data.failedCount} 部获取失败` : '';
      showToast(`同步完成！更新 ${res.data.updatedCount} 部${failedSuffix}`, res.data.failedCount > 0 ? "error" : "success");
    } else if (res.data.failedCount > 0) {
      showToast(`同步完成，但有 ${res.data.failedCount} 部获取失败`, "error");
    } else { showToast('暂无新内容', "success"); }
  } catch (err) { console.error(err); showToast(getApiErrorMessage(err, '同步失败'), "error"); } finally { isSyncing.value = false; }
};

const triggerImport = () => { fileInput.value.click(); };
const exportData = () => { if (!getAuthUserId()) return; window.open('/api/shows/export', '_blank'); showToast("备份下载中...", "success"); };
const handleFileUpload = (event) => {
  const file = event.target.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const parsedData = JSON.parse(e.target.result);
      if (!Array.isArray(parsedData)) return showToast("文件格式错误", "error");
      showToast("正在导入...", "success");
      const response = await importShowsApi(parsedData);
      showToast(response.data.message || "导入成功", "success");
      await refreshShowData();
    } catch (error) { showToast(getApiErrorMessage(error, '导入失败'), "error"); } finally { event.target.value = ''; }
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
.error-state p { max-width: 520px; text-align: center; }
.load-more-row { display: flex; justify-content: center; padding: 8px 0 40px; }
.load-more-btn { border: 1px solid #c7d2fe; background: #fff; color: #4f46e5; padding: 10px 20px; border-radius: 10px; font-weight: 600; cursor: pointer; }
.load-more-btn:hover:not(:disabled) { background: #eef2ff; }
.load-more-btn:disabled { opacity: 0.6; cursor: wait; }

/* Toast */
.toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; align-items: center; gap: 12px; background: white; padding: 14px 24px; border-radius: 50px; box-shadow: 0 10px 40px rgba(0,0,0,0.1); min-width: 300px; max-width: 90%; font-weight: 500; }
.toast-notification.success { border-left: 4px solid #10b981; }
.toast-notification.error { border-left: 4px solid #ef4444; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translate(-50%, -20px) scale(0.95); }

@media (max-width: 1024px) {
  .discovery-sidebar-column { display: none; }
  .sticky-filter-bar, .content-body { padding-left: 20px; padding-right: 20px; }
}

@media (max-width: 640px) {
  .grid-layout { grid-template-columns: 1fr; gap: 18px; }
  .content-body { padding-left: 12px; padding-right: 12px; }
}
</style>
