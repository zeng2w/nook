<template>
  <article ref="root" class="inactive-card show-card" :class="{ activated: active, deleting: isPendingDelete, 'compact-list': compactList }" @keydown.esc="closeOverlay">
    <div class="poster-shell" :class="{ dropped: show.status === 'dropped' }">
      <button ref="posterButton" class="poster-trigger" :aria-label="`${show.title} 状态操作`" :aria-expanded="active || sheetOpen" @click="activate"><img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" loading="lazy" /><span v-else>{{ show.title }}</span></button>
      <span v-if="show.status !== 'dropped'" class="corner-badge">{{ badge }}</span>
      <div class="poster-overlay">
        <InactiveActions :show="show" :on-state-action="onStateAction" @details="act('details')" @edit="act('edit')" @delete="act('delete')" />
      </div>
    </div>
    <div class="card-caption"><button ref="titleButton" class="card-title" :title="show.title" @click="activate">{{ show.title }}</button><p>{{ category }}<span v-if="year"> · {{ year }}</span><span v-else> · {{ statusText }}</span></p></div>
    <button class="mobile-status" @click="activate">{{ show.status === 'watched' ? (show.personalRating == null ? '☆ 添加评分' : `★ ${show.personalRating.toFixed(1)}`) : show.status === 'dropped' ? '恢复追剧' : show.airedEpisodes ? '开始追剧' : show.premiereReminder ? '已开启提醒' : '开播提醒' }}</button>
    <div v-if="isPendingDelete" class="delete-overlay"><span>即将删除…</span><button @click="$emit('cancel-delete', show._id)">撤回</button></div>
    <Teleport to="body"><dialog ref="sheet" class="state-sheet" :aria-label="`${show.title} 操作`" @cancel.prevent="closeSheet" @click.self="closeSheet"><div class="sheet-inner"><div class="sheet-header"><span>{{ statusText }}</span><button aria-label="关闭作品操作" @click="closeSheet">✕</button></div><InactiveActions v-if="sheetOpen" :show="show" :on-state-action="onStateAction" @details="act('details')" @edit="act('edit')" @delete="act('delete')" /></div></dialog></Teleport>
  </article>
</template>
<script setup>
import { computed, ref, nextTick, onMounted, onUnmounted } from 'vue';
import InactiveActions from './InactiveActions.vue';
import { toCalendarDateInput } from '@/utils/dateUtils';
const props = defineProps({ show: { type: Object, required: true }, onStateAction: { type: Function, required: true }, isPendingDelete: Boolean, compactList: Boolean });
const emit = defineEmits(['details', 'edit', 'delete', 'cancel-delete']);
const titleButton = ref(null);
const root = ref(null), posterButton = ref(null), sheet = ref(null), active = ref(false), sheetOpen = ref(false);
const category = computed(() => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[props.show.category] || '影视'));
const statusText = computed(() => ({ wish: '想看', watched: '已看完', dropped: '弃剧' }[props.show.status]));
const year = computed(() => props.show.releaseDate ? toCalendarDateInput(props.show.releaseDate).slice(0, 4) : '');
const badge = computed(() => props.show.status === 'watched' ? props.show.personalRating == null ? '✓ 已看完' : `★ ${props.show.personalRating.toFixed(1)}` : props.show.airedEpisodes ? '已开播' : props.show.releaseDate ? `${toCalendarDateInput(props.show.releaseDate).slice(5).replace('-', '.')} 开播` : '未播');
const activate = async () => {
  if (props.compactList || window.matchMedia('(max-width: 640px)').matches) { sheetOpen.value = true; await nextTick(); sheet.value.showModal(); }
  else active.value = !active.value;
};
const closeSheet = () => { sheet.value?.close(); sheetOpen.value = false; posterButton.value?.focus(); };
const act = action => { closeSheet(); active.value = false; emit(action, action === 'delete' ? props.show._id : props.show); };
const closeOverlay = () => { active.value = false; titleButton.value?.focus(); };
const outside = event => { if (!root.value?.contains(event.target)) { active.value = false; if (root.value?.contains(document.activeElement)) document.activeElement.blur(); } };
onMounted(() => document.addEventListener('pointerdown', outside));
onUnmounted(() => { document.removeEventListener('pointerdown', outside); sheet.value?.close(); });
</script>
<style scoped>
.inactive-card { position: relative; align-self: start; min-width: 0; padding: 10px; border: 1px solid #e9e5ef; border-radius: 16px; background: #fff; box-shadow: 0 3px 12px #30204006; box-sizing: border-box; }.poster-shell { position: relative; aspect-ratio: 2/3; border-radius: 12px; overflow: hidden; background: #edeaf2; }.poster-trigger { display: grid; place-items: center; width: 100%; height: 100%; padding: 0; border: 0; color: #8c7c9d; background: transparent; cursor: pointer; }.poster-trigger img { width: 100%; height: 100%; object-fit: cover; }.poster-trigger span { padding: 18px; font-size: 20px; }.dropped .poster-trigger { filter: grayscale(.28); }.corner-badge { position: absolute; top: 8px; right: 8px; border-radius: 20px; padding: 5px 8px; font-size: 11px; background: #fffE; color: #705785; pointer-events: none; box-shadow: 0 2px 8px #21132e10; }.poster-overlay { position: absolute; inset: 0; padding: 16px 12px; background: #1f172bd9; backdrop-filter: blur(4px); color: #fff; opacity: 0; visibility: hidden; overflow-y: auto; overscroll-behavior: contain; transition: opacity .2s ease, visibility .2s; }.activated .poster-overlay,.poster-shell:focus-within .poster-overlay { opacity: 1; visibility: visible; }.card-caption { padding: 10px 2px 0; }.card-title { display: block; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; border: 0; background: none; padding: 0; text-align: left; font-size: 14px; font-weight: 600; color: #393144; cursor: pointer; }.card-caption p { margin: 6px 0 2px; font-size: 11px; color: #908498; }.mobile-status { display: none; }.delete-overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; gap: 8px; background: #ffffffdd; border-radius: inherit; font-size: 12px; }.delete-overlay button { min-height: 44px; border: 0; border-radius: 8px; color: #765297; background: #f2edf8; }.state-sheet { width: min(480px, 100vw); box-sizing: border-box; max-width: 100vw; max-height: 65dvh; height: fit-content; margin: auto auto 0; padding: 0; border: 1px solid #eee7f4; border-radius: 20px 20px 0 0; background: white; color: #44364f; box-shadow: 0 -12px 60px #29163720; }.state-sheet::backdrop { background: #25172d66; backdrop-filter: blur(3px); }.sheet-inner { padding: 16px 24px max(24px, env(safe-area-inset-bottom)); }.sheet-header { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: #96889e; margin-bottom: 10px; }.sheet-header button { width: 44px; height: 44px; border: 0; border-radius: 50%; background: #f5f1f8; color: #756181; }button { -webkit-tap-highlight-color: transparent; }button:focus-visible { outline: 2px solid #a584c3; outline-offset: 2px; }
.poster-overlay :deep(.inactive-actions) { min-height: 100%; }.poster-overlay :deep(.primary), .poster-overlay :deep(fieldset + .text-action) { margin-top: auto; }.activated .corner-badge { opacity: 0; }
@media (hover: hover) and (pointer: fine) { .poster-shell:hover .corner-badge { opacity: 0; }.poster-shell:hover .poster-overlay { opacity: 1; visibility: visible; } }
@media (hover: none) { .poster-shell:focus-within .poster-overlay { opacity: 0; visibility: hidden; }.inactive-card.activated .poster-overlay { opacity: 1; visibility: visible; } }
@media (max-width: 640px) { .poster-overlay { display: none; }.mobile-status { display: block; min-height: 44px; width: 100%; margin-top: 6px; border: 0; border-radius: 10px; background: #f7f3fa; color: #80618f; font-size: 11px; }.card-title { min-height: 44px; }.card-caption { padding-top: 2px; } }
.compact-list { width: 100%; display: grid; grid-template-columns: 80px 1fr; gap: 16px; align-items: center; }.compact-list .poster-overlay { display: none; }.compact-list .poster-shell { grid-row: span 2; }.compact-list .mobile-status { display: block; min-height: 44px; border: 0; border-radius: 10px; background: #f6f1fa; color: #80618f; justify-self: start; padding: 0 16px; }.compact-list .corner-badge { display: none; }
@media (prefers-reduced-motion: reduce) { .poster-overlay { transition: none; } }
</style>
