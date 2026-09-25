<template>
  <component :is="playUrl ? 'a' : 'button'" class="mini-item-card" :href="playUrl || undefined" :target="playUrl ? '_blank' : undefined" :rel="playUrl ? 'noopener noreferrer' : undefined" :type="playUrl ? undefined : 'button'" :title="`${description} · ${playUrl ? '打开播放页面' : '查看作品详情'}`" :aria-label="`${playUrl ? '播放' : '查看'} ${item.show.title}${playUrl ? '（新标签页）' : ' 详情'}`" @click="!playUrl && $emit('details', item.show)">
    <span class="mini-poster"><img v-if="item.show.posterUrl" :src="item.show.posterUrl" alt="" loading="lazy" /><span v-else>{{ item.show.title?.charAt(0) }}</span></span>
    <span class="entry-content">
      <span class="entry-heading"><span class="mini-title">{{ item.show.title }}</span><img v-if="item.show.networkLogo" class="platform-logo" :src="item.show.networkLogo" :alt="item.show.network" /><span v-else-if="item.show.network" class="platform-name" :title="item.show.network">{{ item.show.network }}</span></span>
      <span class="entry-state" :class="state">{{ badge }}</span>
    </span>
    <span class="entry-arrow" aria-hidden="true">{{ playUrl ? '↗' : '›' }}</span>
  </component>
</template>
<script setup>
import { computed } from 'vue';
import { isSameCalendarDay } from '@/utils/dateUtils';
const props = defineProps({ item: { type: Object, required: true }, date: { type: Date, required: true }, today: { type: Date, required: true } });
defineEmits(['details']);
const playUrl = computed(() => {
  try { const url = new URL(props.item.show.playUrl); return ['https:', 'http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
});
const state = computed(() => props.item.entry.type === 'confirmed' ? 'aired' : isSameCalendarDay(props.date, props.today) ? 'pending' : 'upcoming');
const episode = computed(() => props.item.entry.episodeText.replace(/^Ep\s*/, 'Ep.'));
const badge = computed(() => state.value === 'aired' ? `已更 ${episode.value}` : state.value === 'pending' ? `今日待播 · ${episode.value}` : `更新至 ${episode.value}`);
const description = computed(() => props.item.entry.type === 'estimated' ? '根据更新规律推算，具体播出以平台为准' : props.item.entry.type === 'scheduled' ? '已确认播出日期，具体时刻以平台为准' : '已确认更新进度，不代表当日实际播出时间');
</script>
<style scoped>
.mini-item-card { position: relative; box-sizing: border-box; width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 15px 9px 9px; background: #fff; border: 1px solid #eceaf0; border-radius: 10px; box-shadow: 0 2px 5px #30234504; color: #373344; text-align: left; text-decoration: none; font: inherit; cursor: pointer; transition: transform .16s, box-shadow .16s, border-color .16s; min-width: 0; }
.mini-item-card:hover { transform: translateY(-2px); border-color: #cfc2e0; box-shadow: 0 5px 14px #55416e10; }.mini-item-card:focus-visible { outline: 2px solid #9472b6; outline-offset: 2px; }
.mini-poster { width: 32px; aspect-ratio: 2/3; flex-shrink: 0; border-radius: 5px; overflow: hidden; background: #f0edf5; display: grid; place-items: center; color: #9686a8; }.mini-poster img { width: 100%; height: 100%; object-fit: cover; }
.entry-content { min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 7px; }.entry-heading { display: flex; gap: 4px; align-items: center; min-width: 0; }.mini-title { font-size: 12px; font-weight: 600; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; overflow-wrap: anywhere; }.platform-logo { width: 16px; height: 14px; object-fit: contain; flex-shrink: 0; }.platform-name { font-size: 9px; color: #8a8293; max-width: 30px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.entry-state { align-self: flex-start; max-width: 100%; box-sizing: border-box; font-size: 10px; line-height: 18px; padding: 1px 5px; border-radius: 5px; font-variant-numeric: tabular-nums; }.aired { color: #527562; background: #eff5f0; }.pending { color: #7752a1; background: #eee5fa; }.upcoming { color: #637996; background: #f0f4f9; }.entry-arrow { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); opacity: 0; color: #927da9; }.mini-item-card:hover .entry-arrow, .mini-item-card:focus-visible .entry-arrow { opacity: 1; }
@media (max-width: 768px) { .mini-poster { width: 36px; }.mini-title { font-size: 13px; }.entry-state { font-size: 11px; }.entry-arrow { opacity: 1; } }
@media (prefers-reduced-motion: reduce) { .mini-item-card { transition: none; }.mini-item-card:hover { transform: none; } }
</style>
