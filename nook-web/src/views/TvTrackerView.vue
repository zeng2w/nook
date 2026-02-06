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
        />
      </template>
    </TvHeader>

    <div class="content-body">
      
      <ShowSortToolbar 
        :sortBy="sortBy" 
        :sortDesc="sortDesc" 
        @change="handleSort" 
      />

      <div v-if="viewMode === 'grid'" class="grid-layout">
        <ShowGridCard 
          v-for="show in sortedShows" 
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
        <div v-if="sortedShows.length === 0" class="empty-state">暂无相关剧集</div>
      </div>

      <div v-else class="list-layout-container">
        <ShowListItem
          v-for="show in sortedShows" 
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
        <div v-if="sortedShows.length === 0" class="empty-state">暂无相关剧集</div>
      </div>
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
import axios from 'axios';
import { updateTheme } from '../store';

// 引入组件
import TvHeader from '../components/TvTracker/TvHeader.vue';
import FilterBar from '../components/TvTracker/FilterBar.vue';
import ShowGridCard from '../components/TvTracker/ShowGridCard.vue';
import ShowListItem from '../components/TvTracker/ShowListItem.vue';
import EditShowModal from '../components/TvTracker/EditShowModal.vue';
import CalendarModal from '../components/TvTracker/CalendarModal.vue';
import FabMenu from '../components/TvTracker/FabMenu.vue';

// ★ 引入排序相关
import { useShowSort } from '@/composables/useShowSort';
import ShowSortToolbar from '@/components/TvTracker/ShowSortToolbar.vue';

// --- 状态与逻辑 ---
const viewMode = ref('grid');
const currentCategory = ref('all');
const currentStatus = ref('all');
const currentNetwork = ref('all');
const showModal = ref(false);
const showCalendar = ref(false);
const isMenuOpen = ref(false);
const isSyncing = ref(false);
const isLoading = ref(false);

const shows = ref([]);
const editingShow = ref(null);
const pendingDeletes = reactive({});
const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);

const toast = reactive({ visible: false, message: '', type: 'success' });

// 计算属性：平台列表
const uniqueNetworks = computed(() => {
  const nets = new Map();
  shows.value.forEach(s => {
    if (s.network && !nets.has(s.network)) {
      nets.set(s.network, { name: s.network, logo: s.networkLogo });
    }
  });
  return Array.from(nets.values()).sort((a, b) => a.name.localeCompare(b.name));
});

// 计算属性：筛选逻辑 (只负责过滤，不负责排序)
const filteredShows = computed(() => {
  return shows.value.filter(s => {
    const catMatch = currentCategory.value === 'all' || s.category === currentCategory.value;
    const statusMatch = currentStatus.value === 'all' || s.status === currentStatus.value;
    const netMatch = currentNetwork.value === 'all' || s.network === currentNetwork.value;
    return catMatch && statusMatch && netMatch;
  });
});

// ★ 排序逻辑：使用 Composable 接管排序
// 它接收筛选后的列表，返回排序后的列表和控制变量
const { sortBy, sortDesc, sortedShows, handleSort } = useShowSort(filteredShows);

// --- Scroll Logic ---
const isHeaderVisible = ref(true);
const mainContainer = ref(null);
let lastScrollY = 0;
const handleScroll = () => {
  const container = mainContainer.value;
  if (!container) return;
  const currentScrollY = container.scrollTop;
  if (currentScrollY < 10) { isHeaderVisible.value = true; lastScrollY = currentScrollY; return; }
  if (Math.abs(currentScrollY - lastScrollY) < 10) return;
  isHeaderVisible.value = currentScrollY <= lastScrollY || (lastScrollY - currentScrollY > 20);
  lastScrollY = currentScrollY;
};
const handleMouseMove = (e) => { if (e.clientY < 50) isHeaderVisible.value = true; };

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
});

watch(notifications, (newVal) => { localStorage.setItem('tv_notifications', JSON.stringify(newVal)); }, { deep: true });

// --- 业务逻辑 (CRUD) ---
const getCurrentUserId = () => { const userStr = sessionStorage.getItem('current_user'); return userStr ? JSON.parse(userStr).id : null; };
const showToast = (msg, type = 'success') => { toast.message = msg; toast.type = type; toast.visible = true; setTimeout(() => { toast.visible = false; }, 3000); };

const fetchShows = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  isLoading.value = true;
  try {
    const res = await axios.get(`/api/shows?userId=${userId}&t=${new Date().getTime()}`);
    shows.value = res.data;
  } catch (err) { console.error(err); } 
  finally { setTimeout(() => { isLoading.value = false; }, 300); }
};

const openAddModal = () => { editingShow.value = null; showModal.value = true; };
const openEditModal = (show) => { editingShow.value = { ...show }; showModal.value = true; };

const calcStatus = (watched, aired, total) => { if (watched === 0) return 'wish'; const target = (total > 0) ? total : aired; if (target > 0 && watched >= target) return 'watched'; return 'watching'; };

const saveShow = async (formData) => {
  const userId = getCurrentUserId();
  if (!userId || !formData.title) return showToast("请输入作品名称", "error");
  try {
    let res;
    if (editingShow.value && editingShow.value._id) {
      res = await axios.put(`/api/shows/${editingShow.value._id}`, formData);
      const index = shows.value.findIndex(s => s._id === editingShow.value._id);
      if (index !== -1) shows.value[index] = res.data;
      showToast("编辑成功", "success");
    } else {
      const initialStatus = calcStatus(formData.watchedEpisodes, formData.airedEpisodes, formData.totalEpisodes);
      res = await axios.post('/api/shows', { userId, ...formData, status: initialStatus });
      shows.value.unshift(res.data);
      showToast("添加成功", "success");
    }
    showModal.value = false;
  } catch (err) {
    console.error(err);
    showToast("保存失败", "error");
  }
};

const updateProgress = async (show, delta) => {
  if (show.status === 'dropped') return;
  const newVal = Math.max(0, show.watchedEpisodes + delta);
  show.watchedEpisodes = newVal;
  const newStatus = calcStatus(newVal, show.airedEpisodes, show.totalEpisodes);
  if (newStatus !== show.status) show.status = newStatus;
  try { await axios.put(`/api/shows/${show._id}`, { watchedEpisodes: newVal, status: newStatus }); } catch(e){}
};

const dropShow = async (show) => {
  show.status = 'dropped';
  try { await axios.put(`/api/shows/${show._id}`, { status: 'dropped' }); } catch(e){}
};

const restoreShow = async (show) => {
  const correctStatus = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes);
  show.status = correctStatus;
  try { await axios.put(`/api/shows/${show._id}`, { status: correctStatus }); } catch(e){}
};

const requestHardDelete = (id) => { pendingDeletes[id] = setTimeout(() => { confirmDelete(id); }, 3000); };
const cancelDelete = (id) => { if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } };
const pauseDeleteTimer = (id) => { if (pendingDeletes[id]) clearTimeout(pendingDeletes[id]); };
const resumeDeleteTimer = (id) => {
  if (pendingDeletes[id] !== undefined) {
    clearTimeout(pendingDeletes[id]); 
    pendingDeletes[id] = setTimeout(() => {
      confirmDelete(id);
    }, 3000);
  }
};
const confirmDelete = async (id) => {
  if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; }
  const backup = shows.value.find(s => s._id === id);
  shows.value = shows.value.filter(s => s._id !== id);
  try { await axios.delete(`/api/shows/${id}`); showToast("删除成功", "success"); } 
  catch (err) { console.error(err); if(backup) shows.value.push(backup); showToast("删除失败", "error"); }
};

const clearNotifications = () => { notifications.value = []; };
const removeNotification = (index) => { notifications.value.splice(index, 1); };

const syncData = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  isSyncing.value = true;
  showToast("正在同步...", "success");
  try {
    const res = await axios.post('/api/shows/sync', { userId });
    await fetchShows();
    if (res.data.updatedCount > 0) {
      if (res.data.logs?.length) {
        const existingSignatures = new Set(notifications.value.map(n => `${n.title}|${n.newEp}|${n.updateDate}`));
        const uniqueNewItems = res.data.logs.filter(log => !existingSignatures.has(`${log.title}|${log.newEp}|${log.date}`))
          .map(log => ({ ...log, updateDate: log.date, uniqueId: Date.now() + Math.random() }));
        if (uniqueNewItems.length) { notifications.value = [...uniqueNewItems, ...notifications.value]; hasNewNotis.value = true; }
      }
      showToast(`同步完成！更新 ${res.data.updatedCount} 部`, "success");
    } else { showToast('暂无新内容', "success"); }
  } catch (err) { console.error(err); showToast('同步失败', "error"); } 
  finally { isSyncing.value = false; }
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
      await axios.post('/api/shows/import', { userId, shows: parsedData });
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
.empty-state { padding: 50px; text-align: center; color: #999; grid-column: 1 / -1; }

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