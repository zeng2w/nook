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
        :is-syncing="isSyncing || isAutoSyncing"
        :sync-status="syncStatus"
        v-model:searchQuery="searchQuery"  @add="openAddModal"
        @sync="syncData"
        @export="exportData"
        @import="triggerImport"
        @open-calendar="showCalendar = true"
        @add-season="openDiscoveredSeason"
        @remove-noti="removeNotification"
        @clear-notis="clearNotifications"
        @noti-read="hasNewNotis = false"
      />
    </header>

    <div class="bottom-main-layout">
      
      <div ref="mainColumn" class="main-content-column">
        
        <div class="sticky-filter-bar" v-if="showFacets.allCount > 0 || hasActiveFilters">
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
          <div class="filter-loading" :class="{ active: isLoading }" role="status" :aria-label="isLoading ? '正在更新列表' : undefined"></div>
        </div>

        <div class="content-body" :aria-busy="isLoading">
          <div v-if="hasSecondaryFilters" class="list-status" role="status">
            <span v-if="isLoading">正在更新列表…</span>
            <span v-else>{{ activeFilterSummary }} · {{ showPagination.total }} 部</span>
            <button @click="clearSecondaryFilters">清除筛选</button>
          </div>
          <div v-for="failure in failedProgress" :key="failure._id" class="inline-error" role="alert">《{{ failure.title }}》进度未同步，已保留本次输入。<button @click="retryProgress(failure)">重试保存</button></div>
          <div v-if="loadError && shows.length" class="inline-error" role="alert">{{ loadError }}，当前显示上次加载的结果。<button @click="fetchShows(true)">重试</button></div>
          <div v-if="isLoading && !shows.length" class="loading-state">
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
                :save-state="progressStates[show._id]"
                @set-progress="setProgress"
                @retry-progress="retryProgress"
                @details="openDetails"
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
                :save-state="progressStates[show._id]"
                @set-progress="setProgress"
                @retry-progress="retryProgress"
                @details="openDetails"
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
        <UpdateCalendar :shows="calendarShows" @open-calendar="showCalendar = true" />
        <TrendingSidebar :shows="calendarShows" @details="openDiscoveryDetails" />

      </div>

    </div>

    <ShowDetailsModal :show="detailShow" @close="detailSelection = null" @edit="openEditModal" @add="addFromDiscovery" />
    <EditShowModal v-model:visible="showModal" :edit-data="editingShow" :initial-selection="newShowPreset" :is-saving="isSavingShow" @save="saveShow" />
    <CalendarModal v-model:visible="showCalendar" :shows="calendarShows" @details="openDetails" />
    <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileUpload" />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { updateTheme } from '../store';
import { fetchShowsApi, fetchCalendarShowsApi, addShowApi, updateShowApi, updateShowProgressApi, deleteShowApi, syncShowsApi, importShowsApi } from '@/api/shows';
import { getApiErrorMessage } from '@/api/errors';
import { createProgressQueue } from '@/utils/progressQueue';
import ShowDetailsModal from '@/components/TvTracker/ShowDetailsModal.vue';
import { deriveShowStatus } from '@/utils/showStatus';
import { getAuthUserId } from '@/auth';
import { getCurrentTimeZone } from '@/utils/dateUtils';
import { readJsonStorage, writeJsonStorage } from '@/utils/storage';

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
const isAutoSyncing = ref(false);
const isLoading = ref(false); 
const isLoadingMore = ref(false);
const isSavingShow = ref(false);
const loadError = ref('');

const mainColumn = ref(null);
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
const newShowPreset = ref(null);
const pendingDiscoverySignature = ref(null);
const pendingDeletes = reactive({});
const progressStates = reactive({});
const progressModels = {};
const pendingStorageKey = getAuthUserId() ? `tv_pending_progress_${getAuthUserId()}` : null;
const pendingRecords = readJsonStorage(localStorage, pendingStorageKey, {}, value => value && typeof value === 'object' && !Array.isArray(value));
const confirmedStatuses = {};
const detailSelection = ref(null);
const detailShow = computed(() => detailSelection.value?._id
  ? shows.value.find(show => show._id === detailSelection.value._id) || detailSelection.value
  : detailSelection.value);
const failedProgress = computed(() => Object.entries(progressStates).filter(([, state]) => state.state === 'error').map(([id]) => progressModels[id]));
const activeFilterSummary = computed(() => [
  { all: '全部状态', watching: '在看', wish: '想看', watched: '已看', dropped: '弃剧' }[currentStatus.value],
  { all: '', tv: '电视剧', movie: '电影', anime: '动漫', variety: '综艺' }[currentCategory.value],
  currentNetwork.value !== 'all' ? currentNetwork.value : '',
  searchQuery.value.trim() ? `搜索「${searchQuery.value.trim()}」` : ''
].filter(Boolean).join(' · '));
const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);
const toast = reactive({ visible: false, message: '', type: 'success' });
const syncStatus = reactive({
  state: 'idle',
  lastAttemptAt: null,
  lastSuccessAt: null,
  checkedCount: 0,
  skippedCount: 0,
  failedCount: 0,
  cacheHitCount: 0,
  message: ''
});
const MAX_STORED_NOTIFICATIONS = 100;
const AUTO_SYNC_FOCUS_DELAY_MS = 1500;
const AUTO_SYNC_CLIENT_COOLDOWN_MS = 5 * 60 * 1000;
let latestFetchId = 0;
let searchTimer = null;
let autoSyncTimer = null;

const sortBy = ref('date');
const sortDesc = ref(true);
const displayShows = computed(() => shows.value);
const hasSecondaryFilters = computed(() => currentCategory.value !== 'all' || currentNetwork.value !== 'all' || Boolean(searchQuery.value.trim()));
const clearSecondaryFilters = () => {
  currentCategory.value = 'all';
  currentNetwork.value = 'all';
  searchQuery.value = '';
};
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
  for (const [id, record] of Object.entries(pendingRecords)) {
    if (!record?.show || record.show._id !== id || !Number.isSafeInteger(record.target) || record.target < 0) continue;
    progressModels[id] = record.show;
    progressQueue.restore(id, record.target, record.correction);
  }
  fetchShows();
  fetchCalendarShows();
  applyModernTheme(); 
  updateTheme('#F9FAFB');
  const notificationKey = getNotificationStorageKey();
  notifications.value = readJsonStorage(
    localStorage,
    notificationKey,
    [],
    value => Array.isArray(value)
  ).slice(0, MAX_STORED_NOTIFICATIONS);
  const storedSyncStatus = readJsonStorage(
    localStorage,
    getSyncStatusStorageKey(),
    null,
    value => value && typeof value === 'object' && !Array.isArray(value)
  );
  if (storedSyncStatus) Object.assign(syncStatus, storedSyncStatus);
  document.addEventListener('visibilitychange', handleVisibilityChange);
  window.addEventListener('focus', scheduleAutoSync);
  window.addEventListener('blur', clearAutoSyncTimer);
  scheduleAutoSync();
});

onUnmounted(() => {
  clearTimeout(searchTimer);
  clearAutoSyncTimer();
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', scheduleAutoSync);
  window.removeEventListener('blur', clearAutoSyncTimer);
  removeModernTheme(); 
  updateTheme('#ffffff');
  Object.values(pendingDeletes).forEach(timer => clearTimeout(timer));
  void progressQueue.flushAll();
});

const getNotificationStorageKey = () => {
  const userId = getAuthUserId();
  return userId ? `nook-tv-notifications-${userId}` : null;
};
const getAutoSyncStorageKey = () => {
  const userId = getAuthUserId();
  return userId ? `nook-tv-auto-sync-${userId}` : null;
};
const getSyncStatusStorageKey = () => {
  const userId = getAuthUserId();
  return userId ? `nook-tv-sync-status-${userId}` : null;
};
const persistSyncStatus = () => {
  writeJsonStorage(localStorage, getSyncStatusStorageKey(), { ...syncStatus });
};
const recordSyncResult = (data = {}) => {
  const completedAt = new Date().toISOString();
  const failedCount = Number(data.failedCount) || 0;
  Object.assign(syncStatus, {
    state: failedCount > 0 ? 'partial' : 'success',
    lastAttemptAt: completedAt,
    lastSuccessAt: failedCount === 0 ? completedAt : syncStatus.lastSuccessAt,
    checkedCount: Number(data.checkedCount) || 0,
    skippedCount: Number(data.skippedCount) || 0,
    failedCount,
    cacheHitCount: Number(data.cacheHitCount) || 0,
    message: failedCount > 0 ? `${failedCount} 部作品同步失败` : ''
  });
  persistSyncStatus();
};
const recordSyncFailure = (error) => {
  Object.assign(syncStatus, {
    state: 'error',
    lastAttemptAt: new Date().toISOString(),
    failedCount: 0,
    message: getApiErrorMessage(error, '同步失败')
  });
  persistSyncStatus();
};
const isSyncInProgressError = error => error.response?.data?.code === 'SYNC_IN_PROGRESS';
watch(notifications, (newVal) => {
  const notificationKey = getNotificationStorageKey();
  writeJsonStorage(localStorage, notificationKey, newVal.slice(0, MAX_STORED_NOTIFICATIONS));
}, { deep: true });
const showToast = (msg, type = 'success') => { toast.message = msg; toast.type = type; toast.visible = true; setTimeout(() => { toast.visible = false; }, 3000); };

const preservePendingProgress = show => {
  const state = progressStates[show._id];
  if (!state || state.state === 'saved') return show;
  return { ...show, ...state.correction, watchedEpisodes: state.target, status: show.status === 'dropped' ? 'dropped' : calcStatus(state.target, show.airedEpisodes, state.correction?.totalEpisodes ?? show.totalEpisodes) };
};

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
    const incoming = (res.data.items || []).map(preservePendingProgress);
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
    calendarShows.value = response.data.map(preservePendingProgress);
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
  () => { mainColumn.value?.scrollTo({ top: 0 }); fetchShows(true); }
);

watch(searchQuery, () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => { mainColumn.value?.scrollTo({ top: 0 }); fetchShows(true); }, 300);
});

const calcStatus = (watchedEpisodes, airedEpisodes, totalEpisodes) => deriveShowStatus({
  watchedEpisodes,
  airedEpisodes,
  totalEpisodes
});

const getNotificationSignature = (notification = {}) => (
  notification.type === 'new-season'
    ? `season|${notification.tmdbId}|${notification.seasonNumber}`
    : `episode|${notification.title}|${notification.newEp}|${notification.updateDate || notification.date}`
);

const saveShow = async (formData) => {
  const userId = getAuthUserId();
  if (!userId || !formData.title) return showToast("请输入作品名称", "error");
  if (isSavingShow.value) return;
  isSavingShow.value = true;
  try {
    if (editingShow.value && editingShow.value._id) {
      await updateShowApi(editingShow.value._id, formData);
      showToast("编辑成功", "success");
    } else {
      const initialStatus = calcStatus(formData.watchedEpisodes, formData.airedEpisodes, formData.totalEpisodes);
      await addShowApi({ ...formData, status: initialStatus });
      if (pendingDiscoverySignature.value) {
        notifications.value = notifications.value.filter(
          notification => getNotificationSignature(notification) !== pendingDiscoverySignature.value
        );
      }
      showToast("添加成功", "success");
    }
    showModal.value = false;
    newShowPreset.value = null;
    pendingDiscoverySignature.value = null;
    await refreshShowData();
  } catch (err) {
    console.error(err);
    showToast(getApiErrorMessage(err, '保存失败'), "error");
  } finally {
    isSavingShow.value = false;
  }
};

const progressQueue = createProgressQueue({
  save: async (id, target, correction) => {
    const model = progressModels[id];
    const response = await updateShowProgressApi(id, {
      ...correction,
      watchedEpisodes: target,
      status: calcStatus(target, model.airedEpisodes, model.totalEpisodes),
      date: new Date()
    });
    return response.data.show;
  },
  onChange: (id, state) => {
    if (state.state === 'saved') delete pendingRecords[id];
    else pendingRecords[id] = { show: progressModels[id], target: state.target, correction: state.correction };
    writeJsonStorage(localStorage, pendingStorageKey, pendingRecords);
    progressStates[id] = { ...state, error: state.error ? getApiErrorMessage(state.error, '保存失败，请重试') : '' };
  },
  onSaved: (id, saved, target) => {
    const previousStatus = confirmedStatuses[id];
    if (previousStatus && previousStatus !== saved.status) {
      showFacets.statusCounts[previousStatus] = Math.max(0, (showFacets.statusCounts[previousStatus] || 0) - 1);
      showFacets.statusCounts[saved.status] = (showFacets.statusCounts[saved.status] || 0) + 1;
    }
    confirmedStatuses[id] = saved.status;
    const overrides = { watchedEpisodes: target, status: calcStatus(target, saved.airedEpisodes, saved.totalEpisodes) };
    Object.assign(progressModels[id], saved, overrides);
    patchShowCollections(saved, overrides);
  }
});
const setProgress = (show, target, correction) => {
  if (show.status === 'dropped' || !Number.isSafeInteger(target) || target < 0) return;
  const total = correction?.totalEpisodes ?? show.totalEpisodes;
  const maximum = total > 0 ? total : Number.POSITIVE_INFINITY;
  const value = Math.min(maximum, target);
  if (value === show.watchedEpisodes && !correction) return;
  confirmedStatuses[show._id] ??= show.status;
  progressModels[show._id] = show;
  const patch = { _id: show._id, ...correction, watchedEpisodes: value, status: calcStatus(value, show.airedEpisodes, total) };
  Object.assign(show, patch);
  patchShowCollections(patch);
  progressQueue.set(show._id, value, correction);
};
const updateProgress = (show, delta) => setProgress(show, Math.max(0, (show.watchedEpisodes || 0) + delta));
const retryProgress = show => { void progressQueue.flush(show._id); };
const openDetails = show => { detailSelection.value = show; };
const openDiscoveryDetails = show => {
  detailSelection.value = {
    tmdbId: show.id, tmdbType: 'tv', title: show.name,
    category: show.genre_ids?.includes(16) ? 'anime' : show.genre_ids?.includes(10764) ? 'variety' : 'tv',
    posterUrl: show.poster_path ? `https://image.tmdb.org/t/p/w342${show.poster_path}` : '',
    overview: show.overview, releaseDate: show.first_air_date, rating: show.vote_average
  };
};
const addFromDiscovery = show => {
  editingShow.value = null;
  pendingDiscoverySignature.value = null;
  newShowPreset.value = show;
  showModal.value = true;
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

const openAddModal = () => {
  editingShow.value = null;
  newShowPreset.value = null;
  pendingDiscoverySignature.value = null;
  showModal.value = true;
};
const openDiscoveredSeason = (notification) => {
  editingShow.value = null;
  newShowPreset.value = {
    tmdbId: notification.tmdbId,
    title: notification.title,
    category: notification.category,
    tmdbType: notification.tmdbType,
    posterUrl: notification.posterUrl,
    seasonNumber: notification.seasonNumber
  };
  pendingDiscoverySignature.value = getNotificationSignature(notification);
  showModal.value = true;
};
const settleProgress = async show => {
  if (progressStates[show._id]?.state === 'saving') await progressQueue.flush(show._id);
  if (progressStates[show._id]?.state === 'error') { showToast('观看进度尚未保存，请先重试', 'error'); return false; }
  return true;
};
const openEditModal = async (show) => {
  if (!await settleProgress(show)) return;
  newShowPreset.value = null;
  pendingDiscoverySignature.value = null;
  editingShow.value = { ...show };
  showModal.value = true;
};
const dropShow = async (show) => {
  if (!await settleProgress(show)) return;
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
  if (!await settleProgress(show)) return;
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
  if (!userId || isSyncing.value || isAutoSyncing.value) return;
  isSyncing.value = true;
  showToast("正在同步...", "success");
  try {
    const res = await syncShowsApi({ force: false, timeZone: getCurrentTimeZone() });
    await refreshShowData();
    applySyncNotifications(res.data);
    recordSyncResult(res.data);
    const discoveryCount = res.data.seasonDiscoveries?.length || 0;
    if (res.data.updatedCount > 0 || discoveryCount > 0) {
      const failedSuffix = res.data.failedCount > 0 ? `，${res.data.failedCount} 部获取失败` : '';
      const resultParts = [];
      if (res.data.updatedCount > 0) resultParts.push(`更新 ${res.data.updatedCount} 部`);
      if (discoveryCount > 0) resultParts.push(`发现 ${discoveryCount} 个新季度`);
      showToast(`同步完成！${resultParts.join('，')}${failedSuffix}`, res.data.failedCount > 0 ? "error" : "success");
    } else if (res.data.failedCount > 0) {
      showToast(`同步完成，但有 ${res.data.failedCount} 部获取失败`, "error");
    } else { showToast('暂无新内容', "success"); }
  } catch (err) {
    console.error(err);
    if (isSyncInProgressError(err)) {
      showToast('同步已在另一个窗口进行', 'success');
    } else {
      recordSyncFailure(err);
      showToast(getApiErrorMessage(err, '同步失败'), "error");
    }
  } finally { isSyncing.value = false; }
};

const applySyncNotifications = (data = {}) => {
  const incomingItems = [
    ...(data.logs || []).map(log => ({ ...log, type: 'episode-update', updateDate: log.date })),
    ...(data.seasonDiscoveries || [])
  ];
  if (!incomingItems.length) return;
  const existingSignatures = new Set(
    notifications.value.map(getNotificationSignature)
  );
  const uniqueNewItems = incomingItems
    .filter(item => !existingSignatures.has(getNotificationSignature(item)))
    .map(item => ({ ...item, uniqueId: Date.now() + Math.random() }));
  if (!uniqueNewItems.length) return;
  notifications.value = [...uniqueNewItems, ...notifications.value].slice(0, MAX_STORED_NOTIFICATIONS);
  hasNewNotis.value = true;
};

const clearAutoSyncTimer = () => {
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = null;
};

const runAutoSync = async () => {
  autoSyncTimer = null;
  const storageKey = getAutoSyncStorageKey();
  if (
    !storageKey ||
    isSyncing.value ||
    isAutoSyncing.value ||
    document.visibilityState !== 'visible' ||
    !document.hasFocus()
  ) return;

  const lastAttemptAt = readJsonStorage(
    localStorage,
    storageKey,
    0,
    value => Number.isFinite(value) && value >= 0
  );
  if (Date.now() - lastAttemptAt < AUTO_SYNC_CLIENT_COOLDOWN_MS) return;

  writeJsonStorage(localStorage, storageKey, Date.now());
  isAutoSyncing.value = true;
  try {
    const response = await syncShowsApi({ force: false, timeZone: getCurrentTimeZone() });
    applySyncNotifications(response.data);
    recordSyncResult(response.data);
    if (response.data.changedCount > 0) await refreshShowData();
  } catch (error) {
    if (!isSyncInProgressError(error)) recordSyncFailure(error);
    console.warn('Automatic TMDB sync failed:', getApiErrorMessage(error, '同步失败'));
  } finally {
    isAutoSyncing.value = false;
  }
};

const scheduleAutoSync = () => {
  clearAutoSyncTimer();
  if (document.visibilityState !== 'visible') return;
  autoSyncTimer = setTimeout(runAutoSync, AUTO_SYNC_FOCUS_DELAY_MS);
};

const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') scheduleAutoSync();
  else clearAutoSyncTimer();
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
  overflow-x: hidden;
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
  box-sizing: border-box;
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

.tv-page-modern-layout { background: #f8f9fc; }
.main-content-column { min-width: 0; }
.discovery-sidebar-column { width: 285px; min-width: 285px; padding: 10px 24px 30px 0; box-sizing: border-box; gap: 20px; overflow-y: auto; }
.sticky-filter-bar { background: #f8f9fc; padding: 10px 28px 0; }
.content-body { padding: 0 28px 40px; }
.grid-layout { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 22px 18px; }
@media (max-width: 640px) { .grid-layout { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }.content-body { padding: 0 12px 30px; }.sticky-filter-bar { padding: 10px 12px 0; } }
@media (max-width: 360px) { .grid-layout { grid-template-columns: 1fr; } }
.list-status { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 30px; margin-bottom: 12px; font-size: 12px; color: #726c7d; }
.list-status button, .inline-error button { border: 0; background: transparent; color: #775491; text-decoration: underline; cursor: pointer; font-size: 12px; flex-shrink: 0; }
.inline-error { border: 1px solid #edd9df; background: #fff5f7; color: #9d4052; padding: 12px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
.filter-loading { height: 2px; margin-top: 8px; overflow: hidden; }
.filter-loading.active { background: #e9e1f1; }
.filter-loading.active::after { content: ""; display: block; width: 35%; height: 100%; background: #9373b5; animation: filter-loading 1.2s ease-in-out infinite alternate; }
@keyframes filter-loading { to { transform: translateX(185%); } }
@media (prefers-reduced-motion: reduce) { .filter-loading.active::after { animation: none; width: 100%; } }
</style>
