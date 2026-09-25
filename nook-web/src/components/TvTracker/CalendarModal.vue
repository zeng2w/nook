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
              <div
                v-for="(item, k) in day.items"
                :key="`${item.show._id}-${k}`"
                class="mini-item-card"
                :title="`${item.show.title} · ${getEntryTitle(item)}`"
              >
                <div class="mini-card-main">
                  <div class="mini-poster">
                    <img v-if="item.show.posterUrl" :src="item.show.posterUrl" :alt="item.show.title" loading="lazy" decoding="async"/>
                    <span v-else>{{ item.show.title.charAt(0) }}</span>
                  </div>
                  <span class="mini-title">{{ item.show.title }}</span>
                </div>
                <div class="mini-row-bot">
                  <span class="entry-state" :class="item.entryType">{{ item.statusText }}</span>
                  <span class="mini-ep" :class="item.entryType">{{ item.episodeText }}</span>
                </div>
              </div>
              
              <div v-if="day.items.length === 0" class="empty-line"></div>
            </div>
          </div>
        </div>

        <div class="mobile-agenda-view">
          <div v-if="mobileAgendaDays.length === 0" class="mobile-agenda-empty">
            这一周暂时没有更新安排
          </div>
          <template v-else>
          <section
            v-for="day in mobileAgendaDays"
            :key="`agenda-${day.key}`"
            class="agenda-day"
          >
            <div class="agenda-day-header">
              <div>
                <strong>{{ formatAgendaDate(day.date) }}</strong>
                <span v-if="isSameCalendarDay(day.date, new Date())" class="today-tag">今天</span>
              </div>
              <span>{{ day.items.length }} 部更新</span>
            </div>

            <div v-if="day.items.length" class="agenda-items">
              <div v-for="(item, k) in day.items" :key="`agenda-${item.show._id}-${k}`" class="agenda-item-card">
                <div class="agenda-poster">
                  <img v-if="item.show.posterUrl" :src="item.show.posterUrl" :alt="item.show.title" loading="lazy" decoding="async" />
                  <span v-else>{{ item.show.title.charAt(0) }}</span>
                </div>
                <div class="agenda-info">
                  <strong>{{ item.show.title }}</strong>
                  <div class="agenda-episode-row" :title="getEntryTitle(item)">
                    <span class="entry-state" :class="item.entryType">{{ item.statusText }}</span>
                    <span class="agenda-episode" :class="item.entryType">{{ item.episodeText }}</span>
                  </div>
                </div>
              </div>
            </div>
            <p v-else class="agenda-day-empty">今天暂无更新</p>
          </section>
          </template>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue';
import {
  getCalendarEpisodeEntry,
  getCurrentTimeZoneLabel,
  isSameCalendarDay,
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
    const entry = getCalendarEpisodeEntry(s, dateObj);
    if (entry) results.push({
      show: s,
      episodeText: entry.episodeText,
      entryType: entry.type,
      statusText: entry.statusText,
      confirmedAt: entry.confirmedAt
    });
  });
  return results;
};

const getEntryTitle = item => {
  if (item.entryType === 'scheduled') return 'TMDB 已提供明确播出日期';
  if (item.entryType === 'estimated') return '根据更新频率和当前集数推测';
  if (!item.confirmedAt) return '当前已确认的实际进度';
  const confirmedDate = toLocalCalendarDate(item.confirmedAt);
  return confirmedDate
    ? `实际进度确认于 ${confirmedDate.toLocaleDateString('zh-CN')}`
    : '当前已确认的实际进度';
};

const calendarDays = computed(() => Array.from({ length: 7 }, (_, index) => {
  const date = getCalendarDate(index);
  return {
    date,
    items: getShowsForDate(date),
    key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
  };
}));
const mobileAgendaDays = computed(() => calendarDays.value.filter(day => (
  day.items.length > 0 || isSameCalendarDay(day.date, new Date())
)));
const formatAgendaDate = date => new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric',
  day: 'numeric',
  weekday: 'short'
}).format(date);
</script>

<style scoped>
.modal-overlay.glass-background { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(4px); }

/* Compact Mode 容器 */
.glass-calendar-card.compact-mode {
  background: rgba(255, 255, 255, 0.96); 
  backdrop-filter: blur(20px) saturate(180%); 
  width: min(1400px, 95vw);
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
  grid-template-columns: repeat(7, minmax(150px, 1fr));
  flex: 1; 
  overflow-y: auto; 
  overflow-x: auto; 
  min-width: 0; 
}
.mobile-agenda-view { display: none; }

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
  display: flex; flex-direction: column; gap: 5px;
  padding: 6px; 
  border-radius: 10px; 
  background: #fff; 
  border: 1px solid rgba(0,0,0,0.03); 
  box-shadow: 0 2px 5px rgba(0,0,0,0.02); 
  /* 纯展示模式 */
  cursor: default; 
  transition: all 0.2s; 
  min-width: 0;
}
.mini-item-card:hover { transform: translateX(2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.08); }

.mini-card-main { display: flex; align-items: center; gap: 7px; min-width: 0; }

.mini-poster { width: 32px; height: 48px; border-radius: 6px; overflow: hidden; background: #f1f5f9; flex-shrink: 0; z-index: 2; }
.mini-poster img { width: 100%; height: 100%; object-fit: cover; }
.mini-poster span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 0.9rem; color: #ccc; font-weight: 700; }

.mini-title { 
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  font-size: 0.8rem; 
  line-height: 1.35;
  font-weight: 650;
  color: #333; 
}

.mini-row-bot { display: flex; align-items: center; gap: 4px; width: 100%; min-width: 0; }
.entry-state { padding: 1px 4px; border-radius: 4px; font-size: 0.58rem; font-weight: 750; line-height: 1.35; white-space: nowrap; }
.entry-state.confirmed { color: #047857; background: #d1fae5; }
.entry-state.scheduled { color: #1d4ed8; background: #dbeafe; }
.entry-state.estimated { color: #7c3aed; background: #ede9fe; border: 1px dashed #c4b5fd; }
.mini-ep { min-width: 0; font-size: 0.68rem; padding: 1px 4px; border-radius: 4px; font-weight: 700; white-space: nowrap; }
.mini-ep.confirmed { color: #047857; background: rgba(16,185,129,0.08); }
.mini-ep.scheduled { color: #2563eb; background: rgba(37,99,235,0.08); }
.mini-ep.estimated { color: #7c3aed; background: rgba(124,58,237,0.07); }

.empty-line { height: 100%; min-height: 50px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 1100px) and (min-width: 769px) {
  .calendar-grid-view { grid-template-columns: repeat(7, minmax(120px, 1fr)); }
}

@media (max-width: 768px) {
  .glass-calendar-card.compact-mode { width: 100vw; height: min(82dvh, 720px); max-height: 82dvh; border-radius: 20px 20px 0 0; position: absolute; bottom: 0; max-width: none; }
  .glass-header { padding: 10px 12px; gap: 8px; }
  .header-left { min-width: 0; gap: 8px; }
  .header-left h3 { font-size: 1rem; white-space: nowrap; }
  .timezone-label { max-width: 100px; }
  .header-right { gap: 6px; }
  .nav-btn.today-btn { padding: 0 8px; }
  .calendar-grid-view { display: none; }
  .mobile-agenda-view { display: flex; flex: 1; min-height: 0; flex-direction: column; gap: 14px; overflow-y: auto; padding: 14px 12px max(18px, env(safe-area-inset-bottom)); background: #f8fafc; }
  .mobile-agenda-empty { margin: auto; color: #94a3b8; font-size: 0.9rem; }
  .agenda-day { display: flex; flex-direction: column; gap: 8px; }
  .agenda-day-header { display: flex; align-items: center; justify-content: space-between; color: #94a3b8; font-size: 0.75rem; }
  .agenda-day-header > div { display: flex; align-items: center; gap: 7px; }
  .agenda-day-header strong { color: #334155; font-size: 0.92rem; }
  .today-tag { padding: 2px 6px; border-radius: 999px; background: #dbeafe; color: #2563eb; font-size: 0.65rem; font-weight: 700; }
  .agenda-items { display: flex; flex-direction: column; gap: 8px; }
  .agenda-item-card { display: flex; align-items: center; gap: 12px; padding: 10px; border: 1px solid #e2e8f0; border-radius: 14px; background: #fff; box-shadow: 0 3px 12px rgba(15,23,42,0.04); }
  .agenda-poster { width: 42px; height: 60px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: #e2e8f0; display: flex; align-items: center; justify-content: center; color: #64748b; font-weight: 700; }
  .agenda-poster img { width: 100%; height: 100%; object-fit: cover; }
  .agenda-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .agenda-info strong { color: #1e293b; font-size: 0.92rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .agenda-episode-row { display: flex; align-items: center; gap: 5px; }
  .agenda-info .entry-state { align-self: center; padding: 2px 6px; }
  .agenda-info .agenda-episode { align-self: flex-start; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; }
  .agenda-episode.confirmed { background: #ecfdf5; color: #047857; }
  .agenda-episode.scheduled { background: #eff6ff; color: #2563eb; }
  .agenda-episode.estimated { background: #f5f3ff; color: #7c3aed; }
  .agenda-day-empty { margin: 0; padding: 14px; border-radius: 12px; background: #fff; color: #94a3b8; text-align: center; font-size: 0.8rem; }
}
</style>
