<template>
  <div class="update-calendar-widget">
    <div class="calendar-header">
      <div class="title-group">
        <h3 class="title">更新日历</h3>
        <span class="timezone-label" :title="timeZoneLabel">{{ timeZoneLabel }}</span>
      </div>
      <button type="button" class="more-link" aria-label="打开完整追剧日历" @click="$emit('open-calendar')">
        更多 <span class="arrow">&gt;</span>
      </button>
    </div>

    <div class="week-selector">
      <button
        v-for="(day, index) in weekDays" 
        :key="index"
        type="button"
        class="day-item"
        :class="{ active: isSameCalendarDay(day.date, selectedDate) }"
        :aria-pressed="isSameCalendarDay(day.date, selectedDate)"
        :aria-label="`${day.label} ${day.date.getMonth() + 1}月${day.date.getDate()}日`"
        @click="selectDate(day.date)"
      >
        <span class="day-label">{{ day.label }}</span>
        <span class="day-number">{{ day.date.getDate() }}</span>
      </button>
    </div>

    <div class="update-summary">
      {{ getSummaryText() }}更新 <span class="highlight-count">{{ showsList.length }}</span> 部剧集
    </div>

    <div class="shows-list-scroll-area">
      <div v-if="showsList.length === 0" class="empty-state">当日暂无剧集更新</div>
      
      <div v-else v-for="show in showsList" :key="show._id" class="show-item">
        <img :src="show.posterUrl || show.poster_path" :alt="show.title || show.name" class="show-cover" loading="lazy" decoding="async" />
        
        <div class="show-info">
          <h4 class="show-title">{{ show.title || show.name }}</h4>
          <span class="show-episode">{{ show.calculatedEpisodeText }}</span>
        </div>
        
        <div class="platform-info" v-if="show.network">
          <img v-if="show.networkLogo" :src="show.networkLogo" class="platform-logo-img" alt="Network" loading="lazy" decoding="async" />
          
          <span v-else class="platform-icon-fallback" :class="getNetworkClass(show.network)">
            {{ show.network.charAt(0).toUpperCase() }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import {
  calculateEpisodeForDate,
  getCurrentTimeZoneLabel,
  isAfterCalendarDay,
  isSameCalendarDay,
  isShowUpdateDay,
  toLocalCalendarDate
} from '@/utils/dateUtils';

const props = defineProps({
  shows: { type: Array, default: () => [] }
});
defineEmits(['open-calendar']);

const selectedDate = ref(toLocalCalendarDate(new Date()));
const dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
const timeZoneLabel = getCurrentTimeZoneLabel();

const weekDays = computed(() => {
  const days = [];
  const curr = toLocalCalendarDate(new Date());
  let dayOfWeek = curr.getDay();
  dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek; 
  
  const monday = new Date(curr);
  monday.setDate(curr.getDate() - dayOfWeek + 1);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push({ label: dayLabels[i], date: d });
  }
  return days;
});

const selectDate = (date) => {
  if (!isSameCalendarDay(selectedDate.value, date)) {
    selectedDate.value = toLocalCalendarDate(date);
  }
};

const getSummaryText = () => {
  if (isSameCalendarDay(selectedDate.value, new Date())) return '今天将';
  
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (isSameCalendarDay(selectedDate.value, tomorrow)) return '明天将';

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameCalendarDay(selectedDate.value, yesterday)) return '昨天已';

  const dayIndex = selectedDate.value.getDay();
  return `周${dayLabels[dayIndex === 0 ? 6 : dayIndex - 1]}将`;
};

const getNetworkClass = (network) => {
  const net = network.toLowerCase();
  if (net.includes('tencent') || net.includes('腾讯')) return 'tencent';
  if (net.includes('youku') || net.includes('优酷')) return 'youku';
  if (net.includes('iqiyi') || net.includes('爱奇艺')) return 'iqiyi';
  if (net.includes('bilibili') || net.includes('b站')) return 'bilibili';
  if (net.includes('netflix')) return 'netflix';
  return 'default';
};

const showsList = computed(() => {
  const targetDate = selectedDate.value;
  const results = [];

  props.shows.forEach(s => {
    if (s.status === 'dropped' || s.status === 'watched' || s.updateFrequency === 'ended') return;
    if (s.estimatedFinishDate && isAfterCalendarDay(targetDate, s.estimatedFinishDate)) return;

    if (isShowUpdateDay(s, targetDate)) {
      const epText = calculateEpisodeForDate(s, targetDate);
      if (epText !== '待定' && epText !== '完结') {
        results.push({ ...s, calculatedEpisodeText: epText });
      }
    }
  });
  
  return results;
});
</script>

<style scoped>
/* ★ 1. 调低整体高度并减小内边距 */
.update-calendar-widget {
  width: 100%; 
  height: 290px; /* ★ 高度从 380px 降到 290px */
  box-sizing: border-box; 
  background: #ffffff;
  border-radius: 20px; 
  padding: 16px; /* ★ 内边距减小，更加紧凑 */
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04); 
  border: 1px solid rgba(226, 232, 240, 0.8);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
}

/* ★ 2. 压缩头部和间距 */
.calendar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-shrink: 0; }
.title-group { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.title { font-size: 1rem; font-weight: 700; margin: 0; color: #1e293b; }
.timezone-label { max-width: 150px; color: #94a3b8; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.more-link { border: 0; padding: 4px; background: transparent; cursor: pointer; font-size: 12px; color: #6366f1; text-decoration: none; font-weight: 600; }
.more-link:hover { color: #4338ca; }

.week-selector { display: flex; justify-content: space-between; margin-bottom: 12px; flex-shrink: 0; }
.day-item { 
  display: flex; flex-direction: column; align-items: center; justify-content: center; 
  width: 30px; /* ★ 日期宽度缩小 */
  height: 44px; /* ★ 日期高度缩小 */
  border: 0; background: transparent; border-radius: 8px;
  cursor: pointer; transition: all 0.2s ease; 
}
.day-label { font-size: 11px; color: #94a3b8; margin-bottom: 2px; font-weight: 500; }
.day-number { font-size: 13px; font-weight: 700; color: #334155; }
.day-item.active { background-color: #6366F1; box-shadow: 0 4px 10px rgba(99, 102, 241, 0.3); transform: translateY(-2px); }
.day-item.active .day-label, .day-item.active .day-number { color: #ffffff; }
.day-item:hover:not(.active) { background-color: #f1f5f9; }

.update-summary { font-size: 12px; color: #64748b; margin-bottom: 8px; flex-shrink: 0; font-weight: 500; }
.highlight-count { font-weight: 700; color: #0f172a; }

/* ★ 3. 压缩列表项的海报和间距 */
.shows-list-scroll-area { flex: 1; display: flex; flex-direction: column; gap: 8px; overflow-y: auto; padding-right: 4px; }
.shows-list-scroll-area::-webkit-scrollbar { width: 4px; }
.shows-list-scroll-area::-webkit-scrollbar-track { background: transparent; }
.shows-list-scroll-area::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.shows-list-scroll-area::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

.empty-state { display: flex; justify-content: center; align-items: center; height: 100%; font-size: 13px; color: #94a3b8; }
.show-item { display: flex; align-items: center; padding: 2px 0; transition: transform 0.2s ease; cursor: default; }
.show-item:hover { transform: translateX(4px); }

.show-cover { width: 32px; height: 44px; border-radius: 6px; object-fit: cover; margin-right: 10px; background-color: #f1f5f9; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.06); flex-shrink: 0; }
.show-info { flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; gap: 2px; }
.show-title { font-size: 0.85rem; font-weight: 700; margin: 0; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.show-episode { font-size: 0.65rem; color: #6366F1; font-weight: 600; background: rgba(99, 102, 241, 0.08); padding: 2px 6px; border-radius: 4px; align-self: flex-start; }

.platform-info { margin-left: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.platform-logo-img { width: 18px; height: 18px; border-radius: 4px; object-fit: contain; }
.platform-icon-fallback { display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 5px; font-size: 10px; font-weight: 800; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.platform-icon-fallback.tencent { background: linear-gradient(135deg, #00C785, #00A66D); } 
.platform-icon-fallback.youku { background: linear-gradient(135deg, #00A1D6, #0084B4); } 
.platform-icon-fallback.iqiyi { background: linear-gradient(135deg, #00CC00, #009900); } 
.platform-icon-fallback.bilibili { background: linear-gradient(135deg, #FB7299, #E05C82); } 
.platform-icon-fallback.netflix { background: linear-gradient(135deg, #E50914, #B20710); } 
.platform-icon-fallback.default { background: linear-gradient(135deg, #94a3b8, #64748b); }
</style>
