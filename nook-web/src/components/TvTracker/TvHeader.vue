<template>
  <div class="sticky-header-wrapper" :class="{ 'header-hidden': !isVisible }">
    <div class="header">
      <div>
        <h2 class="page-title">追剧记录</h2>
        <p class="subtitle">
          管理您的影视作品观看进度
          <span class="count-badge" v-if="totalCount > 0">· 共 {{ totalCount }} 部</span>
        </p>
      </div>
      <div class="header-actions">
        
        <div class="notification-wrapper">
          <button class="icon-btn noti-btn" @click="toggleNoti" :class="{ active: showNotiPanel }" title="消息通知">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
            <span v-if="hasNew" class="red-dot"></span>
          </button>

          <transition name="fade-slide">
            <div v-if="showNotiPanel" class="noti-dropdown">
              <div class="noti-header">
                <span class="noti-header-title">消息通知</span>
                <span class="noti-count-badge" v-if="notifications.length">{{ notifications.length }}</span>
              </div>
              
              <div class="noti-list" v-if="notifications.length > 0">
                <div v-for="(item, index) in notifications" :key="item.uniqueId" class="noti-item">
                  <div class="noti-poster-box">
                    <img v-if="item.posterUrl" :src="item.posterUrl" class="noti-img" loading="lazy" />
                    <div v-else class="noti-img-placeholder">{{ item.title.charAt(0) }}</div>
                  </div>
                  
                  <div class="noti-info">
                    <div class="noti-top-line">
                      <span class="noti-title">{{ item.title }}</span>
                      <span class="noti-time">{{ formatDateSimple(item.updateDate) }}</span>
                    </div>
                    <div class="noti-desc">
                      更新至 <span class="highlight-ep">第 {{ item.newEp }} 集</span>
                      <span class="old-ep" v-if="item.oldEp">(原: {{ item.oldEp }})</span>
                    </div>
                  </div>

                  <button class="noti-delete-btn" @click.stop="$emit('remove-noti', index)" title="删除这条通知">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              </div>
              
              <div v-else class="noti-empty">
                <div class="empty-icon-circle">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13.73 21a2 2 0 0 1-3.46 0"></path><path d="M18.63 13A17.89 17.89 0 0 1 18 8"></path><path d="M6.26 6.26A5.86 5.86 0 0 0 6 8c0 7-3 9-3 9h14"></path><path d="M18 8a6 6 0 0 0-9.33-5"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                </div>
                <p class="empty-text">暂无新消息</p>
                <p class="empty-subtext">剧集更新后会在这里提醒你</p>
              </div>

              <div class="noti-footer" v-if="notifications.length > 0">
                <button class="clear-all-btn" @click="$emit('clear-notis')">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  清空所有通知
                </button>
              </div>
            </div>
          </transition>
        </div>

        <div class="divider-vertical"></div>

        <div class="view-toggle">
          <button class="toggle-btn" :class="{ active: viewMode === 'grid' }" @click="$emit('update:viewMode', 'grid')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
          <button class="toggle-btn" :class="{ active: viewMode === 'list' }" @click="$emit('update:viewMode', 'list')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
        </div>
        
        <button class="add-btn" @click="$emit('add')">
          <span class="plus-icon">+</span> 添加剧集
        </button>
      </div>
    </div>
    
    <slot name="filters"></slot>
  </div>
  
  <div v-if="showNotiPanel" class="transparent-overlay" @click="showNotiPanel = false"></div>
</template>

<script setup>
import { ref } from 'vue';
import { formatDateCN } from '@/utils/dateUtils';

const props = defineProps({
  isVisible: { type: Boolean, default: true },
  notifications: { type: Array, default: () => [] },
  hasNew: { type: Boolean, default: false },
  viewMode: { type: String, default: 'grid' },
  totalCount: { type: Number, default: 0 } // ★ 接收总数
});

const emit = defineEmits(['update:viewMode', 'add', 'remove-noti', 'clear-notis', 'noti-read']);

const showNotiPanel = ref(false);

const toggleNoti = () => {
  showNotiPanel.value = !showNotiPanel.value;
  if (showNotiPanel.value) emit('noti-read');
};

const formatDateSimple = formatDateCN;
</script>

<style scoped>
/* Header Styles (毛玻璃 + 投影) */
.sticky-header-wrapper { 
  position: sticky; 
  top: 0; 
  z-index: 99; 
  background-color: rgba(255, 255, 255, 0.85); 
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  border-bottom: 1px solid rgba(0,0,0,0.06); 
  box-shadow: 0 4px 24px rgba(0,0,0,0.02);
  padding-bottom: 10px; 
  transition: transform 0.3s ease-in-out; 
  transform: translateY(0); 
}
.sticky-header-wrapper.header-hidden { transform: translateY(-80%); }
.header { display: flex; justify-content: space-between; align-items: center; padding: 30px 40px 10px 40px; }
.page-title { margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; }
.subtitle { color: #666; margin-top: 5px; font-size: 0.95rem; }
.count-badge { color: #1d1d1f; font-weight: 500; margin-left: 4px; } /* ★ 统计数字样式 */
.header-actions { display: flex; gap: 12px; align-items: center; }
.divider-vertical { width: 1px; height: 24px; background: #e5e7eb; margin: 0 8px; }

/* Buttons */
.icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #eee; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; transition: all 0.2s; }
.icon-btn:hover { background: #f9fafb; color: #333; }
.view-toggle { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 4px; display: flex; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.toggle-btn { background: none; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #999; display: flex; align-items: center; transition: all 0.2s; }
.toggle-btn:hover { color: #333; }
.toggle-btn.active { background: #f3f4f6; color: #111; }
.add-btn { background: #000; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.1s; }
.add-btn:active { transform: scale(0.98); }

/* Notifications (精致版) */
.notification-wrapper { position: relative; display: flex; align-items: center; }
.red-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 1px solid white; }
.noti-dropdown { position: absolute; top: calc(100% + 12px); right: -10px; width: 360px; background: white; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.12), 0 2px 10px rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.05); z-index: 100; display: flex; flex-direction: column; overflow: hidden; max-height: 80vh; transform-origin: top right; }
.noti-header { padding: 16px 20px; border-bottom: 1px solid #f5f5f7; display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.95); backdrop-filter: blur(10px); }
.noti-header-title { font-weight: 700; font-size: 1rem; color: #1d1d1f; }
.noti-count-badge { background: #ff3b30; color: white; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; box-shadow: 0 2px 5px rgba(255, 59, 48, 0.3); }
.noti-list { overflow-y: auto; max-height: 400px; padding: 0; }
.noti-item { display: flex; gap: 16px; padding: 16px 20px; border-bottom: 1px solid #f5f5f7; transition: background 0.2s; position: relative; align-items: center; }
.noti-item:hover { background: #f9f9fb; }
.noti-poster-box { width: 48px; height: 72px; border-radius: 6px; overflow: hidden; background: #f2f2f7; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: center; }
.noti-img { width: 100%; height: 100%; object-fit: cover; }
.noti-img-placeholder { font-weight: 700; color: #c7c7cc; font-size: 1.2rem; }
.noti-info { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.noti-top-line { display: flex; justify-content: space-between; align-items: baseline; }
.noti-title { font-size: 0.95rem; font-weight: 600; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.noti-time { font-size: 0.7rem; color: #86868b; font-weight: 500; }
.noti-desc { font-size: 0.85rem; color: #424245; line-height: 1.4; }
.highlight-ep { color: #007aff; font-weight: 600; }
.old-ep { color: #98989d; font-size: 0.75rem; margin-left: 6px; }
.noti-delete-btn { background: none; border: none; padding: 6px; color: #c7c7cc; cursor: pointer; border-radius: 50%; transition: all 0.2s; opacity: 0; }
.noti-item:hover .noti-delete-btn { opacity: 1; }
.noti-delete-btn:hover { color: #ff3b30; background: rgba(255, 59, 48, 0.1); }
.noti-empty { padding: 60px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.empty-icon-circle { width: 60px; height: 60px; background: #f2f2f7; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; color: #86868b; }
.empty-text { font-size: 1rem; font-weight: 600; color: #1d1d1f; margin: 0 0 4px 0; }
.empty-subtext { font-size: 0.8rem; color: #86868b; margin: 0; }
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