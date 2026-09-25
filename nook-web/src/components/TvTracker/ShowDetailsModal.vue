<template>
  <Teleport to="body">
    <dialog ref="dialog" class="show-details" :aria-label="`${show?.title || ''} 详情`" @cancel.prevent="close" @click.self="close">
      <template v-if="show">
        <header><span>{{ show._id ? '我的片库' : '探索发现' }}</span><button autofocus aria-label="关闭作品详情" @click="close">✕</button></header>
        <div class="details-heading"><img v-if="show.posterUrl" :src="show.posterUrl" :alt="show.title" /><div><h2>{{ show.title }}</h2><p>{{ categoryLabel }}</p><p v-if="show.seasonNumber">第 {{ show.seasonNumber }} 季<span v-if="show.seasonName"> · {{ show.seasonName }}</span></p><p v-if="show.network" class="network"><img v-if="show.networkLogo" :src="show.networkLogo" alt="" />{{ show.network }}</p></div></div>
        <section class="story-section" aria-labelledby="story-heading">
          <h3 id="story-heading">剧情简介</h3>
          <p v-if="overview" class="overview">{{ overview }}</p>
          <p v-else class="note">{{ isLoading ? '正在加载简介…' : loadError ? '简介暂时无法加载' : '暂无剧情简介' }}</p>
        </section>
        <section class="cast-section" aria-labelledby="cast-heading">
          <h3 id="cast-heading">{{ show.category === 'anime' ? '主演 / 配音' : '主演' }}</h3>
          <div v-if="cast.length" class="cast-grid">
            <div v-for="person in cast" :key="person.id || person.name" class="cast-person">
              <img v-if="person.profileUrl" :src="person.profileUrl" alt="" loading="lazy" @error="hidePortrait" />
              <span v-else class="cast-avatar" aria-hidden="true">{{ person.name.charAt(0) }}</span>
              <div><span class="cast-name">{{ person.name }}</span><span v-if="person.character" class="cast-role" :title="person.character">{{ person.character }}</span></div>
            </div>
          </div>
          <p v-else class="note">{{ isLoading ? '正在加载主演…' : loadError ? '主演暂时无法加载' : '暂无主演资料' }}</p>
        </section>
        <div v-if="loadError" class="details-error" role="alert">{{ loadError }}<button @click="loadPresentation">重试加载</button></div>
        <template v-if="show._id">
          <dl><div><dt>观看进度</dt><dd>已看 {{ show.watchedEpisodes || 0 }} 集 / {{ show.totalEpisodes ? `共 ${show.totalEpisodes} 集` : '总集数待定' }}</dd></div><div><dt>更新进度</dt><dd>已更新 {{ show.airedEpisodes || 0 }} 集</dd></div><div><dt>更新安排</dt><dd>{{ schedule }}</dd></div><div><dt>下次播出</dt><dd>{{ nextDate }}</dd></div><div><dt>完结信息</dt><dd>{{ getCompletionCaption(show) }}</dd></div></dl>
          <p class="note">排期仅有日期时不显示倒计时；预计更新可能调整。</p>
        </template>
        <p v-else class="note">{{ show.releaseDate ? `首播 ${show.releaseDate}` : '首播日期待定' }}{{ show.rating ? ` · ${show.rating.toFixed(1)} 分` : '' }}</p>
        <footer><a v-if="tmdbUrl" :href="tmdbUrl" target="_blank" rel="noopener noreferrer">查看 TMDB 资料 ↗</a><button class="primary" @click="act">{{ show._id ? '编辑作品' : '加入想看' }}</button></footer>
      </template>
    </dialog>
  </Teleport>
</template>
<script setup>
import { ref, computed, watch, nextTick, onUnmounted } from 'vue';
import { fetchShowPresentation } from '@/api/tmdb';
import { getApiErrorMessage } from '@/api/errors';
import { getCompletionCaption, toCalendarDateInput } from '@/utils/dateUtils';
const props = defineProps({ show: { type: Object, default: null } });
const emit = defineEmits(['close', 'edit', 'add']);
const dialog = ref(null);
const presentation = ref(null), isLoading = ref(false), loadError = ref('');
const overview = computed(() => presentation.value?.overview || props.show?.overview || '');
const cast = computed(() => presentation.value?.cast || props.show?.cast || []);
let requestId = 0;
const loadPresentation = async () => {
  const version = ++requestId;
  const show = props.show;
  presentation.value = null;
  loadError.value = '';
  isLoading.value = false;
  if (!show || !Number.isSafeInteger(Number(show.tmdbId)) || Number(show.tmdbId) <= 0) return;
  isLoading.value = true;
  try {
    const data = await fetchShowPresentation(show);
    if (version === requestId) presentation.value = data;
  } catch (error) {
    if (version === requestId) loadError.value = getApiErrorMessage(error, '资料暂时无法加载');
  } finally {
    if (version === requestId) isLoading.value = false;
  }
};
watch(() => props.show ? [props.show.tmdbId, props.show.seasonNumber, props.show.category, props.show._id].join(':') : '', loadPresentation);
onUnmounted(() => { requestId++; });
const hidePortrait = event => { event.target.style.visibility = 'hidden'; };
let opener;
watch(() => props.show, async (show, previous) => {
  if (show && !previous) { opener = document.activeElement; await nextTick(); dialog.value?.showModal(); }
  else if (!show && dialog.value?.open) { dialog.value.close(); opener?.focus(); }
});
const close = () => { dialog.value?.close(); emit('close'); opener?.focus(); };
const act = () => { const show = props.show; close(); emit(show._id ? 'edit' : 'add', show); };
const categoryLabel = computed(() => ({ tv: '电视剧', movie: '电影', anime: '动漫', variety: '综艺' }[props.show?.category] || '影视作品'));
const tmdbUrl = computed(() => Number.isSafeInteger(Number(props.show?.tmdbId)) && Number(props.show?.tmdbId) > 0 ? `https://www.themoviedb.org/${props.show.category === 'movie' ? 'movie' : 'tv'}/${props.show.tmdbId}` : '');
const nextDate = computed(() => props.show?.nextAirDate && !props.show.scheduleLocked ? `${toCalendarDateInput(props.show.nextAirDate)} · 确认排期` : '暂无确认日期');
const schedule = computed(() => {
  const show = props.show || {};
  const frequency = { daily: '每天', weekly: '每周', monthly: '每月', ended: '已完结', unknown: '待定' }[show.updateFrequency] || '待定';
  const days = show.updateFrequency === 'weekly' ? (show.updateDays || []).map(day => ['周日','周一','周二','周三','周四','周五','周六'][day]).join('、') : '';
  return `${frequency}${days ? ` · ${days}` : ''}${['daily','weekly','monthly'].includes(show.updateFrequency) ? ` · 每次 ${show.updateCount || 1} 集（预计）` : ''}`;
});
</script>
<style scoped>
.show-details { width: min(540px, calc(100vw - 32px)); max-height: 85vh; box-sizing: border-box; padding: 24px; border: 1px solid #e7e2ed; border-radius: 20px; color: #343346; box-shadow: 0 20px 70px #28223522; }.show-details::backdrop { background: #28233566; }
header { display: flex; justify-content: space-between; align-items: center; color: #756b80; font-size: 12px; margin-bottom: 20px; }header button { width: 32px; height: 32px; border: 0; background: #f3f0f7; border-radius: 50%; cursor: pointer; }.details-heading { display: flex; gap: 20px; align-items: center; }.details-heading > img { width: 100px; aspect-ratio: 2/3; object-fit: cover; border-radius: 10px; }.details-heading h2 { font-size: 21px; margin: 0 0 10px; }.details-heading p { color: #706779; font-size: 13px; }.network { display: flex; gap: 6px; align-items: center; }.network img { width: 24px; height: 18px; object-fit: contain; }.overview { font-size: 14px; line-height: 1.8; white-space: pre-line; }
dl { margin: 24px 0 12px; }dl > div { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #f0edf4; font-size: 13px; }dt { width: 64px; flex-shrink: 0; color: #766e80; }dd { margin: 0; line-height: 1.6; }.note { color: #797180; font-size: 12px; line-height: 1.7; }footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 22px; }a { color: #765691; font-size: 13px; }.primary { border: 0; padding: 11px 18px; border-radius: 10px; background: #80619e; color: white; cursor: pointer; margin-left: auto; }button:focus-visible, a:focus-visible { outline: 2px solid #997db7; outline-offset: 3px; }
.story-section, .cast-section { margin-top: 24px; }.story-section h3, .cast-section h3 { font-size: 13px; font-weight: 650; margin: 0 0 12px; color: #554b62; }.overview { margin: 0; color: #514a5b; }.cast-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }.cast-person { display: flex; align-items: center; gap: 9px; min-width: 0; }.cast-person > img, .cast-avatar { width: 36px; height: 44px; flex-shrink: 0; border-radius: 7px; object-fit: cover; background: #f0ebf5; }.cast-avatar { display: grid; place-items: center; color: #887394; font-size: 14px; }.cast-person > div { min-width: 0; }.cast-name { display: block; color: #42394d; font-size: 13px; line-height: 1.5; }.cast-role { display: block; font-size: 11px; color: #7b7284; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; line-height: 1.6; }.details-error { margin-top: 14px; font-size: 12px; color: #9e5263; }.details-error button { background: none; border: 0; color: #765691; text-decoration: underline; cursor: pointer; margin-left: 8px; }
</style>
