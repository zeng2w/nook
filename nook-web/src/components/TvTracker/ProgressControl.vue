<template>
  <div class="progress-control">
    <div class="progress-heading">
      <div class="progress-number-wrap">
      <button class="progress-value" :aria-describedby="`progress-hint-${show._id}`" :disabled="show.status === 'dropped'" :aria-label="`修改 ${show.title} 已看集数`" @click="openEditor(false)">
        <span>已看</span> <strong>{{ show.watchedEpisodes || 0 }}</strong><span>集</span>
      </button>
      <span :id="`progress-hint-${show._id}`" role="tooltip" class="progress-tooltip">点击修改已看集数</span>
      </div>
      <span class="badge" :class="unwatched > 0 ? 'behind' : 'caught-up'">{{ unwatched > 0 ? `待看 +${unwatched}` : '已追平' }}</span>
    </div>
    <div class="progress-track" role="progressbar" :aria-label="`${show.title} 观看进度`" :aria-valuenow="watchedPercent" aria-valuemin="0" aria-valuemax="100" :aria-valuetext="`已看 ${show.watchedEpisodes || 0} 集，已更新 ${show.airedEpisodes || 0} 集，${show.totalEpisodes ? `共 ${show.totalEpisodes} 集` : '总集数待定'}`">
      <div class="aired-fill" :style="{ width: airedPercent + '%' }"></div>
      <div class="watched-fill" :style="{ width: watchedPercent + '%' }"></div>
    </div>
    <div class="progress-meta-row">
      <div class="progress-meta" :class="{ 'feedback-hidden': feedbackVisible }" :title="progressMeta"><span class="meta-full">{{ progressMeta }}</span><span class="meta-compact">已更 {{ show.airedEpisodes || 0 }} · {{ show.totalEpisodes ? `共 ${show.totalEpisodes} 集` : '总集数待定' }}</span></div>
      <div class="save-feedback" :class="saveState.state" role="status" aria-live="polite">
        <template v-if="saveState.state === 'saving'">保存中 · 可继续加集</template>
        <template v-else-if="saveState.state === 'saved' && successVisible">已记录 ✓</template>
        <template v-else-if="saveState.state === 'error'">进度未同步 · <button :title="saveState.error" @click="$emit('retry-progress', show)">重试</button></template>
      </div>
    </div>
    <button class="next-episode" :class="unwatched > 0 ? 'has-backlog' : 'up-to-date'" :title="atTotal ? '已达到总集数，点击校正作品进度' : '记录已看一集'" :aria-label="atTotal ? `校正 ${show.title} 观看进度` : `${show.title} 已看集数加一`" :disabled="show.status === 'dropped'" @click="recordEpisode">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m6 12 4 4 8-8" stroke-linecap="round" stroke-linejoin="round"/></svg>
      又看了一集
    </button>
    <Teleport to="body">
      <dialog ref="editor" class="progress-editor" :aria-label="`修改 ${show.title} 观看进度`" @click.self="closeEditor" @cancel.prevent="closeEditor">
        <form @submit.prevent="submit">
          <h3>{{ correcting ? '校正观看进度' : '修改观看进度' }}</h3>
          <p v-if="correcting">已达到记录的总集数。若集数有误，可校正总集数并记录实际进度。</p>
          <template v-if="correcting"><label :for="`total-${show._id}`">总集数</label><input :id="`total-${show._id}`" v-model="totalDraft" type="number" :min="Math.max(show.airedEpisodes || 0, Number(draft) || 0, 1)" step="1" required inputmode="numeric" /><p class="hint">校正后保留手动总集数，避免同步时覆盖。</p></template><p>{{ show.title }}</p>
          <label :for="`episode-${show._id}`">已看集数</label>
          <input :id="`episode-${show._id}`" ref="input" v-model="draft" type="number" min="0" :max="(correcting ? Number(totalDraft) : show.totalEpisodes) || undefined" step="1" required inputmode="numeric" />
          <p v-if="!correcting" class="hint">{{ show.totalEpisodes ? `本季共 ${show.totalEpisodes} 集；已更新数据延迟时仍可记录。` : '总集数待定，可按实际观看进度记录。' }}</p>
          <div class="editor-actions"><button type="button" @click="closeEditor">取消</button><button class="primary" type="submit">保存进度</button></div>
        </form>
      </dialog>
    </Teleport>
  </div>
</template>
<script setup>
import { computed, ref, nextTick, watch, onUnmounted } from 'vue';
const props = defineProps({ show: { type: Object, required: true }, saveState: { type: Object, default: () => ({}) } });
const emit = defineEmits(['edit', 'update-progress', 'set-progress', 'retry-progress']);
const successVisible = ref(false);
let feedbackTimer;
watch(() => props.saveState.state, state => {
  clearTimeout(feedbackTimer);
  successVisible.value = state === 'saved';
  if (state === 'saved') feedbackTimer = setTimeout(() => { successVisible.value = false; }, 1600);
}, { immediate: true });
onUnmounted(() => clearTimeout(feedbackTimer));
const feedbackVisible = computed(() => ['saving', 'error'].includes(props.saveState.state) || successVisible.value);
const correcting = ref(false), totalDraft = ref(0);
const recordEpisode = () => atTotal.value ? openEditor(true) : emit('update-progress', props.show, 1);
const editor = ref(null), input = ref(null), draft = ref(0);
const progressMeta = computed(() => `已更新至 ${props.show.airedEpisodes || 0} 集 · ${props.show.totalEpisodes ? `共 ${props.show.totalEpisodes} 集` : '总集数待定'}`);
const unwatched = computed(() => Math.max(0, (props.show.airedEpisodes || 0) - (props.show.watchedEpisodes || 0)));
const atTotal = computed(() => props.show.totalEpisodes > 0 && props.show.watchedEpisodes >= props.show.totalEpisodes);
const denominator = computed(() => Math.max(props.show.totalEpisodes || 0, props.show.airedEpisodes || 0, props.show.watchedEpisodes || 0, 1));
const watchedPercent = computed(() => Math.round((props.show.watchedEpisodes || 0) / denominator.value * 100));
const airedPercent = computed(() => Math.round((props.show.airedEpisodes || 0) / denominator.value * 100));
let opener;
const openEditor = async (correct = false) => { correcting.value = correct; totalDraft.value = props.show.totalEpisodes || 0; opener = document.activeElement; draft.value = props.show.watchedEpisodes || 0; editor.value.showModal(); await nextTick(); input.value?.focus(); input.value?.select(); };
const closeEditor = () => { editor.value.close(); opener?.focus(); };
const submit = () => {
  const value = Number(draft.value);
  const total = correcting.value ? Number(totalDraft.value) : props.show.totalEpisodes;
  if (correcting.value && (!Number.isSafeInteger(total) || total < Math.max(value, props.show.airedEpisodes || 0, 1))) return;
  if (!Number.isSafeInteger(value) || value < 0 || (total > 0 && value > total)) return;
  emit('set-progress', props.show, value, correcting.value ? { totalEpisodes: total } : undefined); closeEditor();
};
</script>
<style scoped>
.progress-control { container-type: inline-size; min-width: 0; margin-top: 14px; }
.progress-heading { display: grid; grid-template-columns: minmax(max-content, 1fr) max-content; grid-template-rows: 30px; align-items: center; gap: 4px 12px; }
.progress-value { display: flex; min-width: 0; white-space: nowrap; align-items: baseline; line-height: 1; gap: 4px; padding: 0; border: 0; background: none; color: #666475; font-size: 12px; text-align: left; cursor: pointer; }
.progress-value strong { font-size: 24px; line-height: 1; font-weight: 650; color: #343346; font-variant-numeric: tabular-nums; }.progress-value:hover strong { color: #735499; }
.badge { box-sizing: border-box; height: 24px; line-height: 16px; padding: 4px 6px; border-radius: 20px; font-size: 12px; white-space: nowrap; }.behind { background: #f0edfa; color: #725499; }.caught-up { background: #edf4f0; color: #476f5c; }
.progress-track { position: relative; height: 5px; background: #eeeef3; border-radius: 10px; overflow: hidden; margin: 10px 0 8px; }.progress-track > div { position: absolute; height: 100%; border-radius: inherit; transition: width .2s; }.aired-fill { background: #d6c9e8; }.watched-fill { background: #8e71b3; }
.meta-compact { display: none; }
.progress-meta { height: 18px; line-height: 18px; font-size: 12px; color: #706c7d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.progress-number-wrap { position: relative; min-width: 0; }
.progress-tooltip { position: absolute; bottom: calc(100% + 9px); left: 0; z-index: 8; width: max-content; padding: 7px 10px; border-radius: 8px; background: #35303f; color: white; font-size: 12px; box-shadow: 0 4px 14px #28203522; visibility: hidden; opacity: 0; transform: translateY(4px); transition: opacity .16s, transform .16s; }
.progress-tooltip::after { content: ''; position: absolute; top: 100%; left: 18px; border: 4px solid transparent; border-top-color: #35303f; }
.progress-number-wrap:hover .progress-tooltip, .progress-number-wrap:focus-within .progress-tooltip { visibility: visible; opacity: 1; transform: translateY(0); }
.next-episode { display: flex; align-items: center; justify-content: center; gap: 7px; width: 100%; min-height: 36px; border: 1px solid #e5dced; border-radius: 20px; background: #f4f0fa; color: #70518f; font-size: 12px; font-weight: 600; margin-top: 12px; cursor: pointer; }.next-episode span { margin-left: 12px; }.next-episode:hover:not(:disabled) { background: #eae1f4; }
.progress-meta-row { position: relative; height: 18px; }
.feedback-hidden { visibility: hidden; }
.save-feedback { position: absolute; inset: 0; line-height: 18px; white-space: nowrap; text-align: center; color: #757080; font-size: 12px; pointer-events: none; }.save-feedback.saved { color: #476f5c; }.save-feedback.error { color: #ad4151; }.save-feedback button { pointer-events: auto; border: 0; background: none; font-size: inherit; color: inherit; cursor: pointer; text-decoration: underline; }
.next-episode.has-backlog { background: #8665aa; border-color: #8665aa; color: #fff; box-shadow: 0 2px 5px #8665aa18; }.next-episode.has-backlog:hover:not(:disabled) { background: #755494; border-color: #755494; }
.next-episode.up-to-date { background: #faf8fc; border-color: #e3dbea; color: #806991; }.next-episode.up-to-date:hover:not(:disabled) { background: #f0eaf6; }
@container (max-width: 200px) {
  .meta-full { display: none; }
  .meta-compact { display: inline; }
  .progress-meta { font-size: 10px; }
}
@container (max-width: 185px) {
  .progress-heading { grid-template-columns: 1fr; grid-template-rows: 30px 24px; row-gap: 6px; }
  .badge { justify-self: end; }
}
button:disabled { cursor: default; opacity: .5; }button:focus-visible { outline: 2px solid #977ab9; outline-offset: 3px; }
.progress-editor { width: min(380px, calc(100vw - 48px)); padding: 24px; border: 1px solid #e8e3ec; border-radius: 18px; color: #343346; box-shadow: 0 16px 60px #27203622; box-sizing: border-box; }.progress-editor::backdrop { background: #28233566; }.progress-editor h3 { margin: 0; font-size: 18px; }.progress-editor p { color: #706c7d; font-size: 13px; line-height: 1.6; }.progress-editor label { display: block; font-size: 13px; margin-bottom: 8px; }.progress-editor input { box-sizing: border-box; width: 100%; padding: 12px; border: 1px solid #cfc3de; border-radius: 9px; font-size: 18px; }.editor-actions { display: flex; justify-content: flex-end; gap: 10px; }.editor-actions button { padding: 9px 16px; border: 1px solid #e4dcec; border-radius: 9px; background: white; cursor: pointer; }.editor-actions .primary { background: #81639f; color: white; }
@media(prefers-reduced-motion: reduce) { .progress-tooltip, .progress-track > div { transition: none; } }
@media (max-width: 420px) { .progress-value { gap: 2px; }.progress-value strong { font-size: 22px; }.badge { padding: 4px 5px; font-size: 11px; }.progress-meta { font-size: 11px; } }
</style>
