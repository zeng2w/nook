<template>
  <article ref="cardRoot" class="show-card-wrapper" @keydown.esc="closeCardOverlays">
    <div class="show-card" :class="{ 'blur-bg': isPendingDelete, 'dropped-card': show.status === 'dropped' }">
      <button type="button" class="poster-preview-btn" :aria-label="`查看 ${show.title} 海报`" @click="openPosterPreview" :style="{ backgroundColor: getCategoryColor(show.category) }">
        <img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" loading="lazy" decoding="async" />
        <span v-else class="poster-placeholder">{{ show.title }}</span>
      </button>
      <div class="card-content">
        <div class="title-row"><h3 :title="show.title"><button class="title-details" :aria-label="`查看 ${show.title} 详情`" @click="$emit('details', show)">{{ show.title }}</button></h3>
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
                ref="menuButton"
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
        <ProgressControl :show="show" :save-state="saveState" @update-progress="(s, delta) => $emit('update-progress', s, delta)" @set-progress="(s, value) => $emit('set-progress', s, value)" @retry-progress="$emit('retry-progress', show)" />
        <div class="card-footer" :title="completionCaption">{{ completionCaption }}</div>
      </div>
    </div>
    <div v-if="isPendingDelete" class="undo-overlay" @mouseenter="$emit('pause-delete', show._id)" @mouseleave="$emit('resume-delete', show._id)"><span>即将删除…</span><button @click="$emit('cancel-delete', show._id)">撤回</button></div>
    <Teleport to="body"><dialog v-if="isPosterPreviewOpen" ref="posterDialog" class="poster-dialog" @cancel="closeCardOverlays" :aria-label="`${show.title} 海报`" @click.self="closeCardOverlays" @keydown.esc="closeCardOverlays"><button autofocus aria-label="关闭海报预览" @click="closeCardOverlays">✕</button><img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" /><span v-else>{{ show.title }}</span></dialog></Teleport>
  </article>
</template>
<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import ProgressControl from './ProgressControl.vue';
import { getCompletionCaption } from '@/utils/dateUtils';

const props = defineProps({
  show: { type: Object, required: true },
  saveState: { type: Object, default: () => ({}) },
  isPendingDelete: { type: Boolean, default: false }
});

const emit = defineEmits(['details', 'set-progress', 'retry-progress', 'edit', 'update-progress', 'delete', 'drop', 'restore', 'pause-delete', 'resume-delete', 'cancel-delete', 'toggle-favorite']);

const isPosterPreviewOpen = ref(false);
const posterDialog = ref(null);
const actionMenuOpen = ref(false);
const cardRoot = ref(null), menuButton = ref(null);
let posterOpener;
const outsideClick = event => { if (!cardRoot.value?.contains(event.target)) actionMenuOpen.value = false; };
onMounted(() => document.addEventListener('pointerdown', outsideClick));
onUnmounted(() => document.removeEventListener('pointerdown', outsideClick));

const openPosterPreview = async () => {
  actionMenuOpen.value = false;
  posterOpener = document.activeElement;
  isPosterPreviewOpen.value = true;
  await nextTick();
  posterDialog.value?.showModal();
};

const closeCardOverlays = () => {
  if (isPosterPreviewOpen.value) { posterDialog.value?.close(); posterOpener?.focus(); }
  else if (actionMenuOpen.value) menuButton.value?.focus();
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

const completionCaption = computed(() => getCompletionCaption(props.show));

</script>

<style scoped>
.show-card-wrapper { position: relative; min-width: 0; display: flex; }
.show-card { width: 100%; box-sizing: border-box; display: flex; flex-direction: column; background: white; border: 1px solid #e8e9ef; border-radius: 16px; padding: 10px; box-shadow: 0 3px 12px #20213c05; transition: box-shadow .2s; }
.show-card:hover { box-shadow: 0 8px 24px #20213c0d; }
.blur-bg { opacity: .4; } .dropped-card { filter: grayscale(1); }
.poster-preview-btn { display: block; width: 100%; aspect-ratio: 2 / 3; border: 0; border-radius: 10px; padding: 0; overflow: hidden; cursor: zoom-in; }
.poster-preview-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
.poster-placeholder { color: #64748b; font-size: 22px; padding: 18px; }
.card-content { padding: 12px 4px 2px; display: flex; flex-direction: column; flex: 1; }
.title-row { height: 32px; flex-shrink: 0; display: flex; align-items: center; gap: 4px; }
h3 { font-size: 14px; line-height: 22px; font-weight: 650; margin: 0; color: #252736; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.top-actions { display: flex; gap: 2px; }
.action-circle-btn { display: grid; place-items: center; width: 25px; height: 28px; padding: 0; border: 0; border-radius: 7px; background: transparent; color: #9295a6; cursor: pointer; }
.action-circle-btn:hover { background: #f4f3f9; color: #6557c7; }.favorite-btn.active { color: #db7895; }
.card-more-wrapper { position: relative; }.card-action-menu { position: absolute; top: 30px; right: 0; width: 145px; padding: 6px; border: 1px solid #e8e9ef; border-radius: 12px; background: white; z-index: 5; box-shadow: 0 8px 28px #25273620; }
.card-action-menu button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px; background: transparent; border: 0; border-radius: 6px; color: #55596b; text-align: left; cursor: pointer; font-size: 12px; }.card-action-menu button:hover { background: #f5f4fa; }.card-action-menu .danger { color: #ba5b66; }
.tags-line { display: flex; align-items: center; gap: 6px; height: 23px; color: #9698a6; font-size: 11px; }.tags-line img { max-width: 45px; height: 11px; object-fit: contain; margin-left: auto; }.tag-dot { color: #b7bac5; }
button:disabled { opacity: .4; cursor: default; }button:focus-visible { outline: 2px solid #9a84c8; outline-offset: 3px; }
.card-footer { overflow: hidden; text-overflow: ellipsis; min-height: 18px; line-height: 18px; white-space: nowrap; display: block; margin-top: 8px; font-size: 10px; color: #a2a4b0; }.card-footer span:last-child { overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.undo-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 10px; }.undo-overlay button { border: 0; padding: 8px 14px; border-radius: 8px; color: white; background: #8d7ab6; cursor: pointer; }
.poster-dialog { position: fixed; inset: 0; width: 100vw; height: 100vh; max-width: none; max-height: none; margin: 0; border: 0; box-sizing: border-box; z-index: 3000; background: #20212ad9; color: white; display: flex; align-items: center; justify-content: center; padding: 40px; }.poster-dialog img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 12px; }.poster-dialog > button { position: absolute; top: 20px; right: 24px; border: 0; background: white; border-radius: 50%; width: 36px; height: 36px; cursor: pointer; }
@media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
.title-details { border: 0; background: none; padding: 0; color: inherit; font: inherit; text-align: left; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }.title-details:hover { color: #765393; }
.tags-line { font-size: 12px; color: #726c7d; }.card-footer { font-size: 12px; color: #797180; }.action-circle-btn { min-width: 28px; min-height: 32px; }.card-action-menu { top: 34px; }
</style>
