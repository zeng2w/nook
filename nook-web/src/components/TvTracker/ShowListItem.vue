<template>
  <div class="list-item-root">
    <div class="list-card full-height-poster" :class="{ 'blur-bg': isPendingDelete, 'dropped-card': show.status === 'dropped' }">
      
      <div class="list-poster-side" :style="{ backgroundColor: show.posterUrl ? 'transparent' : getCategoryColor(show.category) }">
        <img v-if="show.posterUrl" :src="show.posterUrl" alt="Poster" loading="lazy" />
        <span v-else>{{ show.title.charAt(0) }}</span>
      </div>
      
      <div class="list-main-content">
        <div class="list-info-col">
          <div class="title-row" @click="$emit('edit', show)" style="cursor:pointer">
            <h3>{{ show.title }}</h3>
            <div class="hover-action-btn edit-btn" title="编辑">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
            </div>
          </div>
          
          <div class="list-meta">
            <span class="tag-badge" :class="show.category">{{ getCategoryLabel(show.category) }}</span>
            <span class="status-tag" :class="show.status">{{ getStatusLabel(show.status) }}</span>
            <div v-if="show.networkLogo" class="network-tag-logo" :title="show.network">
              <img :src="show.networkLogo" alt="Network" />
            </div>
          </div>

          <div v-if="estimateDate !== '暂无数据'" class="date-row">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            <span>{{ estimateDate }}</span>
          </div>
        </div>

        <div class="list-stats-col">
          <div class="bars-container">
            <div class="bar-line" v-for="(bar, idx) in progressBars" :key="idx">
              <div class="bar-header">
                <span class="bar-label">{{ bar.label }}</span>
                <span class="bar-pct">{{ bar.percent }}%</span>
              </div>
              <div class="bar-track-slim">
                <div class="bar-fill" :class="bar.color" :style="{ width: bar.percent + '%' }"></div>
              </div>
            </div>
          </div>
          
          <div class="stats-simple-row">
            <div class="stat-pair"><span>已看</span><strong>{{ show.watchedEpisodes }}</strong></div>
            <div class="divider-dot">·</div>
            <div class="stat-pair"><span>更新</span><strong>{{ show.airedEpisodes }}</strong></div>
            <div class="divider-dot">·</div>
            <div class="stat-pair"><span>总集</span><strong>{{ show.totalEpisodes || '-' }}</strong></div>
          </div>
        </div>

        <div class="list-new-actions">
          <div class="stepper-group">
            <button class="stepper-btn minus" @click.stop="$emit('update-progress', show, -1)" :disabled="show.watchedEpisodes <= 0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <div class="stepper-divider"></div>
            <button class="stepper-btn plus" @click.stop="$emit('update-progress', show, 1)">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
          </div>

          <template v-if="show.status === 'dropped'">
            <button class="restore-btn" @click.stop="$emit('restore', show)">恢复</button>
            <button class="hover-action-btn trash-btn" @click.stop="$emit('delete', show._id)" title="彻底删除">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </template>

          <template v-else>
            <button class="hover-action-btn trash-btn" @click.stop="$emit('drop', show)" title="弃剧">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
          </template>

        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="isPendingDelete" class="undo-overlay list-mode" @mouseenter="$emit('pause-delete', show._id)" @mouseleave="$emit('resume-delete', show._id)">
        <span class="undo-text">即将彻底删除...</span>
        <button class="undo-btn" @click.stop="$emit('cancel-delete', show._id)">撤回</button>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getEstimatedDateText } from '@/utils/dateUtils';

const props = defineProps({
  show: { type: Object, required: true },
  isPendingDelete: { type: Boolean, default: false }
});

// ★ 增加 'drop' 事件
const emit = defineEmits(['edit', 'update-progress', 'delete', 'restore', 'drop', 'pause-delete', 'resume-delete', 'cancel-delete']);

const getCategoryLabel = (cat) => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[cat] || cat);
const getCategoryColor = (cat) => ({ tv: '#e5e7eb', anime: '#f3e8ff', movie: '#e0f2fe', variety: '#ffedd5' }[cat] || '#eee');
const getStatusLabel = (st) => ({ wish: '想看', watching: '在看', watched: '已看', dropped: '弃剧' }[st] || st);
const calcPercent = (n, d) => (!d || d === 0) ? 0 : Math.round((n / d) * 100);

const progressBars = computed(() => [
  { label: '更新', color: 'purple', percent: calcPercent(props.show.airedEpisodes, props.show.totalEpisodes) },
  { label: '观看', color: 'blue', percent: calcPercent(props.show.watchedEpisodes, props.show.totalEpisodes) },
  { label: '追剧', color: 'green', percent: calcPercent(props.show.watchedEpisodes, props.show.airedEpisodes) },
]);

const estimateDate = computed(() => getEstimatedDateText(props.show));
</script>

<style scoped>
/* 保持你现在的 CSS 不变 */
.list-item-root { position: relative; margin-bottom: 16px; }
.list-card.full-height-poster { background: white; border-radius: 16px; padding: 0; display: flex; align-items: stretch; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 4px 20px rgba(0,0,0,0.03); transition: all 0.3s ease; overflow: hidden; height: 130px; position: relative; }
.list-card:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(0,0,0,0.06); }
.list-card.dropped-card { filter: grayscale(100%); opacity: 0.6; background-color: #f9fafb; }
.list-card.blur-bg { pointer-events: none; opacity: 0.5; }
.list-poster-side { width: 90px; flex-shrink: 0; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f3f4f6; }
.list-poster-side img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s; }
.list-card:hover .list-poster-side img { transform: scale(1.05); }
.list-main-content { flex: 1; display: flex; align-items: center; padding: 0 24px; gap: 24px; }
.list-info-col { flex: 0 0 200px; display: flex; flex-direction: column; justify-content: center; gap: 6px; }
.title-row { display: flex; align-items: center; gap: 8px; }
.list-info-col h3 { margin: 0; font-size: 1.15rem; font-weight: 700; color: #1d1d1f; line-height: 1.2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.list-meta { display: flex; gap: 6px; align-items: center; }
.tag-badge, .status-tag { height: 20px; padding: 0 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; }
.tag-badge.tv { background: #eff6ff; color: #1d4ed8; }
.tag-badge.anime { background: #f3e8ff; color: #6b21a8; }
.tag-badge.movie { background: #e0e7ff; color: #3730a3; }
.tag-badge.variety { background: #ffedd5; color: #9a3412; }
.status-tag.wish { background: #fef3c7; color: #d97706; }
.status-tag.watching { background: #d1fae5; color: #059669; }
.status-tag.watched { background: #e0e7ff; color: #4338ca; }
.status-tag.dropped { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.network-tag-logo { padding: 0 4px; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.02); height: 20px; display: flex; align-items: center; border-radius: 4px; }
.network-tag-logo img { height: 12px; width: auto; }
.network-text { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; height: 20px; padding: 0 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 600; display: inline-flex; align-items: center; }
.date-row { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: #9ca3af; margin-top: 2px; }
.list-stats-col { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.bars-container { display: flex; flex-direction: column; gap: 6px; }
.bar-line { display: flex; flex-direction: column; gap: 2px; }
.bar-header { display: flex; justify-content: space-between; font-size: 0.7rem; color: #6b7280; padding: 0 1px; }
.bar-pct { font-weight: 600; color: #374151; }
.bar-track-slim { height: 5px; background: #f3f4f6; border-radius: 10px; overflow: hidden; width: 100%; }
.bar-fill { height: 100%; border-radius: 10px; transition: width 0.5s cubic-bezier(0.25, 0.8, 0.25, 1); }
.bar-fill.purple { background: #c084fc; }
.bar-fill.blue { background: #60a5fa; }
.bar-fill.green { background: #4ade80; }
.stats-simple-row { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #9ca3af; margin-top: 4px; }
.stat-pair strong { color: #374151; margin-left: 3px; }
.divider-dot { font-weight: bold; color: #e5e7eb; }
.list-new-actions { display: flex; align-items: center; gap: 16px; padding-left: 10px; }
.stepper-group { display: flex; align-items: center; background: #f8fafc; padding: 2px; border-radius: 10px; border: 1px solid #f1f5f9; }
.stepper-btn { width: 32px; height: 32px; border-radius: 8px; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; color: #64748b; background: transparent; }
.stepper-btn:hover:not(:disabled) { background: white; color: #0f172a; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.stepper-btn.plus { color: #3b82f6; }
.stepper-btn.plus:hover { background: #3b82f6; color: white; }
.stepper-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.stepper-divider { width: 1px; height: 16px; background: #e2e8f0; }
.restore-btn { font-size: 0.8rem; color: #16a34a; border: 1px solid #dcfce7; background: #f0fdf4; padding: 4px 8px; border-radius: 4px; cursor: pointer; transition: all 0.2s; }
.restore-btn:hover { background: #16a34a; color: white; }
.hover-action-btn { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; background: transparent; border: none; color: #94a3b8; opacity: 0; transform: translateX(-10px); transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.trash-btn:hover { color: #ef4444; background: #fee2e2; }
.edit-btn:hover { color: #3b82f6; background: #dbeafe; }
.list-card:hover .hover-action-btn { opacity: 1; transform: translateX(0); }
.undo-overlay { position: absolute; inset: 0; display: flex; flex-direction: row; gap: 20px; align-items: center; justify-content: center; z-index: 10; background: rgba(255,255,255,0.85); backdrop-filter: blur(4px); border-radius: 16px; }
.undo-text { font-weight: 600; color: #333; font-size: 1.1rem; }
.undo-btn { display: flex; align-items: center; gap: 6px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: transform 0.2s; }
.undo-btn:hover { transform: scale(1.05); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .list-card.full-height-poster { height: auto; min-height: 120px; }
  .list-main-content { flex-direction: column; align-items: flex-start; gap: 12px; padding: 12px; }
  .list-poster-side { display: none; }
  .list-info-col, .list-stats-col { width: 100%; flex: auto; }
  .list-new-actions { width: 100%; justify-content: space-between; border-top: 1px solid #f1f5f9; padding-top: 10px; margin-top: 5px; padding-left: 0; }
  .hover-action-btn { opacity: 1; transform: none; }
}
</style>