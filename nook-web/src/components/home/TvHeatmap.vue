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
                :class="[getLevelClass(day.count), { 'out-of-range': !day.isVisible }]"
                :data-tooltip="day.isVisible ? formatTooltip(day) : null"
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
  activities: { type: Object, default: () => ({}) },
  // ★ 新增：接收父组件传来的模式 ('rolling' 或者是 具体的年份数字)
  yearMode: { type: [String, Number], default: 'rolling' }
});

const calendarData = computed(() => {
  const weeks = [];
  let startDate, endDate;

  // ★ 逻辑分支：决定计算起止日期
  if (props.yearMode === 'rolling') {
    // 模式 A：滚动最近 365 天
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    endDate = new Date(today);
    
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); 
  } else {
    // 模式 B：指定自然年 (例如 2024年 1月1日 到 12月31日)
    const targetYear = parseInt(props.yearMode, 10);
    startDate = new Date(targetYear, 0, 1);
    endDate = new Date(targetYear, 11, 31);
  }

  let currentDate = new Date(startDate);
  // 回退到当周的周日，保证第一列是一整个星期的格子
  currentDate.setDate(currentDate.getDate() - currentDate.getDay());

  // 只要还没画完结束日期，就继续补齐整周
  while (currentDate <= endDate) {
    const week = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = currentDate.toLocaleDateString('en-CA'); 
      const count = props.activities[dateStr] || 0;
      
      // 判断这个格子是否应该显示出来 (自然年模式下，跨年的那几天要隐藏)
      let isVisible = true;
      if (props.yearMode !== 'rolling') {
        isVisible = currentDate.getFullYear() === parseInt(props.yearMode, 10);
      }
      
      week.push({ 
        dateStr, 
        count,
        isVisible
      });
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
    // 只在包含每个月 1 号的这周顶部显示月份标识
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
.heatmap-container { width: 100%; }

.l-0 { background-color: #ebedf0; } 
.l-1 { background-color: #bfdbfe; } 
.l-2 { background-color: #60a5fa; } 
.l-3 { background-color: #3b82f6; } 
.l-4 { background-color: #1e40af; } 

.heatmap-scroll-container { overflow-x: auto; padding-top: 35px; padding-bottom: 4px; margin-top: -35px;}
.heatmap-scroll-container::-webkit-scrollbar { height: 4px; }
.heatmap-scroll-container::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
.heatmap-inner { position: relative; min-width: max-content; }

/* 月份行 */
.months-row { display: flex; gap: 3px; margin-left: 34px; height: 16px; margin-bottom: 6px; }
.month-col-placeholder { width: 11px; flex-shrink: 0; position: relative; }
.month-text { position: absolute; left: 0; top: 0; font-size: 0.7rem; color: #64748b; font-weight: 500; white-space: nowrap; }

.heatmap-body { display: flex; gap: 4px; }
.week-labels { display: flex; flex-direction: column; justify-content: space-between; padding-top: 2px; padding-right: 0; margin-bottom: 3px; width: 30px; flex-shrink: 0; }
.w-label { height: 11px; font-size: 0.65rem; line-height: 11px; color: #94a3b8; font-weight: 500; }

.days-grid { display: flex; gap: 3px; }
.week-col { display: flex; flex-direction: column; gap: 3px; }

.day-cell { width: 11px; height: 11px; border-radius: 2px; transition: transform 0.1s; cursor: pointer; position: relative; }
.day-cell.l-0 { background-color: #ebedf0; }
.day-cell:hover { transform: scale(1.4); border: 1px solid rgba(0,0,0,0.2); z-index: 10; }

/* ★ 新增：跨年的格子隐藏但占位，保证第一周的星期完全对齐 */
.day-cell.out-of-range {
  visibility: hidden;
  pointer-events: none;
}

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