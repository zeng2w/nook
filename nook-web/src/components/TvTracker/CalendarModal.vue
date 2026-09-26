<template>
  <Teleport to="body">
    <dialog v-if="visible" ref="dialog" class="calendar-modal" aria-labelledby="calendar-modal-title" @click.self="close" @cancel.prevent="close">
      <header class="calendar-header">
        <div class="header-left"><h3 id="calendar-modal-title">追剧日历</h3><div class="calendar-context"><span class="month-label" aria-live="polite">{{ monthTitle }}</span><span class="timezone-label">{{ timeZoneLabel }}</span></div></div>
        <div class="header-right">
          <div class="view-switch" role="group" aria-label="日历视图"><button v-for="mode in modes" :key="mode.value" :aria-pressed="view === mode.value" @click="setView(mode.value)">{{ mode.label }}</button></div>
          <button class="today-btn" @click="resetToToday">今天</button>
          <div class="nav-group"><button :aria-label="view === 'week' ? '上一周' : '上一月'" @click="navigate(-1)">‹</button><button :aria-label="view === 'week' ? '下一周' : '下一月'" @click="navigate(1)">›</button></div>
          <button class="close-btn" aria-label="关闭追剧日历" @click="close">✕</button>
        </div>
      </header>
      <div class="calendar-scroll">
        <div class="calendar-grid-view" :class="{ 'month-view': view === 'month' }">
          <template v-if="view === 'month'"><div v-for="label in weekDays" :key="label" class="month-weekday">{{ label }}</div></template>
          <section v-for="day in calendarDays" :key="day.key" class="day-column" :class="dayClasses(day)" :data-selected="isSameCalendarDay(day.date, anchor)" :aria-label="formatDate(day.date)">
            <div class="day-header"><span v-if="view === 'week'" class="day-name">{{ weekDays[day.date.getDay()] }}</span><span class="day-circle" :aria-current="isToday(day.date) ? 'date' : undefined">{{ day.date.getDate() }}</span><span v-if="isToday(day.date)" class="today-label">今天</span></div>
            <div class="day-body">
              <CalendarEntry v-for="item in displayedItems(day)" :key="item.show._id" :item="item" :date="day.date" :today="today" @details="openDetails" />
              <button v-if="view === 'month' && day.items.length > 2" class="expand-day" :aria-expanded="!!expanded[day.key]" @click="expanded[day.key] = !expanded[day.key]">{{ expanded[day.key] ? '收起' : `还有 ${day.items.length - 2} 部` }}</button>
              <span v-if="!day.items.length" class="empty-day">—</span>
            </div>
          </section>
        </div>
        <div class="mobile-agenda-view">
          <p v-if="!mobileAgendaDays.length" class="agenda-day-empty">{{ view === 'week' ? '本周' : '本月' }}暂无更新安排</p>
          <section v-for="day in mobileAgendaDays" :key="day.key" class="agenda-day" :class="dayClasses(day)" :data-selected="isSameCalendarDay(day.date, anchor)">
            <div class="agenda-day-header"><strong>{{ formatDate(day.date) }}</strong><span>{{ isToday(day.date) ? '今天 · ' : '' }}{{ day.items.length }} 部</span></div>
            <CalendarEntry v-for="item in day.items" :key="item.show._id" :item="item" :date="day.date" :today="today" @details="openDetails" />
            <p v-if="!day.items.length" class="agenda-day-empty">今天暂无更新</p>
          </section>
        </div>
      </div>
      <footer class="calendar-footer">未来更新依照播出安排推算，以平台实际更新为准。</footer>
    </dialog>
  </Teleport>
</template>
<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import CalendarEntry from './CalendarEntry.vue';
import { useCalendarToday } from '@/composables/useCalendarToday';
import { getCalendarEpisodeEntry, getCurrentTimeZoneLabel, isSameCalendarDay, toLocalCalendarDate, toCalendarDateInput } from '@/utils/dateUtils';
const props = defineProps({ visible: Boolean, shows: { type: Array, default: () => [] }, initialDate: { type: Date, default: null } });
const emit = defineEmits(['update:visible', 'details']);
const today = useCalendarToday();
const dialog = ref(null), view = ref('week'), anchor = ref(today.value), expanded = ref({});
watch(today, (current, previous) => {
  if (isSameCalendarDay(anchor.value, previous)) anchor.value = current;
});
const timeZoneLabel = getCurrentTimeZoneLabel();
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const modes = [{ value: 'week', label: '周' }, { value: 'month', label: '月' }];
const isToday = date => isSameCalendarDay(date, today.value);
let opener;
watch(() => props.visible, async visible => {
  if (!visible) return;
  opener = document.activeElement;
  resetToToday();
  if (props.initialDate) {
    anchor.value = toLocalCalendarDate(props.initialDate);
    view.value = 'week';
  }
  await nextTick();
  dialog.value?.showModal();
  dialog.value?.querySelector('.close-btn')?.focus();
  scrollToToday();
}, { immediate: true });
const close = () => { dialog.value?.close(); emit('update:visible', false); opener?.focus(); };
const openDetails = show => { close(); emit('details', show); };
function scrollToToday() {
  if (!dialog.value?.open) return;
  const target = [...dialog.value.querySelectorAll('[data-selected="true"]')].find(element => element.getClientRects().length) || [...dialog.value.querySelectorAll('.is-today')].find(element => element.getClientRects().length);
  target?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}
function resetToToday() { today.value = toLocalCalendarDate(new Date()); anchor.value = today.value; expanded.value = {}; void nextTick(scrollToToday); }
const setView = value => { view.value = value; expanded.value = {}; };
const navigate = amount => {
  const date = new Date(anchor.value);
  if (view.value === 'week') date.setDate(date.getDate() + amount * 7);
  else { date.setDate(1); date.setMonth(date.getMonth() + amount); }
  anchor.value = date; expanded.value = {};
  dialog.value?.querySelector('.calendar-scroll')?.scrollTo({ top: 0 });
};
const range = computed(() => {
  const start = new Date(anchor.value);
  if (view.value === 'month') start.setDate(1);
  start.setDate(start.getDate() - start.getDay());
  const length = view.value === 'week' ? 7 : Math.ceil((new Date(anchor.value.getFullYear(), anchor.value.getMonth(), 1).getDay() + new Date(anchor.value.getFullYear(), anchor.value.getMonth() + 1, 0).getDate()) / 7) * 7;
  return { start, length };
});
const calendarDays = computed(() => Array.from({ length: range.value.length }, (_, index) => {
  const date = new Date(range.value.start); date.setDate(date.getDate() + index);
  return { date, key: toCalendarDateInput(date), items: props.shows.flatMap(show => { const entry = getCalendarEpisodeEntry(show, date, today.value); return entry ? [{ show, entry }] : []; }) };
}));
const monthTitle = computed(() => {
  if (view.value === 'month') return `${anchor.value.getFullYear()}年 ${anchor.value.getMonth() + 1}月`;
  const first = calendarDays.value[0].date, last = calendarDays.value.at(-1).date;
  const start = `${first.getFullYear()}年 ${first.getMonth() + 1}月`;
  return first.getFullYear() !== last.getFullYear() ? `${start} - ${last.getFullYear()}年 ${last.getMonth() + 1}月` : first.getMonth() !== last.getMonth() ? `${start} - ${last.getMonth() + 1}月` : start;
});
const dayClasses = day => ({ 'is-today': isToday(day.date), 'is-past': day.date < today.value, 'outside-month': view.value === 'month' && day.date.getMonth() !== anchor.value.getMonth() });
const displayedItems = day => view.value === 'month' && !expanded.value[day.key] ? day.items.slice(0, 2) : day.items;
const mobileAgendaDays = computed(() => calendarDays.value.filter(day => (view.value === 'week' || day.date.getMonth() === anchor.value.getMonth()) && (day.items.length || isToday(day.date))));
const formatDate = date => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', weekday: 'short' }).format(date);
</script>
<style scoped>
.calendar-modal { box-sizing: border-box; width: min(1400px, 96vw); max-width: 96vw; height: fit-content; max-height: 85vh; max-height: 85dvh; padding: 0; border: 1px solid #ebe7f0; border-radius: 20px; background: #fff; color: #343040; box-shadow: 0 24px 80px #26203626; overflow: hidden; }
.calendar-modal[open] { display: flex; flex-direction: column; }.calendar-modal::backdrop { background: #27213355; backdrop-filter: blur(4px); }
.calendar-header { display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-bottom: 1px solid #efedf3; flex-shrink: 0; }.header-left,.header-right { display: flex; align-items: center; gap: 16px; }.header-left h3 { font-size: 18px; font-weight: 650; margin: 0; white-space: nowrap; }.calendar-context { display: flex; flex-direction: column; gap: 4px; }.month-label { font-size: 13px; font-weight: 550; }.timezone-label { font-size: 10px; color: #8c8596; }
button { font: inherit; cursor: pointer; color: #71677e; border: none; background: transparent; border-radius: 7px; }button:focus-visible { outline: 2px solid #9876bc; outline-offset: 2px; }button:hover { background: #eee9f5; }.view-switch,.nav-group { display: flex; align-items: center; padding: 3px; background: #f6f4f8; border-radius: 9px; gap: 2px; }.view-switch button { min-width: 32px; height: 28px; font-size: 12px; }.view-switch [aria-pressed="true"] { background: white; color: #765594; box-shadow: 0 1px 5px #39264e12; }.nav-group button { width: 28px; height: 28px; font-size: 22px; }.today-btn { font-size: 12px; padding: 8px 12px; border: 1px solid #ebe5f0; }.close-btn { width: 32px; height: 32px; font-size: 14px; background: #f6f4f8; }
.calendar-scroll { min-height: 0; overflow: auto; overscroll-behavior: contain; }.calendar-grid-view { display: grid; grid-template-columns: repeat(7, minmax(155px, 1fr)); padding: 12px; gap: 6px; }.day-column { min-width: 0; border-radius: 10px; background: linear-gradient(#faf9fc, #faf9fc88); border: 1px solid transparent; }.day-header { display: flex; flex-direction: column; gap: 4px; align-items: center; padding: 10px 6px; height: 72px; box-sizing: border-box; }.day-name { font-size: 11px; color: #82778e; }.day-circle { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; font-size: 15px; font-weight: 600; }.today-label { display: none; }.day-body { display: flex; flex-direction: column; gap: 8px; padding: 0 6px 10px; }.is-today { background: #f5f1fc; border-color: #e4daf2; box-shadow: inset 0 0 0 1px #f8f5fc; }.is-today .day-circle { background: #8a6bad; color: white; box-shadow: 0 3px 8px #8a6bad20; }.is-today .day-name { color: #79579c; }.is-past .day-header { color: #96909e; }.is-past :deep(.mini-title) { color: #807987; }.is-past :deep(.mini-poster) { opacity: .75; }.is-past :deep(.entry-state) { background: #f2f4f3; color: #78877d; }.empty-day { color: #cec8d6; text-align: center; font-size: 12px; padding: 16px 0; }.calendar-footer { margin: 0; padding: 10px 24px 14px; font-size: 11px; color: #918998; flex-shrink: 0; }
.month-weekday { text-align: center; padding: 5px; font-size: 11px; color: #8c8297; }.month-view .day-header { height: 40px; flex-direction: row; padding: 6px 10px; }.month-view .day-circle { width: 25px; height: 25px; font-size: 12px; }.month-view .today-label { display: inline; font-size: 10px; color: #8a6bad; }.month-view .outside-month { background: #fcfbfd; }.outside-month .day-circle { color: #b5adbd; }.expand-day { padding: 7px; font-size: 11px; color: #816598; }.mobile-agenda-view { display: none; }
@media (max-width: 768px) { .calendar-modal { width: calc(100vw - 20px); max-width: none; border-radius: 18px; }.calendar-header { padding: 16px; flex-wrap: wrap; gap: 14px; }.header-left { width: 100%; justify-content: space-between; padding-right: 32px; }.header-left h3 { font-size: 17px; }.calendar-context { text-align: right; }.header-right { width: 100%; gap: 10px; justify-content: space-between; }.close-btn { position: absolute; top: 18px; right: 10px; }.nav-group button,.view-switch button { min-width: 38px; height: 34px; }.calendar-grid-view { display: none; }.mobile-agenda-view { display: flex; flex-direction: column; gap: 12px; padding: 12px; }.agenda-day { display: flex; flex-direction: column; gap: 8px; border: 1px solid transparent; padding: 10px; border-radius: 12px; }.agenda-day.is-today { border-color: #e4daf2; }.agenda-day-header { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #95889e; padding: 2px 0 4px; }.agenda-day-header strong { font-size: 13px; color: #6f637d; }.agenda-day-empty { color: #a198aa; text-align: center; font-size: 12px; margin: 10px; }.calendar-footer { padding: 8px 20px 14px; font-size: 10px; } }
</style>
