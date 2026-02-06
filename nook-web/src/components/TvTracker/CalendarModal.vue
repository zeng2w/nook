<template>
  <Transition name="fade">
    <div v-if="visible" class="modal-overlay glass-background" @click.self="close">
      <div class="glass-calendar-card compact-mode">
        
        <div class="glass-header">
          <div class="header-left">
            <h3>追剧日历</h3>
            <span class="month-label">{{ monthTitle }}</span>
          </div>
          <div class="header-right">
            <button class="nav-btn today-btn" @click="resetToToday">今天</button>
            <div class="nav-group">
              <button class="nav-btn arrow" @click="changeWeek(-1)">❮</button>
              <button class="nav-btn arrow" @click="changeWeek(1)">❯</button>
            </div>
            <button class="close-glass-btn" @click="close">✕</button>
          </div>
        </div>
        
        <div class="calendar-grid-view">
          <div 
            v-for="(offset, idx) in 7" 
            :key="idx" 
            class="day-column" 
            :class="{ 'is-today': isDateToday(getCalendarDate(idx)) }"
            ref="dayColumns"
          >
            <div class="day-header">
              <span class="day-name">{{ weekDaysAbbr[getCalendarDate(idx).getDay()] }}</span>
              <div class="day-circle">{{ getCalendarDate(idx).getDate() }}</div>
            </div>
            
            <div class="day-body">
              <div v-for="(item, k) in getShowsForDate(getCalendarDate(idx))" :key="`${item.show._id}-${k}`" class="mini-item-card">
                <div class="mini-poster">
                  <img v-if="item.show.posterUrl" :src="item.show.posterUrl" loading="lazy"/>
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
              
              <div v-if="getShowsForDate(getCalendarDate(idx)).length === 0" class="empty-line"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';

const props = defineProps({
  visible: Boolean,
  shows: Array
});
const emit = defineEmits(['update:visible']);

const calendarStart = ref(new Date());
const weekDaysAbbr = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const dayColumns = ref([]);

const initCalendar = () => {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day;
  const sunday = new Date(d.setDate(diff));
  sunday.setHours(12,0,0,0);
  calendarStart.value = sunday;
};

const scrollToToday = () => {
  nextTick(() => {
    const todayEl = dayColumns.value.find(el => el.classList.contains('is-today'));
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
const changeWeek = (offset) => {
  const d = new Date(calendarStart.value);
  d.setDate(d.getDate() + (offset * 7));
  calendarStart.value = d;
};

const monthTitle = computed(() => {
  return new Date(calendarStart.value).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
});

const getCalendarDate = (offsetIndex) => {
  const d = new Date(calendarStart.value);
  d.setDate(d.getDate() + offsetIndex);
  return d;
};

const isDateToday = (dateObj) => {
  const today = new Date();
  return dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear();
};

const getEpisodeTextForDate = (show, targetDate) => {
  if (!show.lastAirDate) return `${show.airedEpisodes}集`;
  
  const lastUpdate = new Date(show.lastAirDate);
  lastUpdate.setHours(12,0,0,0);
  const target = new Date(targetDate);
  target.setHours(12,0,0,0);
  
  const diffTime = target.getTime() - lastUpdate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  let cycleOffset = 0;
  if (show.updateFrequency === 'daily') {
    cycleOffset = diffDays;
  } else if (show.updateFrequency === 'weekly') {
    cycleOffset = Math.floor(diffDays / 7);
    if (diffDays % 7 === 0) cycleOffset = diffDays / 7;
  }
  
  const updateCount = show.updateCount || 1;
  const endEpisode = show.airedEpisodes + (cycleOffset * updateCount);
  let startEpisode = endEpisode - updateCount + 1;
  
  if (endEpisode <= 0) return '待定';
  if (show.totalEpisodes && startEpisode > show.totalEpisodes) return '完结';
  if (startEpisode < 1) startEpisode = 1;
  
  const displayEnd = show.totalEpisodes ? Math.min(endEpisode, show.totalEpisodes) : endEpisode;
  
  if (updateCount === 1 || startEpisode === displayEnd) {
    return `Ep ${displayEnd}`;
  } else {
    return `${startEpisode}-${displayEnd}`;
  }
};

const getShowsForDate = (dateObj) => {
  const dayIndex = dateObj.getDay();
  const time = dateObj.getTime();
  const results = [];
  
  props.shows.forEach(s => {
    if (s.status === 'dropped' || s.status === 'watched' || s.updateFrequency === 'ended') return;
    if (s.estimatedFinishDate) {
      if (time > new Date(s.estimatedFinishDate).getTime()) return;
    }
    
    let isAirDay = false;
    if (s.updateFrequency === 'daily') isAirDay = true;
    else if (s.updateDays && s.updateDays.includes(dayIndex)) isAirDay = true;
    
    if (isAirDay) {
      const epText = getEpisodeTextForDate(s, dateObj);
      if (epText !== '待定' && epText !== '完结') {
        results.push({ show: s, episodeText: epText });
      }
    }
  });
  return results;
};
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
.header-left { display: flex; align-items: baseline; gap: 10px; }
.header-left h3 { margin: 0; font-size: 1.2rem; font-weight: 800; letter-spacing: -0.5px; }
.month-label { color: #86868b; font-size: 0.85rem; font-weight: 500; }

.header-right { display: flex; align-items: center; gap: 12px; }
.nav-group { display: flex; gap: 4px; background: #f2f2f7; padding: 2px; border-radius: 8px; }
.nav-btn { background: transparent; border: none; width: 28px; height: 28px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; color: #555; transition: 0.2s; }
.nav-btn:hover { background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
.nav-btn.today-btn { width: auto; padding: 0 12px; background: #f2f2f7; font-weight: 600; font-size: 0.8rem; height: 32px; border-radius: 8px; color: #007aff; }
.nav-btn.today-btn:hover { background: #e0e0e0; }
.close-glass-btn { background: #f2f2f7; width: 32px; height: 32px; border-radius: 50%; border: none; font-size: 1rem; cursor: pointer; color: #666; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
.close-glass-btn:hover { background: #e5e5ea; color: #000; }

/* ★ 关键修改：更窄的列宽 (135px) */
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
  min-width: 120px; /* 确保不被压缩 */
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
  cursor: pointer; transition: all 0.2s; 
  overflow: hidden; 
}
.mini-item-card:hover { transform: translateX(2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-color: rgba(0,0,0,0.08); }

.mini-poster { width: 32px; height: 48px; border-radius: 6px; overflow: hidden; background: #f1f5f9; flex-shrink: 0; z-index: 2; }
.mini-poster img { width: 100%; height: 100%; object-fit: cover; }
.mini-poster span { display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; font-size: 0.9rem; color: #ccc; font-weight: 700; }

.mini-info { flex: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden; gap: 2px; }

/* 弹幕效果容器 */
.marquee-box {
  width: 100%;
  overflow: hidden;
  white-space: nowrap;
  mask-image: linear-gradient(to right, black 85%, transparent); 
}

/* 滚动文字 */
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
  .day-column { min-width: 135px; }
}
</style>