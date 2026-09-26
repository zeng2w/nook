<template>
  <div class="inactive-actions" :aria-busy="busy">
    <template v-if="show.status === 'wish'">
      <p class="eyebrow">{{ category }} · 想看</p>
      <h4>{{ show.title }}</h4>
      <p>{{ releaseText }}<br />{{ show.network || '首播平台待定' }}</p>
      <button class="primary" :class="{ secondary: unreleased }" :disabled="busy" @click="save(unreleased ? { premiereReminder: !show.premiereReminder } : { status: 'watching', trackingStarted: true, premiereReminder: false })">{{ unreleased ? (show.premiereReminder ? '取消开播提醒' : '开播提醒') : '开始追剧' }}</button>
      <p v-if="unreleased" class="hint">{{ show.premiereReminder ? '已开启站内提醒，更新后打开片库即可查看。' : '开播后，下次打开片库时提醒。' }}</p>
      <button v-if="unreleased" class="text-action" :disabled="busy" @click="save({ status: 'watching', trackingStarted: true, premiereReminder: false })">已开播？开始追剧</button>
    </template>
    <template v-else-if="show.status === 'watched'">
      <p class="eyebrow">已看完</p><h4>{{ show.title }}</h4>
      <p>{{ completedText }} · {{ show.totalEpisodes ? `全 ${show.totalEpisodes} 集` : `已看 ${show.watchedEpisodes} 集` }}</p>
      <fieldset :disabled="busy"><legend>我的评分 · {{ show.personalRating == null ? '未评分' : `${show.personalRating.toFixed(1)} / 10` }}</legend>
        <div class="stars"><button v-for="star in 5" :key="star" :aria-label="`评分 ${star * 2} 分`" :class="{ rated: show.personalRating >= star * 2 }" @click="save({ personalRating: star * 2 })">★</button></div>
        <div class="precise-rating"><label>十分制<select :value="show.personalRating ?? ''" aria-label="个人评分" @change="save({ personalRating: $event.target.value === '' ? null : Number($event.target.value) })"><option value="">未评分</option><option v-for="score in 11" :key="score" :value="score - 1">{{ score - 1 }} 分</option></select></label></div>
      </fieldset>
      <template v-if="rewatchConfirm"><p class="hint">新一轮从 0 集开始，保留原观影日志、评分和观毕记录。</p><button class="primary" :disabled="busy" @click="save({ status: 'watching', trackingStarted: true, watchedEpisodes: 0 })">确认开始重温</button><button class="text-action" @click="rewatchConfirm = false">取消</button></template>
      <button v-else class="text-action" @click="rewatchConfirm = true">重温 / 重新在看</button>
    </template>
    <template v-else>
      <p class="eyebrow">已归档 · 弃剧</p><h4>{{ show.title }}</h4>
      <p>停留在 第 {{ show.watchedEpisodes || 0 }} 集<span v-if="show.totalEpisodes"> · 共 {{ show.totalEpisodes }} 集</span></p>
      <button class="primary" :disabled="busy" @click="save({ status: 'watching', trackingStarted: true })">恢复追剧</button>
    </template>
    <p v-if="error" role="alert" class="error">{{ error }}</p>
    <p v-else-if="feedback" role="status" class="hint">{{ feedback }}</p>
    <div class="secondary-actions"><button @click="$emit('details')">作品详情</button><button @click="$emit('edit')">编辑</button><button :disabled="busy" @click="save({ isFavorite: !show.isFavorite })">{{ show.isFavorite ? '取消喜爱' : '喜爱' }}</button><button v-if="show.status !== 'dropped'" :disabled="busy" @click="save({ status: 'dropped', premiereReminder: false })">弃剧</button><button v-else @click="$emit('delete')">删除</button></div>
  </div>
</template>
<script setup>
import { computed, ref } from 'vue';
import { toCalendarDateInput } from '@/utils/dateUtils';
import { getApiErrorMessage } from '@/api/errors';
const props = defineProps({ show: { type: Object, required: true }, onStateAction: { type: Function, required: true } });
defineEmits(['details', 'edit', 'delete']);
const busy = ref(false), error = ref(''), feedback = ref(''), rewatchConfirm = ref(false);
const category = computed(() => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[props.show.category] || '影视'));
const unreleased = computed(() => !props.show.airedEpisodes);
const releaseText = computed(() => props.show.releaseDate ? `${toCalendarDateInput(props.show.releaseDate).replaceAll('-', '.')} 首播` : unreleased.value ? '首播日期待定' : '已开播');
const completedText = computed(() => props.show.completedAt ? `${toCalendarDateInput(props.show.completedAt).slice(0, 7).replace('-', '.')} 观毕` : '已观毕 · 日期未记录');
const save = async patch => {
  if (busy.value) return;
  busy.value = true; error.value = ''; feedback.value = '';
  try { await props.onStateAction(props.show, patch); feedback.value = '已保存'; }
  catch (err) { error.value = getApiErrorMessage(err, '保存失败，请重试'); }
  finally { busy.value = false; }
};
</script>
<style scoped>
.inactive-actions { display: flex; flex-direction: column; gap: 10px; color: inherit; min-width: 0; }h4 { font-size: 16px; margin: 0; line-height: 1.4; overflow-wrap: anywhere; }p { margin: 0; font-size: 12px; line-height: 1.7; }.eyebrow { opacity: .7; font-size: 11px; }.hint { opacity: .75; font-size: 11px; }button { -webkit-tap-highlight-color: transparent; border: 0; font: inherit; cursor: pointer; color: inherit; background: transparent; min-height: 44px; border-radius: 10px; }button:disabled { opacity: .5; cursor: wait; }.primary { background: #f5effc; color: #6e4a92; font-size: 13px; font-weight: 600; }.primary.secondary { background: transparent; color: inherit; border: 1px solid #aa96bd; }.text-action { font-size: 12px; text-decoration: underline; }.secondary-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; font-size: 11px; }.secondary-actions button { min-width: 44px; padding: 0 8px; }fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }legend { font-size: 12px; margin-bottom: 4px; }.stars { display: flex; }.stars button { flex: 1; min-width: 0; color: #aca2b7; font-size: 22px; }.stars .rated { color: #dfba67; }.precise-rating { font-size: 11px; }.precise-rating label { display: flex; align-items: center; justify-content: space-between; gap: 8px; }.precise-rating select { min-height: 44px; border: 1px solid #cfc4da; border-radius: 8px; background: #fff; color: #59466c; }.error { color: #e894a0; }button:focus-visible,select:focus-visible { outline: 2px solid #ba98df; outline-offset: 2px; }
@media (pointer: coarse) { .stars { flex-wrap: wrap; justify-content: center; }.stars button { flex: 0 0 44px; min-width: 44px; } }
</style>
