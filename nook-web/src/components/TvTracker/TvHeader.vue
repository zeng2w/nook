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
      
      <div class="header-right">
        
        <div class="action-group">
          <button class="icon-action-btn" :disabled="isSyncing" @click="$emit('sync')" title="同步 TMDB 数据">
            <svg class="icon" :class="{ 'spin': isSyncing }" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            <span>同步</span>
          </button>
          
          <button class="icon-action-btn" @click="$emit('open-calendar')" title="追剧日历">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
            </svg>
            <span>日历</span>
          </button>

          <button class="icon-action-btn" @click="$emit('import')" title="导入备份">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M14 11l-2 2-2-2M12 13V3"/>
            </svg>
            <span>导入</span>
          </button>

          <button class="icon-action-btn" @click="$emit('export')" title="导出备份">
            <svg class="icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M14 11l-2-2-2 2M12 3v10"/>
            </svg>
            <span>导出</span>
          </button>
        </div>

        <div class="divider"></div>

        <div class="notification-wrapper">
          <button class="icon-btn noti-btn" @click="toggleNoti" :class="{ active: showNotiPanel }" title="消息通知">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span v-if="hasNew" class="red-dot"></span>
          </button>
          
          <transition name="fade-slide">
            <div v-if="showNotiPanel" class="noti-dropdown">
              <div class="noti-header"><span class="noti-header-title">消息通知</span></div>
              <div class="noti-list" v-if="notifications.length > 0">
                <div v-for="(item, index) in notifications" :key="item.uniqueId" class="noti-item">
                  <div class="noti-poster-box">
                    <img v-if="item.posterUrl" :src="item.posterUrl" class="noti-img" loading="lazy" />
                    <div v-else class="noti-img-placeholder">{{ item.title.charAt(0) }}</div>
                  </div>
                  <div class="noti-info">
                    <div class="noti-top-line"><span class="noti-title">{{ item.title }}</span></div>
                    <div class="noti-desc">更新至 <span class="highlight-ep">第 {{ item.newEp }} 集</span></div>
                  </div>
                  <button class="noti-delete-btn" @click.stop="$emit('remove-noti', index)"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></button>
                </div>
              </div>
              <div v-else class="noti-empty"><p>暂无新消息</p></div>
              <div class="noti-footer" v-if="notifications.length > 0">
                <button class="clear-all-btn" @click="$emit('clear-notis')">清空通知</button>
              </div>
            </div>
          </transition>
        </div>

        <button class="add-btn" @click="$emit('add')">+ 添加</button>
      </div>
    </div>
    
    <div v-if="showNotiPanel" class="transparent-overlay" @click="showNotiPanel = false"></div>
  </header>
</template>

<script setup>
import { ref } from 'vue';

defineProps({
  isVisible: { type: Boolean, default: true },
  notifications: { type: Array, default: () => [] },
  hasNew: { type: Boolean, default: false },
  totalCount: { type: Number, default: 0 },
  isSyncing: { type: Boolean, default: false }
});

// 移除了 'update:viewMode'
defineEmits(['add', 'remove-noti', 'clear-notis', 'noti-read', 'sync', 'export', 'import', 'open-calendar']);

const showNotiPanel = ref(false);
const toggleNoti = () => {
  showNotiPanel.value = !showNotiPanel.value;
  if (showNotiPanel.value) emit('noti-read');
};
</script>

<style scoped>
/* 保持原有样式完全不变，仅移除与 view-toggle 相关的 CSS */
.sticky-header-wrapper { position: sticky; top: 0; z-index: 99; background-color: rgba(255, 255, 255, 0.95); backdrop-filter: blur(10px); border-bottom: 1px solid #e5e7eb; padding: 12px 40px; }
.header { display: flex; justify-content: space-between; align-items: center; }
.page-title { margin: 0; font-size: 1.25rem; font-weight: 800; color: #111; }
.subtitle { color: #666; margin: 2px 0 0 0; font-size: 0.85rem; }
.header-right { display: flex; align-items: center; gap: 12px; }
.action-group { display: flex; gap: 4px; }
.icon-action-btn { background: transparent; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 6px; font-size: 0.8rem; font-weight: 600; color: #64748b; transition: all 0.2s; }
.icon-action-btn:hover { background: #f1f5f9; color: #0f172a; }
.divider { width: 1px; height: 20px; background: #e2e8f0; margin: 0 4px; }
.icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #eee; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; }
.add-btn { background: #000; color: #fff; border: none; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; }
.spin { animation: spin-anim 1s linear infinite; }
@keyframes spin-anim { 100% { transform: rotate(360deg); } }
.notification-wrapper { position: relative; display: flex; align-items: center; }
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

@media (max-width: 768px) {
  .header { padding: 15px 20px; flex-direction: column; align-items: flex-start; gap: 15px; }
  .header-actions { width: 100%; justify-content: space-between; }
  .page-title { font-size: 1.5rem; }
  .subtitle { display: none; }
  .add-btn { padding: 8px 14px; font-size: 0.85rem; }
  .noti-dropdown { width: 90vw; right: -10px; top: 120%; }
  .noti-delete-btn { opacity: 1; }
}
</style>