<template>
  <header class="sticky-header-wrapper">
    <div class="header">
      <div class="header-left">
        <div>
          <h2 class="page-title">追剧记录</h2>
          <p class="subtitle">
            管理您的影视作品观看进度
            <span class="count-badge" v-if="totalCount > 0">· 共 {{ totalCount }} 部</span>
          </p>
        </div>
      </div>
      
      <div class="header-center">
        <div class="search-box">
          <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            ref="searchInput"
            type="text" 
            aria-label="搜索剧集名称"
            placeholder="搜索剧集名称..." 
            :value="searchQuery"
            @input="$emit('update:searchQuery', $event.target.value)"
          />
          <kbd v-if="!searchQuery" class="search-shortcut">⌘K</kbd>
          <button v-if="searchQuery" class="clear-btn" aria-label="清除搜索" @click="$emit('update:searchQuery', '')">×</button>
        </div>
      </div>
      
      <div class="header-right">
        <div class="action-group">
          <div class="sync-control">
            <button class="icon-action-btn" aria-label="智能同步 TMDB 数据" :disabled="isSyncing" @click="$emit('sync')" title="仅检查当前需要更新的作品">
              <svg class="icon" :class="{ 'spin': isSyncing }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
              </svg>
              <span>同步</span>
            </button>
            <span
              v-if="syncStatusText"
              class="sync-status"
              :class="syncStatusTone"
              :title="syncStatusTitle"
              aria-live="polite"
            >{{ syncStatusText }}</span>
          </div>
          
          <button class="icon-action-btn" aria-label="打开追剧日历" @click="$emit('open-calendar')" title="追剧日历">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
            <span>日历</span>
          </button>

        </div>

        <div class="divider"></div>

        <div class="notification-wrapper">
          <button class="icon-btn noti-btn" aria-label="消息通知" :aria-expanded="showNotiPanel" @click="toggleNoti" :class="{ active: showNotiPanel }" title="消息通知">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span v-if="hasNew" class="red-dot"></span>
          </button>
          
          <transition name="fade-slide">
            <div v-if="showNotiPanel" class="noti-dropdown">
              <div class="noti-header"><span class="noti-header-title">消息通知</span></div>
              <div class="noti-list" v-if="notifications.length > 0">
                <div v-for="(item, index) in notifications" :key="item.uniqueId" class="noti-item">
                  <div class="noti-poster-box">
                    <img v-if="item.posterUrl" :src="item.posterUrl" :alt="item.title" class="noti-img" loading="lazy" decoding="async" />
                    <div v-else class="noti-img-placeholder">{{ item.title.charAt(0) }}</div>
                  </div>
                  <div class="noti-info">
                    <div class="noti-top-line"><span class="noti-title">{{ item.title }}</span></div>
                    <template v-if="item.type === 'new-season'">
                      <div class="noti-desc">发现可追踪的 <span class="highlight-ep">第 {{ item.seasonNumber }} 季</span></div>
                      <button class="noti-action-btn" @click.stop="addSeason(item)">添加这一季</button>
                    </template>
                    <div v-else class="noti-desc">更新至 <span class="highlight-ep">第 {{ item.newEp }} 集</span></div>
                  </div>
                  <button class="noti-delete-btn" :aria-label="`删除 ${item.title} 通知`" @click.stop="$emit('remove-noti', index)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
              </div>
              <div v-else class="noti-empty"><p>暂无新消息</p></div>
              <div class="noti-footer" v-if="notifications.length > 0">
                <button class="clear-all-btn" @click="$emit('clear-notis')">清空通知</button>
              </div>
            </div>
          </transition>
        </div>

        <div class="more-wrapper">
          <button
            class="icon-btn more-btn"
            aria-label="更多操作"
            :aria-expanded="showMoreMenu"
            title="更多操作"
            @click="toggleMoreMenu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.8"></circle>
              <circle cx="12" cy="12" r="1.8"></circle>
              <circle cx="19" cy="12" r="1.8"></circle>
            </svg>
          </button>
          <transition name="fade-slide">
            <div v-if="showMoreMenu" class="more-dropdown">
              <button type="button" class="more-menu-item" @click="runMoreAction('import')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M14 11l-2 2-2-2M12 13V3"/>
                </svg>
                <span>导入备份</span>
              </button>
              <button type="button" class="more-menu-item" @click="runMoreAction('export')">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M14 11l-2-2-2 2M12 3v10"/>
                </svg>
                <span>导出备份</span>
              </button>
            </div>
          </transition>
        </div>

        <button class="add-btn" @click="$emit('add')">+ 添加</button>
      </div>
    </div>
    
    <div v-if="showNotiPanel || showMoreMenu" class="transparent-overlay" @click="closePanels"></div>
  </header>
</template>

<script setup>
import { computed, ref, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  notifications: { type: Array, default: () => [] },
  hasNew: { type: Boolean, default: false },
  totalCount: { type: Number, default: 0 },
  isSyncing: { type: Boolean, default: false },
  syncStatus: { type: Object, default: () => ({}) },
  searchQuery: { type: String, default: '' } // 接收搜索词
});

const searchInput = ref(null);
const focusSearch = event => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.value?.focus();
  }
};
onMounted(() => window.addEventListener('keydown', focusSearch));
onUnmounted(() => window.removeEventListener('keydown', focusSearch));
const emit = defineEmits(['add', 'add-season', 'remove-noti', 'clear-notis', 'noti-read', 'sync', 'export', 'import', 'open-calendar', 'update:searchQuery']);

const showNotiPanel = ref(false);
const showMoreMenu = ref(false);
const formatSyncTime = value => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};
const syncStatusText = computed(() => {
  if (props.isSyncing) return '同步中…';
  if (props.syncStatus?.state === 'error') return '上次同步失败';
  if (props.syncStatus?.state === 'partial') return `${props.syncStatus.failedCount || 0} 部失败`;
  const time = formatSyncTime(props.syncStatus?.lastSuccessAt);
  return time ? `已同步 ${time}` : '';
});
const syncStatusTone = computed(() => ({
  error: props.syncStatus?.state === 'error',
  partial: props.syncStatus?.state === 'partial',
  success: props.syncStatus?.state === 'success'
}));
const syncStatusTitle = computed(() => {
  const parts = [];
  const lastSuccess = formatSyncTime(props.syncStatus?.lastSuccessAt);
  if (lastSuccess) parts.push(`最近成功：${lastSuccess}`);
  if (props.syncStatus?.checkedCount || props.syncStatus?.skippedCount) {
    parts.push(`检查 ${props.syncStatus.checkedCount || 0} 部，跳过 ${props.syncStatus.skippedCount || 0} 部`);
  }
  if (props.syncStatus?.cacheHitCount) {
    parts.push(`${props.syncStatus.cacheHitCount} 次请求使用缓存或合并`);
  }
  if (props.syncStatus?.message) parts.push(props.syncStatus.message);
  return parts.join('；');
});
const toggleNoti = () => {
  showMoreMenu.value = false;
  showNotiPanel.value = !showNotiPanel.value;
  if (showNotiPanel.value) emit('noti-read');
};
const toggleMoreMenu = () => {
  showNotiPanel.value = false;
  showMoreMenu.value = !showMoreMenu.value;
};
const closePanels = () => {
  showNotiPanel.value = false;
  showMoreMenu.value = false;
};
const runMoreAction = action => {
  showMoreMenu.value = false;
  emit(action);
};
const addSeason = (item) => {
  showNotiPanel.value = false;
  emit('add-season', item);
};
</script>

<style scoped>
/* ✨ 去除原本的白底和边框，使其与页面背景一样透明 */
.sticky-header-wrapper { position: sticky; top: 0; z-index: 99; background-color: transparent; padding: 16px 40px; }
.header { display: flex; justify-content: space-between; align-items: center; gap: 20px; }

/* ✨ 修复点 1：左侧保持内容原有宽度，不被压缩 */
.header-left { flex-shrink: 0; display: flex; align-items: center; }
.page-title { margin: 0; font-size: 1.3rem; font-weight: 800; color: #111; letter-spacing: -0.5px; }
.subtitle { color: #64748b; margin: 4px 0 0 0; font-size: 0.85rem; font-weight: 500; }
.count-badge { color: var(--theme-primary, #6366F1); font-weight: 600; }

/* ✨ 修复点 2：让中间的搜索栏去占据剩余的所有弹性空间 */
.header-center { flex: 1; display: flex; justify-content: center; padding: 0 20px; }
.search-box { display: flex; align-items: center; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0 12px; width: 100%; max-width: 400px; height: 38px; transition: all 0.2s; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
.search-box:focus-within { border-color: var(--theme-primary, #6366F1); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1); }
.search-icon { color: #94a3b8; margin-right: 8px; flex-shrink: 0; }
.search-box input { border: none; background: transparent; outline: none; width: 100%; font-size: 0.9rem; color: #334155; }
.search-box input::placeholder { color: #94a3b8; }
.clear-btn { background: none; border: none; color: #94a3b8; font-size: 1.2rem; cursor: pointer; padding: 0 4px; }
.clear-btn:hover { color: #475569; }

/* ✨ 修复点 3：右侧按钮组不缩小，并强制按钮内文字不换行 */
.header-right { flex-shrink: 0; display: flex; align-items: center; justify-content: flex-end; gap: 14px; }
.action-group { display: flex; gap: 6px; }
.sync-control { display: flex; flex-direction: column; align-items: center; justify-content: center; min-width: 96px; }
.sync-control .icon-action-btn { height: 28px; padding-top: 4px; padding-bottom: 4px; }
.sync-status { max-width: 120px; color: #64748b; font-size: 0.62rem; line-height: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sync-status.success { color: #059669; }
.sync-status.partial { color: #d97706; }
.sync-status.error { color: #dc2626; }

/* 加上 white-space: nowrap 和 flex-shrink: 0 彻底防止按钮文字溢出挤压 */
.icon-action-btn { 
  background: transparent; border: none; padding: 8px 12px; border-radius: 8px; cursor: pointer; 
  display: flex; align-items: center; gap: 6px; font-size: 0.85rem; font-weight: 600; color: #64748b; 
  transition: all 0.2s; white-space: nowrap; flex-shrink: 0; height: 38px;
}
.icon-action-btn:hover { background: #ffffff; color: #0f172a; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }

.divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; }

.icon-btn { 
  width: 38px; height: 38px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; cursor: pointer; 
  display: flex; align-items: center; justify-content: center; color: #666; transition: border-color 0.2s; flex-shrink: 0;
}
.icon-btn:hover { border-color: #cbd5e1; }
.icon-btn:focus-visible,
.icon-action-btn:focus-visible,
.add-btn:focus-visible,
.more-menu-item:focus-visible {
  outline: 3px solid rgba(99, 102, 241, 0.25);
  outline-offset: 2px;
}

.add-btn { 
  background: var(--theme-primary, #6366F1); color: #fff; border: none; padding: 0 20px; border-radius: 10px; 
  font-weight: 600; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; 
  display: flex; align-items: center; justify-content: center; height: 38px; white-space: nowrap; flex-shrink: 0;
}
.add-btn:hover { background: var(--theme-primary-hover, #4F46E5); }

/* --- 下面是通知面板样式，保持不变 --- */
.spin { animation: spin-anim 1s linear infinite; }
@keyframes spin-anim { 100% { transform: rotate(360deg); } }
.notification-wrapper { position: relative; z-index: 91; display: flex; align-items: center; }
.more-wrapper { position: relative; z-index: 91; display: flex; align-items: center; }
.more-dropdown { position: absolute; top: calc(100% + 12px); right: 0; width: 180px; padding: 8px; background: #fff; border: 1px solid rgba(0,0,0,0.06); border-radius: 14px; box-shadow: 0 12px 36px rgba(15,23,42,0.14); z-index: 100; }
.more-menu-item { width: 100%; display: flex; align-items: center; gap: 10px; border: 0; border-radius: 9px; padding: 10px 12px; background: transparent; color: #475569; font-size: 0.86rem; font-weight: 600; cursor: pointer; }
.more-menu-item:hover { color: #0f172a; background: #f8fafc; }
.red-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 1px solid white; }
.noti-dropdown { position: absolute; top: calc(100% + 12px); right: -10px; width: 360px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); z-index: 100; display: flex; flex-direction: column; overflow: hidden; max-height: 80vh; transform-origin: top right; }
.noti-header { padding: 16px 20px; border-bottom: 1px solid #f5f5f7; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
.noti-header-title { font-weight: 700; font-size: 1rem; color: #1d1d1f; }
.noti-list { overflow-y: auto; max-height: 400px; padding: 0; }
.noti-item { display: flex; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f5f5f7; transition: background 0.2s; position: relative; align-items: center; }
.noti-item:hover { background: #f9f9fb; }
.noti-poster-box { width: 48px; height: 72px; border-radius: 6px; overflow: hidden; background: #f2f2f7; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; }
.noti-img { width: 100%; height: 100%; object-fit: cover; }
.noti-img-placeholder { font-weight: 700; color: #c7c7cc; font-size: 1.2rem; }
.noti-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.noti-top-line { display: flex; justify-content: space-between; align-items: baseline; }
.noti-title { font-size: 0.95rem; font-weight: 600; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.noti-desc { font-size: 0.85rem; color: #424245; line-height: 1.4; }
.highlight-ep { color: #007aff; font-weight: 600; }
.noti-action-btn { align-self: flex-start; border: 0; border-radius: 6px; padding: 4px 8px; background: #eef2ff; color: #4f46e5; font-size: 0.75rem; font-weight: 700; cursor: pointer; }
.noti-action-btn:hover { background: #e0e7ff; }
.noti-delete-btn { background: none; border: none; padding: 6px; color: #c7c7cc; cursor: pointer; border-radius: 50%; transition: all 0.2s; opacity: 0; }
.noti-item:hover .noti-delete-btn { opacity: 1; }
.noti-delete-btn:hover { color: #ff3b30; background: rgba(255, 59, 48, 0.1); }
.noti-empty { padding: 60px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.noti-footer { padding: 12px 20px; border-top: 1px solid #f5f5f7; background: #fbfbfd; display: flex; justify-content: center; }
.clear-all-btn { display: flex; align-items: center; gap: 6px; border: none; background: none; font-size: 0.85rem; color: #86868b; cursor: pointer; padding: 8px 16px; border-radius: 20px; transition: all 0.2s; font-weight: 500; }
.clear-all-btn:hover { color: #1d1d1f; background: #f2f2f7; }
.transparent-overlay { position: fixed; inset: 0; background: transparent; z-index: 90; }
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(10px); }

@media (max-width: 1024px) {
  .header { flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-center { width: 100%; padding: 0; order: 3; }
  .search-box { max-width: 100%; }
  .header-right { width: 100%; justify-content: space-between; }
}

@media (max-width: 640px) {
  .sticky-header-wrapper { padding: 12px 12px 12px 64px; }
  .header-right { gap: 6px; overflow: visible; padding-bottom: 2px; }
  .action-group { gap: 2px; }
  .icon-action-btn { width: 38px; padding: 8px; justify-content: center; }
  .icon-action-btn span { display: none; }
  .sync-control { min-width: 38px; }
  .sync-status { display: none; }
  .divider { display: none; }
  .add-btn { padding: 0 14px; }
  .noti-dropdown { position: fixed; top: 64px; right: 12px; left: 12px; width: auto; }
  .more-dropdown { position: fixed; top: 64px; right: 12px; width: 180px; }
}
.search-box { border-radius: 24px; height: 40px; box-sizing: border-box; }
.search-box input { min-width: 0; font-size: 12px; }
.search-shortcut { font-family: inherit; color: #aaa6b3; border: 1px solid #eeecf1; border-radius: 5px; padding: 2px 5px; font-size: 10px; white-space: nowrap; }
</style>
