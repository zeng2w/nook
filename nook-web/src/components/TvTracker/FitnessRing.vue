<template>
  <div class="ring-container">
    <svg :width="size" :height="size" class="fitness-svg">
      <circle 
        class="ring-bg" 
        :r="radius1" :cx="center" :cy="center" 
        :stroke-width="strokeWidth" 
      />
      <circle 
        class="ring-val ring-purple" 
        :r="radius1" :cx="center" :cy="center" 
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference1"
        :stroke-dashoffset="getOffset(circumference1, airedPercent)"
      />

      <circle 
        class="ring-bg" 
        :r="radius2" :cx="center" :cy="center" 
        :stroke-width="strokeWidth" 
      />
      <circle 
        class="ring-val ring-blue" 
        :r="radius2" :cx="center" :cy="center" 
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference2"
        :stroke-dashoffset="getOffset(circumference2, watchedTotalPercent)"
      />

      <circle 
        class="ring-bg" 
        :r="radius3" :cx="center" :cy="center" 
        :stroke-width="strokeWidth" 
      />
      <circle 
        class="ring-val ring-green" 
        :r="radius3" :cx="center" :cy="center" 
        :stroke-width="strokeWidth"
        :stroke-dasharray="circumference3"
        :stroke-dashoffset="getOffset(circumference3, watchedAiredPercent)"
      />
    </svg>
    
    <div class="ring-content">
      <span class="big-num">{{ watched }}</span>
      <span class="small-num">/ {{ total > 0 ? total : '?' }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  watched: { type: Number, default: 0 }, // 已看
  aired: { type: Number, default: 0 },   // 已更新
  total: { type: Number, default: 0 },   // 总集数
  size: { type: Number, default: 120 }   // 整体大小
});

// 配置参数
const center = props.size / 2;
const strokeWidth = 8;
const gap = 4; // 圆环之间的间距

// 半径计算 (从外向内)
const radius1 = (props.size / 2) - (strokeWidth / 2); 
const radius2 = radius1 - strokeWidth - gap;
const radius3 = radius2 - strokeWidth - gap;

// 周长计算 (2 * PI * r)
const circumference1 = 2 * Math.PI * radius1;
const circumference2 = 2 * Math.PI * radius2;
const circumference3 = 2 * Math.PI * radius3;

// 百分比计算
const airedPercent = computed(() => {
  if (!props.total) return 0;
  return Math.min(1, props.aired / props.total);
});

const watchedTotalPercent = computed(() => {
  if (!props.total) return 0;
  return Math.min(1, props.watched / props.total);
});

const watchedAiredPercent = computed(() => {
  if (!props.aired) return 0;
  return Math.min(1, props.watched / props.aired);
});

// 计算 Stroke Offset (核心动画原理)
const getOffset = (circumference, percent) => {
  return circumference - (percent * circumference);
};
</script>

<style scoped>
.ring-container {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}

.fitness-svg {
  transform: rotate(-90deg); /* 让进度从 12 点钟方向开始 */
}

circle {
  fill: none;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.6s ease-out;
}

/* 背景轨道颜色 (浅色) */
.ring-bg { stroke: rgba(0,0,0, 0.05); }

/* 进度条颜色 */
.ring-purple { stroke: #9c27b0; } /* 更新进度 */
.ring-blue   { stroke: #2196f3; } /* 观看进度 */
.ring-green  { stroke: #4caf50; } /* 追剧进度 */

/* 中心文字样式 */
.ring-content {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}
.big-num { font-size: 1.8rem; font-weight: 800; color: #333; }
.small-num { font-size: 0.8rem; color: #999; margin-top: 2px; font-weight: 600; }
</style>