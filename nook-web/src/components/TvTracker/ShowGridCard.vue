<template>
  <div class="show-card-wrapper">
    <div class="show-card" :class="{ 'blur-bg': isPendingDelete, 'dropped-card': show.status === 'dropped' }" @mouseleave="flipped = false">
      
      <div class="flipper" :class="{ 'is-flipped': flipped }">
        
        <div class="card-face front">
          
          <div class="top-actions" v-if="!isPendingDelete">
            <button class="action-circle-btn edit" @click.stop="$emit('edit', show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
            <template v-if="show.status === 'dropped'">
              <button class="action-circle-btn restore" @click.stop="$emit('restore', show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg></button>
              <button class="action-circle-btn hard-delete" @click.stop="$emit('delete', show._id)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </template>
            <template v-else>
              <button class="action-circle-btn soft-delete" @click.stop="$emit('drop', show)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
            </template>
          </div>
          
          <div class="card-header-grid">
            <div class="poster-mini trigger-flip" :style="{ backgroundColor: getCategoryColor(show.category) }" @mouseenter="flipped = true">
              <img v-if="show.posterUrl" :src="show.posterUrl" class="mini-img" loading="lazy" /><span v-else>{{ show.title.charAt(0) }}</span>
              <div class="flip-hint">↻</div>
            </div>
            <div class="header-info">
              <h3>{{ show.title }}</h3>
              <div class="tags-line">
                <span class="tag-badge" :class="show.category">{{ getCategoryLabel(show.category) }}</span>
                <span class="status-tag" :class="show.status">{{ getStatusLabel(show.status) }}</span>
                <div v-if="show.networkLogo" class="network-tag-logo" :title="show.network"><img :src="show.networkLogo" alt="Network" /></div>
              </div>
            </div>
          </div>

          <div class="simple-dashboard" :class="{ 'disabled': show.status === 'dropped' }">
            <button class="control-btn minus" :disabled="show.status === 'dropped' || show.watchedEpisodes <= 0" @click.stop="$emit('update-progress', show, -1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            
            <div class="progress-info-center">
              <div class="status-capsule" :class="unwatchedCount > 0 ? 'has-new' : 'all-done'">
                <span v-if="unwatchedCount > 0">+{{ unwatchedCount }} 待看</span>
                <span v-else>已追平</span>
              </div>

              <div class="main-stats">
                <span class="stat-watched">{{ show.watchedEpisodes }}</span>
              </div>
              
              <div class="mini-progress-track">
                <div class="mini-progress-fill" :style="{ width: progressPercent + '%' }"></div>
              </div>
            </div>
            
            <button class="control-btn plus" :disabled="show.status === 'dropped'" @click.stop="$emit('update-progress', show, 1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <div class="data-footer-grid">
            <div class="footer-col">
              <span class="f-label">已更</span>
              <span class="f-val highlight">{{ show.airedEpisodes }}</span>
            </div>
            <div class="v-divider"></div>
            <div class="footer-col">
              <span class="f-label">总集</span>
              <span class="f-val">{{ show.totalEpisodes || '-' }}</span>
            </div>
            <div class="v-divider"></div>
            <div class="footer-col date-col">
              <span class="f-label">预计完结</span>
              <span class="f-val date-text">{{ cleanEstimateDate }}</span>
            </div>
          </div>

        </div>
        
        <div class="card-face back">
          <img v-if="show.posterUrl" :src="show.posterUrl" class="full-poster" loading="lazy" />
          <div v-else class="back-placeholder" :style="{ backgroundColor: getCategoryColor(show.category) }">
            <span>{{ show.title }}</span>
          </div>
        </div>

      </div>
    </div>

    <transition name="fade">
      <div v-if="isPendingDelete" class="undo-overlay" 
           @mouseenter="$emit('pause-delete', show._id)" 
           @mouseleave="$emit('resume-delete', show._id)">
        <span class="undo-text">即将删除...</span>
        <button class="undo-btn" @click.stop="$emit('cancel-delete', show._id)">撤回</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { getEstimatedDateText } from '@/utils/dateUtils';

const props = defineProps({
  show: { type: Object, required: true },
  isPendingDelete: { type: Boolean, default: false }
});

const emit = defineEmits(['edit', 'update-progress', 'delete', 'drop', 'restore', 'pause-delete', 'resume-delete', 'cancel-delete']);

const flipped = ref(false);

const getCategoryLabel = (cat) => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[cat] || cat);
const getCategoryColor = (cat) => ({ tv: '#e5e7eb', anime: '#f3e8ff', movie: '#e0f2fe', variety: '#ffedd5' }[cat] || '#eee');
const getStatusLabel = (st) => ({ wish: '想看', watching: '在看', watched: '已看', dropped: '弃剧' }[st] || st);

// ★ 逻辑新增：清洗日期前缀，防止重复文字
const cleanEstimateDate = computed(() => {
  const txt = getEstimatedDateText(props.show);
  if (!txt) return '-';
  // 去除 "预计完结：" 等中文前缀
  return txt.replace(/^(预计完结|预计|完结|暂无数据)[:：]?\s*/g, '').trim();
});

// ★ 逻辑新增：计算未看集数
const unwatchedCount = computed(() => {
  const aired = props.show.airedEpisodes || 0;
  const watched = props.show.watchedEpisodes || 0;
  return Math.max(0, aired - watched);
});

// ★ 逻辑新增：进度条百分比
const progressPercent = computed(() => {
  const total = props.show.totalEpisodes || props.show.airedEpisodes || 1;
  const watched = props.show.watchedEpisodes || 0;
  if (total === 0) return 0;
  return Math.min(100, Math.round((watched / total) * 100));
});
</script>

<style scoped>
/* --- 保留原有的基础样式，确保翻转正常 --- */
.show-card-wrapper { position: relative; perspective: 1000px; }
/* 修正高度适应新布局 */
.show-card { width: 100%; height: 320px; position: relative; background: transparent; }
.show-card.blur-bg { filter: grayscale(100%); opacity: 0.5; }
.flipper { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; background: #fff; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.flipper.is-flipped { transform: rotateY(180deg); }
.show-card.dropped-card .flipper { filter: grayscale(100%); opacity: 0.6; background-color: #f3f4f6; }
.card-face { position: relative; top: 0; left: 0; width: 100%; height: 100%; border-radius: 16px; backface-visibility: hidden; overflow: hidden; display: flex; flex-direction: column; }
.front { z-index: 2; transform: rotateY(0deg); padding: 16px; background: inherit; justify-content: space-between; /* 确保内容撑开 */ }
.back { position: absolute; top: 0; left: 0; z-index: 1; transform: rotateY(180deg); background: #000; display: flex; align-items: center; justify-content: center; }
.full-poster { width: 100%; height: 100%; object-fit: cover; }
.back-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; font-weight: 700; padding: 20px; text-align: center; }

/* 顶部操作栏 */
.top-actions { position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; z-index: 5; }
.action-circle-btn { background: white; border-radius: 50%; border: 1px solid #f3f4f6; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.action-circle-btn:hover { transform: scale(1.1); }

/* 头部 */
.card-header-grid { display: flex; align-items: center; gap: 10px; padding-right: 70px; }
.poster-mini { 
  width: 80px; height: 120px; border-radius: 8px; 
  display: flex; align-items: center; justify-content: center; 
  font-size: 1.4rem; background: #f3f4f6; cursor: pointer; 
  position: relative; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); 
  /* 确保 z-index 足够高以接收 hover */
  z-index: 10; 
}
.poster-mini .mini-img { width: 100%; height: 100%; object-fit: cover; }
.flip-hint { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; opacity: 0; transition: opacity 0.2s; }
.poster-mini:hover .flip-hint { opacity: 1; }
.header-info h3 { margin: 0 0 6px 0; font-size: 1rem; font-weight: 700; color: #1f2937; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;}
.tags-line { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tag-badge, .status-tag, .network-tag-logo, .network-text { height: 20px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; box-sizing: border-box; border-radius: 4px; font-size: 0.7rem; font-weight: 600; vertical-align: middle; }
.tag-badge, .status-tag, .network-text { padding: 0 6px; }
.tag-badge.tv { background: #dbeafe; color: #1e40af; } .tag-badge.anime { background: #f3e8ff; color: #6b21a8; } .tag-badge.movie { background: #e0e7ff; color: #3730a3; } .tag-badge.variety { background: #ffedd5; color: #9a3412; }
.status-tag.wish { background: #fef3c7; color: #d97706; } .status-tag.watching { background: #d1fae5; color: #059669; } .status-tag.watched { background: #e0e7ff; color: #4338ca; } .status-tag.dropped { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.network-text { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
.network-tag-logo { padding: 0 4px; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.network-tag-logo img { height: 12px; width: auto; object-fit: contain; display: block; }

/* ★★★ 新 CSS: 数字看板 ★★★ */
.simple-dashboard { flex: 1; display: flex; align-items: center; justify-content: space-between; padding: 10px 0; }
.simple-dashboard.disabled { opacity: 0.5; pointer-events: none; }

.control-btn { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #e5e7eb; background: #fff; color: #444; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.control-btn:hover:not(:disabled) { background: #f9fafb; border-color: #d1d5db; color: #000; transform: scale(1.1); }
.control-btn:disabled { opacity: 0.3; cursor: not-allowed; }

.progress-info-center { display: flex; flex-direction: column; align-items: center; gap: 4px; flex: 1; }

.status-capsule { font-size: 0.7rem; font-weight: 700; padding: 2px 10px; border-radius: 12px; letter-spacing: 0.5px; transition: all 0.3s; margin-bottom: 2px; }
.status-capsule.has-new { background: #eff6ff; color: #3b82f6; } 
.status-capsule.all-done { background: #f8fafc; color: #94a3b8; }

.main-stats { display: flex; align-items: baseline; line-height: 1; }
.stat-watched { font-size: 2.2rem; font-weight: 900; color: #0f172a; letter-spacing: -1.5px; font-variant-numeric: tabular-nums; }

.mini-progress-track { width: 70px; height: 5px; background: #f1f5f9; border-radius: 10px; overflow: hidden; margin-top: 6px; }
.mini-progress-fill { height: 100%; background: #3b82f6; border-radius: 10px; transition: width 0.4s ease; }

/* ★★★ 新 CSS: 底部 Grid 布局 ★★★ */
.data-footer-grid { 
  display: grid; 
  /* 左右两栏等宽，中间日期自适应 (1.4fr) */
  grid-template-columns: 0.8fr auto 0.8fr auto 1.4fr; 
  align-items: center; 
  padding: 10px 8px; 
  background: #f8fafc; 
  border-radius: 12px; 
  border: 1px solid #f1f5f9;
  margin-top: 4px;
}
.footer-col { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; }
.f-label { font-size: 0.6rem; color: #94a3b8; font-weight: 600; letter-spacing: 0.5px; white-space: nowrap; }
.f-val { font-size: 0.9rem; font-weight: 700; color: #334155; font-variant-numeric: tabular-nums; line-height: 1; }
.f-val.highlight { color: #8b5cf6; } 
.f-val.date-text { 
  font-size: 0.75rem; 
  color: #64748b; 
  font-weight: 500; 
  /* ★ 修复：强制不换行，超长省略 */
  white-space: nowrap; 
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
.v-divider { width: 1px; height: 16px; background: #e2e8f0; }

/* Overlay */
.undo-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; z-index: 10; background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); border-radius: 16px; }
.undo-text { font-weight: 600; color: #333; font-size: 1.1rem; }
.undo-btn { display: flex; align-items: center; gap: 6px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: transform 0.2s; }
.undo-btn:hover { transform: scale(1.05); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  /* ... 保持原有移动端适配 ... */
  .card-header-grid { flex-direction: row; padding-right: 30px; }
  .poster-mini { width: 50px; height: 75px; display: flex; }
  .header-info h3 { font-size: 0.9rem; }
}
</style>