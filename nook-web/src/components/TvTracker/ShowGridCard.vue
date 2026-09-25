<template>
  <article class="show-card-wrapper" @keydown.esc="closeCardOverlays">
    <div class="show-card" :class="{ 'blur-bg': isPendingDelete, 'dropped-card': show.status === 'dropped' }">
      <button type="button" class="poster-preview-btn" :aria-label="`查看 ${show.title} 海报`" @click="openPosterPreview" :style="{ backgroundColor: getCategoryColor(show.category) }">
        <img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" loading="lazy" decoding="async" />
        <span v-else class="poster-placeholder">{{ show.title }}</span>
      </button>
      <div class="card-content">
        <div class="title-row"><h3 :title="show.title">{{ show.title }}</h3>
          <div class="top-actions" v-if="!isPendingDelete">
            <button 
              class="action-circle-btn favorite-btn" 
              :class="{ 'active': show.isFavorite }" 
              :aria-label="show.isFavorite ? `取消喜爱 ${show.title}` : `喜爱 ${show.title}`"
              @click.stop="$emit('toggle-favorite', show)"
              title="标记喜爱并置顶"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" :fill="show.isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
              </svg>
            </button>

            <div class="card-more-wrapper">
              <button
                type="button"
                class="action-circle-btn more-action-btn"
                :aria-label="`${show.title} 更多操作`"
                :aria-expanded="actionMenuOpen"
                @click.stop="actionMenuOpen = !actionMenuOpen"
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <circle cx="5" cy="12" r="1.7"></circle>
                  <circle cx="12" cy="12" r="1.7"></circle>
                  <circle cx="19" cy="12" r="1.7"></circle>
                </svg>
              </button>

              <transition name="action-menu-fade">
                <div v-if="actionMenuOpen" class="card-action-menu" @click.stop>
                  <button type="button" @click="runCardAction('edit')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    编辑
                  </button>
                  <button type="button" :disabled="show.status === 'dropped' || show.watchedEpisodes <= 0" :aria-label="`${show.title} 已看集数减一`" @click=" $emit('update-progress', show, -1); actionMenuOpen = false">已看集数 −1</button>
                  <template v-if="show.status === 'dropped'">
                    <button type="button" @click="runCardAction('restore')">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg>
                      恢复追剧
                    </button>
                    <button type="button" class="danger" @click="runCardAction('delete')">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      永久删除
                    </button>
                  </template>
                  <button v-else type="button" class="danger" @click="runCardAction('drop')">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    标记弃剧
                  </button>
                </div>
              </transition>
            </div>
          </div>
          

        </div>
        <div class="tags-line"><span>{{ getCategoryLabel(show.category) }}</span><span class="tag-dot">·</span><span>{{ getStatusLabel(show.status) }}</span><img v-if="show.networkLogo" :src="show.networkLogo" :alt="show.network" loading="lazy" /></div>
        <div class="progress-heading">
          <span class="progress-numbers"><strong>{{ show.watchedEpisodes }}</strong><span> / {{ show.totalEpisodes || show.airedEpisodes || '—' }}</span><small> 集</small></span>
          <span class="status-capsule" :class="unwatchedCount > 0 ? 'has-new' : 'all-done'">{{ unwatchedCount > 0 ? `待看 +${unwatchedCount}` : '已追平' }}</span>
        </div>
        <div class="mini-progress-track" role="progressbar" :aria-label="`${show.title} 观看进度`" :aria-valuenow="progressPercent" :aria-valuemin="0" :aria-valuemax="100"><div class="mini-progress-fill" :style="{ width: progressPercent + '%' }"></div></div>
        <button class="next-episode" :aria-label="`${show.title} 已看集数加一`" :disabled="show.status === 'dropped' || (show.totalEpisodes > 0 && show.watchedEpisodes >= show.totalEpisodes)" @click="$emit('update-progress', show, 1)"><span>看下一集</span><span class="plus-label">+1</span></button>
        <div class="card-footer"><span>已更新 {{ show.airedEpisodes || 0 }} 集</span><span :title="`预计完结 ${cleanEstimateDate}`">{{ cleanEstimateDate === '-' ? '完结时间待定' : cleanEstimateDate }}</span></div>
      </div>
    </div>
    <div v-if="isPendingDelete" class="undo-overlay" @mouseenter="$emit('pause-delete', show._id)" @mouseleave="$emit('resume-delete', show._id)"><span>即将删除…</span><button @click="$emit('cancel-delete', show._id)">撤回</button></div>
    <Teleport to="body"><dialog v-if="isPosterPreviewOpen" ref="posterDialog" class="poster-dialog" @cancel="closeCardOverlays" :aria-label="`${show.title} 海报`" @click.self="closeCardOverlays" @keydown.esc="closeCardOverlays"><button autofocus aria-label="关闭海报预览" @click="closeCardOverlays">✕</button><img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" /><span v-else>{{ show.title }}</span></dialog></Teleport>
  </article>
</template>
<script setup>
import { ref, computed, nextTick } from 'vue';
import { getEstimatedDateText } from '@/utils/dateUtils';

const props = defineProps({
  show: { type: Object, required: true },
  isPendingDelete: { type: Boolean, default: false }
});

const emit = defineEmits(['edit', 'update-progress', 'delete', 'drop', 'restore', 'pause-delete', 'resume-delete', 'cancel-delete', 'toggle-favorite']);

const isPosterPreviewOpen = ref(false);
const posterDialog = ref(null);
const actionMenuOpen = ref(false);

const openPosterPreview = async () => {
  actionMenuOpen.value = false;
  isPosterPreviewOpen.value = true;
  await nextTick();
  posterDialog.value?.showModal();
};

const closeCardOverlays = () => {
  isPosterPreviewOpen.value = false;
  actionMenuOpen.value = false;
};

const runCardAction = (action) => {
  actionMenuOpen.value = false;
  if (action === 'delete') {
    emit('delete', props.show._id);
    return;
  }
  emit(action, props.show);
};

const getCategoryLabel = (cat) => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[cat] || cat);
const getCategoryColor = (cat) => ({ tv: '#e5e7eb', anime: '#f3e8ff', movie: '#e0f2fe', variety: '#ffedd5' }[cat] || '#eee');
const getStatusLabel = (st) => ({ wish: '想看', watching: '在看', watched: '已看完', dropped: '弃剧' }[st] || st);

const cleanEstimateDate = computed(() => {
  const txt = getEstimatedDateText(props.show);
  if (!txt) return '-';
  return txt.replace(/^(预计完结|预计|完结|暂无数据)[:：]?\s*/g, '').trim();
});

const unwatchedCount = computed(() => {
  const aired = props.show.airedEpisodes || 0;
  const watched = props.show.watchedEpisodes || 0;
  return Math.max(0, aired - watched);
});

const progressPercent = computed(() => {
  const total = props.show.totalEpisodes || props.show.airedEpisodes || 1;
  const watched = props.show.watchedEpisodes || 0;
  if (total === 0) return 0;
  return Math.min(100, Math.round((watched / total) * 100));
});
</script>

<style scoped>
.show-card-wrapper { position: relative; min-width: 0; }
.show-card { background: white; border: 1px solid #e8e9ef; border-radius: 16px; padding: 10px; box-shadow: 0 3px 12px #20213c05; transition: box-shadow .2s; }
.show-card:hover { box-shadow: 0 8px 24px #20213c0d; }
.blur-bg { opacity: .4; } .dropped-card { filter: grayscale(1); }
.poster-preview-btn { display: block; width: 100%; aspect-ratio: 2 / 3; border: 0; border-radius: 10px; padding: 0; overflow: hidden; cursor: zoom-in; }
.poster-preview-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.poster-placeholder { color: #64748b; font-size: 22px; padding: 18px; }
.card-content { padding: 12px 4px 2px; }
.title-row { display: flex; align-items: center; gap: 4px; }
h3 { font-size: 14px; line-height: 22px; font-weight: 650; margin: 0; color: #252736; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.top-actions { display: flex; gap: 2px; }
.action-circle-btn { display: grid; place-items: center; width: 25px; height: 28px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: #9295a6; cursor: pointer; }
.action-circle-btn:hover { background: #f4f3f9; color: #6557c7; }.favorite-btn.active { color: #db7895; }
.card-more-wrapper { position: relative; }.card-action-menu { position: absolute; top: 30px; right: 0; width: 145px; padding: 6px; border: 1px solid #e8e9ef; border-radius: 12px; background: white; z-index: 5; box-shadow: 0 8px 28px #25273620; }
.card-action-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px; background: transparent; border: 0; border-radius: 6px; color: #55596b; text-align: left; cursor: pointer; font-size: 12px; }.card-action-menu button:hover { background: #f5f4fa; }.card-action-menu .danger { color: #ba5b66; }
.tags-line { display: flex; align-items: center; gap: 6px; height: 23px; color: #9698a6; font-size: 11px; }.tags-line img { max-width: 45px; height: 11px; object-fit: contain; margin-left: auto; }.tag-dot { color: #b7bac5; }
.progress-heading { display: flex; align-items: center; justify-content: space-between; gap: 4px; margin-top: 15px; }
.progress-numbers { color: #9194a3; font-size: 12px; font-variant-numeric: tabular-nums; }.progress-numbers strong { font-size: 22px; font-weight: 650; color: #343646; letter-spacing: -.6px; }.progress-numbers small { font-size: 10px; }
.status-capsule { display: inline-flex; align-items: center; justify-content: center; min-width: 48px; height: 23px; padding: 0 7px; border-radius: 20px; font-size: 10px; font-weight: 550; white-space: nowrap; }.has-new { background: #f0edfa; color: #8570b5; }.all-done { background: #edf4f0; color: #719886; }
.mini-progress-track { height: 4px; background: #f0eff5; border-radius: 10px; overflow: hidden; margin: 10px 0 14px; }.mini-progress-fill { height: 100%; background: #a597cd; border-radius: inherit; transition: width .3s; }
.next-episode { width: 100%; height: 34px; border: 1px solid #e8e3f2; border-radius: 20px; background: #f5f2fb; color: #7c65aa; display: flex; align-items: center; justify-content: center; gap: 14px; font-size: 12px; font-weight: 600; cursor: pointer; }.next-episode:hover:not(:disabled) { background: #ebe5f6; }.plus-label { font-size: 11px; opacity: .75; }
button:disabled { opacity: .4; cursor: default; }button:focus-visible { outline: 2px solid #9a84c8; outline-offset: 3px; }
.card-footer { display: flex; justify-content: space-between; gap: 8px; margin-top: 12px; font-size: 10px; color: #a2a4b0; }.card-footer span:last-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.undo-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; }.undo-overlay button { border: 0; padding: 8px 14px; border-radius: 8px; color: white; background: #8d7ab6; cursor: pointer; }
.poster-dialog { position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; border: 0; box-sizing: border-box; z-index: 3000; background: #20212ad9; color: white; display: flex; align-items: center; justify-content: center; padding: 40px; }.poster-dialog img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 12px; }.poster-dialog > button { position: absolute; top: 20px; right: 24px; border: 0; background: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
</style>
