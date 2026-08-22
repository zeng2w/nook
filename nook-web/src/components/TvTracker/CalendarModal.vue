<template>
  <Transition name="fade">
    <div v-if="visible" class="modal-overlay glass-background" @click.self="close">
      <div class="glass-calendar-card compact-mode" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title">
        
        <div class="glass-header">
          <div class="header-left">
            <h3 id="calendar-modal-title">追剧日历</h3>
            <div class="calendar-context">
              <span class="month-label">{{ monthTitle }}</span>
              <span class="timezone-label" :title="timeZoneLabel">{{ timeZoneLabel }}</span>
            </div>
          </div>
          <div class="header-right">
            <button class="nav-btn today-btn" @click="resetToToday">今天</button>
            <div class="nav-group">
              <button class="nav-btn arrow" aria-label="上一周" @click="changeWeek(-1)">❮</button>
              <button class="nav-btn arrow" aria-label="下一周" @click="changeWeek(1)">❯</button>
            </div>
            <button class="close-glass-btn" aria-label="关闭追剧日历" @click="close">✕</button>
          </div>
        </div>
        
        <div class="calendar-grid-view">
          <div 
            v-for="day in calendarDays"
            :key="day.key"
            class="day-column" 
            :class="{ 'is-today': isSameCalendarDay(day.date, new Date()) }"
            ref="dayColumns"
          >
            <div class="day-header">
              <span class="day-name">{{ weekDaysAbbr[day.date.getDay()] }}</span>
              <div class="day-circle">{{ day.date.getDate() }}</div>
            </div>
            
            <div class="day-body">
              <div v-for="(item, k) in day.items" :key="`${item.show._id}-${k}`" class="mini-item-card">
                <div class="mini-poster">
                  <img v-if="item.show.posterUrl" :src="item.show.posterUrl" :alt="item.show.title" loading="lazy" decoding="async"/>
                  <span v-else>{{ item.show.title.charAt(0) }}</span>
                </div>
                
                <div class="mini-info">
                  <div class="mini-row-top marquee-box">
                    <span class="mini-title">{{ item.show.title }}</span>
                  </div>
                  <div class="mini-row-bot">
                    <span class="mini-ep">{{ item.episodeText }}</span>
                  </div>
                </div>
              </div>
              
              <div v-if="day.items.length === 0" class="empty-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import {
  calculateEpisodeForDate,
  getCurrentTimeZoneLabel,
  isAfterCalendarDay,
  isSameCalendarDay,
  isShowUpdateDay,
  toLocalCalendarDate
} from '@/utils/dateUtils';

const props = defineProps({
  visible: Boolean,
  shows: { type: Array, default: () => [] }
});
const emit = defineEmits(['update:visible']);

const calendarStart = ref(toLocalCalendarDate(new Date()));
const weekDaysAbbr = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const dayColumns = ref([]);
const timeZoneLabel = ref(getCurrentTimeZoneLabel());

const initCalendar = () => {
  const d = toLocalCalendarDate(new Date());
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(12,0,0,0);
  calendarStart.value = sunday;
  timeZoneLabel.value = getCurrentTimeZoneLabel();
};

const scrollToToday = () => {
  nextTick(() => {
    // 增加了一个安全判断 el 是否存在
    const todayEl = dayColumns.value.find(el => el && el.classList.contains('is-today'));
    if (todayEl) {
      todayEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  });
};

const resetToToday = () => {
  initCalendar();
  scrollToToday();
};

watch(() => props.visible, (val) => { 
  if(val) {
    initCalendar();
    scrollToToday();
  }
});

const close = () => emit('update:visible', false);
const handleKeydown = event => {
  if (props.visible && event.key === 'Escape') close();
};
onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));

const changeWeek = (offset) => {
  const d = new Date(calendarStart.value);
  d.setDate(d.getDate() + (offset * 7));
  calendarStart.value = d;
};

const monthTitle = computed(() => {
  return new Date(calendarStart.value).toLocaleDateString('zh-CN', { month: 'long', year: 'numeric' });
});

const getCalendarDate = (offsetIndex) => {
  const d = new Date(calendarStart.value);
  d.setDate(d.getDate() + offsetIndex);
  return d;
};

const getShowsForDate = (dateObj) => {
  const results = [];
  
  props.shows.forEach(s => {
    // 过滤掉弃剧、已看完、或状态明确为已完结的
    if (s.status === 'dropped' || s.status === 'watched' || s.updateFrequency === 'ended') return;
    
    if (s.estimatedFinishDate && isAfterCalendarDay(dateObj, s.estimatedFinishDate)) return;
    
    if (isShowUpdateDay(s, dateObj)) {
      const epText = calculateEpisodeForDate(s, dateObj);
      if (epText !== '待定' && epText !== '完结') {
        results.push({ show: s, episodeText: epText });
      }
    }
  });
  return results;
};

const calendarDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = getCalendarDate(index);
  return {
    date,
    items: getShowsForDate(date),
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  };
}));
</script>

<style scoped>
.modal-overlay.glass-background { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); }

/* Compact Mode 容器 */
.glass-calendar-card.compact-mode {
  background: rgba(255, 255, 255, 0.96); 
  backdrop-filter: blur(20px) saturate(180%); 
  width: fit-content; 
  max-width: 95vw; 
  height: 60vh;
  max-height: 60vh; 
  min-height: 300px;
  border-radius: 20px; 
  box-shadow: 0 20px 50px rgba(0,0,0,0.2); 
  border: 1px solid rgba(255, 255, 255, 0.5); 
  display: flex; flex-direction: column; overflow: hidden; 
  color: #1d1d1f; 
}

/* Header */
.glass-header { padding: 12px 24px; border-bottom: 1px solid rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; background: rgba(255,255,255,0.5); }
.header-left { display: flex; align-items: center; gap: 10px; }
.header-left h3 { margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; }
.calendar-context { display: flex; flex-direction: column; gap: 1px; }
.month-label { color: #86868b; font-size: 0.85rem; font-weight: 500; }
.timezone-label { max-width: 160px; color: #9ca3af; font-size: 0.62rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.header-right { display: flex; align-items: center; gap: 12px; }
.nav-group { display: flex; gap: 4px; background: #f2f2f7; padding: 2px; border-radius: 8px; }
.nav-btn { background: transparent; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #555; transition: 0.2s; }
.nav-btn:hover { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.nav-btn.today-btn { width: auto; padding: 0 12px; background: #f2f2f7; font-weight: 600; font-size: 0.8rem; height: 32px; border-radius: 8px; color: #007aff; }
.nav-btn.today-btn:hover { background: #e0e0e0; }
.close-glass-btn { background: #f2f2f7; width: 32px; height: 32px; border-radius: 50%; border: none; font-size: 1rem; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.close-glass-btn:hover { background: #e5e5ea; color: #000; }

/* Grid 布局 */
.calendar-grid-view { 
  display: grid; 
  grid-template-columns: repeat(7, 120px); 
  flex: 1; 
  overflow-y: auto; 
  overflow-x: auto; 
  min-width: 0; 
}

/* Columns */
.day-column { 
  border-right: 1px solid rgba(0,0,0,0.04); 
  display: flex; flex-direction: column; 
  min-width: 120px;
}
.day-column:last-child { border-right: none; }
.day-column.is-today { background: rgba(0, 122, 255, 0.04); }

/* Day Header */
.day-header { padding: 10px 0; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; gap: 4px; position: sticky; top: 0; background: inherit; z-index: 1; backdrop-filter: blur(5px); }
.day-name { font-size: 0.65rem; font-weight: 700; color: #86868b; }
.day-circle { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1rem; font-weight: 600; color: #1d1d1f; transition: 0.3s; }
.is-today .day-circle { background: #007aff; color: white; box-shadow: 0 3px 8px rgba(0,122,255,0.3); }
.is-today .day-name { color: #007aff; }

/* Day Body */
.day-body { flex: 1; padding: 10px 6px; display: flex; flex-direction: column; gap: 8px; }

/* Mini Cards */
.mini-item-card { 
  display: flex; align-items: center; gap: 8px; 
  padding: 6px; 
  border-radius: 10px; 
  background: #fff; 
  border: 1px solid rgba(0,0,0,0.03); 
  box-shadow: 0 2px 5px rgba(0,0,0,0.02); 
  /* 纯展示模式 */
  cursor: default; 
  transition: all 0.2s; 
  overflow: hidden; 
}
.mini-item-card:hover { transform: translateX(2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.08); }

.mini-poster { width: 32px; height: 48px; border-radius: 6px; overflow: hidden; background: #f1f5f9; flex-shrink: 0; z-index: 2; }
.mini-poster img { width: 100%; height: 100%; object-fit: cover; }
.mini-poster span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 0.9rem; color: #ccc; font-weight: 700; }

.mini-info { flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; gap: 2px; }

/* 弹幕效果 */
.marquee-box {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  mask-image: linear-gradient(to right, black 85%, transparent); 
}

.mini-title { 
  display: inline-block;
  font-size: 0.8rem; 
  font-weight: 600; 
  color: #333; 
  transition: transform 0.2s;
}
.mini-item-card:hover .mini-title {
  animation: marquee-scroll 4s linear infinite;
}

@keyframes marquee-scroll {
  0% { transform: translateX(0); }
  30% { transform: translateX(0); } 
  100% { transform: translateX(-100%); }
}

.mini-ep { font-size: 0.7rem; color: #007aff; background: rgba(0,122,255,0.08); padding: 1px 6px; border-radius: 4px; align-self: flex-start; font-weight: 500; white-space: nowrap; }

.empty-line { height: 100%; min-height: 50px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .glass-calendar-card.compact-mode { width: 100vw; height: 60vh; border-radius: 20px 20px 0 0; position: absolute; bottom: 0; max-width: none; }
  .glass-header { padding: 10px 12px; gap: 8px; }
  .header-left { min-width: 0; gap: 8px; }
  .header-left h3 { font-size: 1rem; white-space: nowrap; }
  .timezone-label { max-width: 100px; }
  .header-right { gap: 6px; }
  .nav-btn.today-btn { padding: 0 8px; }
  /* 修复：移动端列宽与 Grid 一致 */
  .day-column { min-width: 120px; }
}
</style>
