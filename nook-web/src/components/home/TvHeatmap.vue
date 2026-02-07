<template>
  <div class="heatmap-container">
    <div class="heatmap-scroll-container">
      <div class="heatmap-inner">
        
        <div class="months-row">
          <div 
            v-for="(week, index) in calendarData" 
            :key="index" 
            class="month-col-placeholder"
          >
            <span v-if="getMonthLabelForWeek(week)" class="month-text">
              {{ getMonthLabelForWeek(week) }}
            </span>
          </div>
        </div>

        <div class="heatmap-body">
          <div class="week-labels">
            <div class="w-label"></div>
            <div class="w-label">Mon</div>
            <div class="w-label"></div>
            <div class="w-label">Wed</div>
            <div class="w-label"></div>
            <div class="w-label">Fri</div>
            <div class="w-label"></div>
          </div>

          <div class="days-grid">
            <div v-for="(week, wIdx) in calendarData" :key="wIdx" class="week-col">
              <div 
                v-for="day in week" 
                :key="day.dateStr"
                class="day-cell"
                :class="getLevelClass(day.count)"
                :data-tooltip="formatTooltip(day)"
                :aria-label="formatTooltip(day)"
              ></div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  activities: { type: Object, default: () => ({}) }
});

const calendarData = computed(() => {
  const weeks = [];
  const today = new Date();
  const endDate = today;
  
  let currentDate = new Date(endDate);
  currentDate.setDate(currentDate.getDate() - 364); 

  const dayOfWeek = currentDate.getDay(); 
  currentDate.setDate(currentDate.getDate() - dayOfWeek);

  while (currentDate <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = currentDate.toLocaleDateString('en-CA'); 
      const count = props.activities[dateStr] || 0;
      week.push({ dateStr, count });
      currentDate.setDate(currentDate.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
});

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const getMonthLabelForWeek = (week) => {
  const firstDayObj = week.find(day => {
    const parts = day.dateStr.split('-');
    const dayNum = parseInt(parts[2], 10);
    return dayNum === 1;
  });

  if (firstDayObj) {
    const parts = firstDayObj.dateStr.split('-');
    const monthIndex = parseInt(parts[1], 10) - 1;
    return monthNames[monthIndex];
  }
  return null;
};

const getLevelClass = (count) => {
  if (count === 0) return 'l-0';
  if (count <= 3) return 'l-1';
  if (count <= 9) return 'l-2';
  if (count <= 15) return 'l-3';
  return 'l-4';
};

const formatTooltip = (day) => {
  if (day.count === 0) return `${day.dateStr} 无记录`;
  return `${day.dateStr} 观看了 ${day.count} 集`;
};
</script>

<style scoped>
.heatmap-container {
  width: 100%;
  /* 可以根据需要添加一点顶部间距，或者由父组件控制 */
  /* margin-top: 10px; */
}

/* ★★★ 核心修改：删除了所有与 header 相关的样式 ★★★ */
/* .heatmap-header, .header-left, .icon-bg, h3, .legend, .legend-text, .level 全部移除 */

/* 保留颜色定义，因为格子(.day-cell)还需要用到 */
.l-0 { background-color: #ebedf0; } 
.l-1 { background-color: #bfdbfe; } 
.l-2 { background-color: #60a5fa; } 
.l-3 { background-color: #3b82f6; } 
.l-4 { background-color: #1e40af; } 

.heatmap-scroll-container { overflow-x: auto; padding-bottom: 4px; }
.heatmap-scroll-container::-webkit-scrollbar { height: 4px; }
.heatmap-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.heatmap-inner { position: relative; min-width: max-content; }

/* 月份行 */
.months-row {
  display: flex;
  gap: 3px; 
  margin-left: 34px; 
  height: 16px;
  margin-bottom: 6px;
}

.month-col-placeholder { width: 11px; flex-shrink: 0; position: relative; }
.month-text {
  position: absolute; left: 0; top: 0;
  font-size: 0.7rem; color: #64748b; font-weight: 500; white-space: nowrap;
}

.heatmap-body { display: flex; gap: 4px; }

.week-labels {
  display: flex; flex-direction: column; justify-content: space-between;
  padding-top: 2px; padding-right: 0; margin-bottom: 3px;
  width: 30px; flex-shrink: 0;
}
.w-label { height: 11px; font-size: 0.65rem; line-height: 11px; color: #94a3b8; font-weight: 500; }

.days-grid { display: flex; gap: 3px; }
.week-col { display: flex; flex-direction: column; gap: 3px; }

.day-cell {
  width: 11px; height: 11px; border-radius: 2px;
  transition: transform 0.1s; cursor: pointer;
  position: relative;
}
.day-cell.l-0 { background-color: #ebedf0; }
.day-cell:hover { transform: scale(1.4); border: 1px solid rgba(0,0,0,0.2); z-index: 10; }

/* Tooltip 样式 */
.day-cell[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -8px);
  background-color: #1e293b; color: #fff; font-size: 0.75rem; font-weight: 500; white-space: nowrap;
  padding: 6px 10px; border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 1000; pointer-events: none;
  opacity: 0; animation: tooltip-fade-in 0.15s forwards;
}

.day-cell[data-tooltip]:hover::before {
  content: ''; position: absolute; bottom: 100%; left: 50%; transform: translate(-50%, -4px);
  border-width: 4px; border-style: solid; border-color: #1e293b transparent transparent transparent;
  z-index: 1000; opacity: 0; animation: tooltip-fade-in 0.15s forwards;
}

@keyframes tooltip-fade-in {
  from { opacity: 0; transform: translate(-50%, -4px); }
  to   { opacity: 1; transform: translate(-50%, -8px); }
}
</style>