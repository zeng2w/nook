<template>
  <div class="fab-wrapper">
    <div class="fab-container">
      <transition-group name="fab-stagger" tag="div" class="fab-menu-items">
        <div v-if="isOpen" key="sync" class="fab-item">
          <div class="fab-label">同步进度</div>
          <button class="fab-btn small" @click="$emit('sync')" :disabled="isSyncing">
            <span v-if="isSyncing" class="spinner">⟳</span>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
        </div>
        <div v-if="isOpen" key="export" class="fab-item">
          <div class="fab-label">备份数据</div>
          <button class="fab-btn small export-btn" @click="$emit('export')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        </div>
        <div v-if="isOpen" key="import" class="fab-item">
          <div class="fab-label">恢复备份</div>
          <button class="fab-btn small import-btn" @click="$emit('import')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </button>
        </div>
        <div v-if="isOpen" key="calendar" class="fab-item">
          <div class="fab-label">追剧日历</div>
          <button class="fab-btn small" @click="$emit('open-calendar')">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </button>
        </div>
      </transition-group>

      <button class="fab-btn main" @click="$emit('toggle')" :class="{ 'is-active': isOpen }">
        <span class="main-icon" v-if="!isOpen"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>
        <span class="close-icon" v-else><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
      </button>
    </div>
    
    <transition name="fade">
      <div v-if="isOpen" class="fab-overlay" @click="$emit('toggle')"></div>
    </transition>
  </div>
</template>

<script setup>
defineProps({
  isOpen: Boolean,
  isSyncing: Boolean
});
defineEmits(['toggle', 'sync', 'export', 'import', 'open-calendar']);
</script>

<style scoped>
.fab-container { position: fixed; bottom: 30px; right: 30px; z-index: 1000; display: flex; flex-direction: column-reverse; align-items: center; gap: 16px; }
.fab-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(2px); z-index: 999; }
.fab-btn { border: none; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); color: #333; position: relative; }
.fab-btn.main { width: 64px; height: 64px; border-radius: 50%; background: #3B82F6; color: white; font-size: 1.5rem; z-index: 2; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
.fab-btn.main:hover { transform: scale(1.05); }
.fab-btn.main.is-active { background: #3B82F6; } 
.fab-btn.main.is-active .main-icon, .fab-btn.main.is-active .close-icon { transform: rotate(90deg); transition: transform 0.3s; }
.fab-item { position: relative; display: flex; align-items: center; justify-content: center; }
.fab-btn.small { width: 48px; height: 48px; border-radius: 50%; background: white; color: #374151; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #f3f4f6; }
.fab-btn.small:hover { transform: scale(1.1); background: #f9fafb; }
.fab-label { position: absolute; right: 60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.8); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; white-space: nowrap; pointer-events: none; opacity: 0; visibility: hidden; transition: all 0.2s ease; }
.fab-item:hover .fab-label { opacity: 1; visibility: visible; right: 65px; }
.fab-stagger-enter-active, .fab-stagger-leave-active { transition: all 0.3s ease; }
.fab-stagger-enter-from, .fab-stagger-leave-to { opacity: 0; transform: translateY(20px) scale(0.5); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { 100% { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .fab-container { bottom: 20px; right: 20px; }
}
</style>