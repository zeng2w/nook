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
              <img v-if="show.posterUrl" :src="show.posterUrl" class="mini-img" loading="lazy" /><span v-else>{{ show.title.charAt(0) }}</span><div class="flip-hint">↻</div>
            </div>
            <div class="header-info">
              <h3>{{ show.title }}</h3>
              <div class="tags-line">
                <span class="tag-badge" :class="show.category">{{ getCategoryLabel(show.category) }}</span>
                <span class="status-tag" :class="show.status">{{ getStatusLabel(show.status) }}</span>
                <div v-if="show.networkLogo" class="network-tag-logo" :title="show.network"><img :src="show.networkLogo" alt="Network" /></div>
                <span v-else-if="show.network" class="tag-badge network-text">{{ show.network }}</span>
              </div>
            </div>
          </div>

          <div class="ring-control-section">
            <button class="ring-btn" :disabled="show.status === 'dropped'" @click.stop="$emit('update-progress', show, -1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
            <div class="ring-wrapper"><FitnessRing :watched="show.watchedEpisodes" :aired="show.airedEpisodes" :total="show.totalEpisodes" :size="140"/></div>
            <button class="ring-btn" :disabled="show.status === 'dropped'" @click.stop="$emit('update-progress', show, 1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
          </div>

          <!-- <div class="stats-blocks">
            <div class="stat-block purple"><span class="stat-label">更新</span><span class="stat-percent">{{ calcPercent(show.airedEpisodes, show.totalEpisodes) }}%</span><span class="stat-fraction">{{ show.airedEpisodes }}/{{ show.totalEpisodes || '?' }}</span></div>
            <div class="stat-block blue"><span class="stat-label">观看</span><span class="stat-percent">{{ calcPercent(show.watchedEpisodes, show.totalEpisodes) }}%</span><span class="stat-fraction">{{ show.watchedEpisodes }}/{{ show.totalEpisodes || '?' }}</span></div>
            <div class="stat-block green"><span class="stat-label">追剧</span><span class="stat-percent">{{ calcPercent(show.watchedEpisodes, show.airedEpisodes) }}%</span><span class="stat-fraction">{{ show.watchedEpisodes }}/{{ show.airedEpisodes || '?' }}</span></div>
          </div> -->

          <div class="detail-control-area"><div class="detail-numbers no-border"><div class="num-col"><span class="label">已看</span><span class="val blue-text">{{ show.watchedEpisodes }}</span></div><div class="num-col"><span class="label">更新</span><span class="val purple-text">{{ show.airedEpisodes }}</span></div><div class="num-col"><span class="label">总集</span><span class="val">{{ show.totalEpisodes || '-' }}</span></div></div></div>
          <div class="date-bar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>{{ estimateDate }}</span></div>
        </div>
        
        <div class="card-face back"><img v-if="show.posterUrl" :src="show.posterUrl" class="full-poster" loading="lazy" /><div v-else class="back-placeholder" :style="{ backgroundColor: getCategoryColor(show.category) }"><span>{{ show.title }}</span></div></div>
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
import FitnessRing from './FitnessRing.vue';
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
const calcPercent = (n, d) => (!d || d === 0) ? 0 : Math.round((n / d) * 100);

const estimateDate = computed(() => getEstimatedDateText(props.show));
</script>

<style scoped>
.show-card-wrapper { position: relative; perspective: 1000px; }
.show-card { width: 100%; height: 100%; position: relative; background: transparent; }
.show-card.blur-bg { filter: grayscale(100%); opacity: 0.5; }
.flipper { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; background: #fff; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.flipper.is-flipped { transform: rotateY(180deg); }
.show-card.dropped-card .flipper { filter: grayscale(100%); opacity: 0.6; background-color: #f3f4f6; }
.card-face { position: relative; top: 0; left: 0; width: 100%; height: 100%; border-radius: 16px; backface-visibility: hidden; overflow: hidden; display: flex; flex-direction: column; }
.front { z-index: 2; transform: rotateY(0deg); padding: 16px; background: inherit; gap: 12px; }
.back { position: absolute; top: 0; left: 0; z-index: 1; transform: rotateY(180deg); background: #000; display: flex; align-items: center; justify-content: center; }
.full-poster { width: 100%; height: 100%; object-fit: cover; }
.back-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; font-weight: 700; padding: 20px; text-align: center; }
.top-actions { position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; z-index: 5; }
.action-circle-btn { background: white; border-radius: 50%; border: 1px solid #f3f4f6; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.action-circle-btn:hover { transform: scale(1.1); }
.card-header-grid { display: flex; align-items: center; gap: 10px; padding-right: 70px; }
.poster-mini { width: 80px; height: 120px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.poster-mini .mini-img { width: 100%; height: 100%; object-fit: cover; }
.flip-hint { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; opacity: 0; transition: opacity 0.2s; }
.poster-mini:hover .flip-hint { opacity: 1; }
.header-info h3 { margin: 0 0 2px 0; font-size: 1rem; font-weight: 700; color: #1f2937; }
.tags-line { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tag-badge, .status-tag, .network-tag-logo, .network-text { height: 20px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; box-sizing: border-box; border-radius: 4px; font-size: 0.7rem; font-weight: 600; vertical-align: middle; }
.tag-badge, .status-tag, .network-text { padding: 0 6px; }
.tag-badge.tv { background: #dbeafe; color: #1e40af; }
.tag-badge.anime { background: #f3e8ff; color: #6b21a8; }
.tag-badge.movie { background: #e0e7ff; color: #3730a3; }
.tag-badge.variety { background: #ffedd5; color: #9a3412; }
.status-tag.wish { background: #fef3c7; color: #d97706; }
.status-tag.watching { background: #d1fae5; color: #059669; }
.status-tag.watched { background: #e0e7ff; color: #4338ca; }
.status-tag.dropped { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.network-text { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
.network-tag-logo { padding: 0 4px; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.network-tag-logo img { height: 12px; width: auto; object-fit: contain; display: block; }
.ring-control-section { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 5px 0; transform: scale(0.95); }
.ring-wrapper { transform: scale(0.9); }
.ring-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background: #f3f4f6; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.ring-btn:hover:not(:disabled) { background: #e5e7eb; color: #111; border-color: #d1d5db; transform: scale(1.1); }
.ring-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #f9fafb; color: #9ca3af; }
/* .stats-blocks { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; } */
.stat-block { border-radius: 10px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-block.purple { background: #f3e8ff; color: #9333ea; }
.stat-block.blue { background: #e0f2fe; color: #0284c7; }
.stat-block.green { background: #dcfce7; color: #16a34a; }
.stat-label { font-size: 0.65rem; font-weight: 600; opacity: 0.8; }
.stat-percent { font-size: 1rem; font-weight: 800; line-height: 1; }
.stat-fraction { font-size: 0.7rem; opacity: 0.8; }
.detail-control-area { background: #f9fafb; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.detail-numbers { display: flex; justify-content: space-around; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.detail-numbers.no-border { border-bottom: none; padding-bottom: 0; }
.num-col { display: flex; flex-direction: column; align-items: center; gap: 0px; }
.num-col .label { font-size: 0.7rem; color: #9ca3af; }
.num-col .val { font-size: 1rem; font-weight: 700; color: #374151; }
.num-col .val.blue-text { color: #3b82f6; }
.num-col .val.purple-text { color: #a855f7; }
.date-bar { background: #f9fafb; color: #9ca3af; font-size: 0.75rem; padding: 8px; border-radius: 8px; display: flex; align-items: center; gap: 6px; justify-content: center; }
.undo-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; z-index: 10; background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); border-radius: 16px; }
.undo-text { font-weight: 600; color: #333; font-size: 1.1rem; }
.undo-btn { display: flex; align-items: center; gap: 6px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: transform 0.2s; }
.undo-btn:hover { transform: scale(1.05); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .grid-layout { grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 100px; }
  .card-header-grid { flex-direction: row; padding-right: 30px; }
  .poster-mini { width: 50px; height: 75px; display: flex; }
  .header-info h3 { font-size: 0.9rem; line-height: 1.3; max-height: 2.6em; overflow: hidden; }
  /* .stats-blocks { gap: 4px; } */
  .stat-block { padding: 6px 2px; }
  .stat-label { font-size: 0.6rem; }
  .stat-percent { font-size: 0.9rem; }
  .ring-wrapper { transform: scale(0.7); margin: -10px 0; }
}
</style>