<template>
  <div class="stats-overview">
    
    <div class="stat-card">
      <div class="card-top">
        <span class="card-label">正在追</span>
        <div class="icon-mini blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5l3 5 5-11 4 6h3"/></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ statusCounts.watching || 0 }}</span>
        <span class="unit">部</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="card-top">
        <span class="card-label">待补完</span>
        <div class="icon-mini purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ progressStats.lag || 0 }}</span>
        <span class="unit">集</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="card-top">
        <span class="card-label">累计观看</span>
        <div class="icon-mini green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ progressStats.watched || 0 }}</span>
        <span class="unit">集</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="card-top">
        <span class="card-label">总完成率</span>
      </div>
      <div class="card-main flex-row">
        <div class="chart-wrapper">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" :stroke-dasharray="`${progressStats.percent || 0}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
        </div>
        <span class="big-value">{{ progressStats.percent || 0 }}<span class="percent-sign">%</span></span>
      </div>
    </div>

  </div>
</template>

<script setup>
defineProps({
  statusCounts: Object,
  progressStats: Object
});
</script>

<style scoped>
.stats-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 强制4列 */
  gap: 20px;
  width: 100%;
}

.stat-card {
  background: #fff;
  border-radius: 16px;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 110px; /* 固定高度，确保对齐 */
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.02);
  border: 1px solid rgba(0,0,0,0.03);
  transition: transform 0.2s, box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.05);
}

.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-label { font-size: 0.85rem; font-weight: 600; color: #94a3b8; letter-spacing: 0.5px; }

.icon-mini { 
  width: 28px; height: 28px; border-radius: 8px; 
  display: flex; align-items: center; justify-content: center; 
}
.icon-mini.blue { background: #eff6ff; color: #3b82f6; }
.icon-mini.purple { background: #f3e8ff; color: #a855f7; }
.icon-mini.green { background: #ecfdf5; color: #10b981; }

.card-main { display: flex; align-items: baseline; gap: 4px; margin-top: auto; }
.card-main.flex-row { align-items: center; gap: 12px; }

/* ★ 视觉重心：超大数字 */
.big-value { font-size: 2.4rem; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -1px; }
.unit { font-size: 0.9rem; color: #cbd5e1; font-weight: 600; }
.percent-sign { font-size: 1.2rem; color: #cbd5e1; margin-left: 2px; }

/* 圆环图表 */
.chart-wrapper { width: 32px; height: 32px; }
.circular-chart { display: block; max-width: 100%; max-height: 100%; }
.circle-bg { fill: none; stroke: #f1f5f9; stroke-width: 4; }
.circle { fill: none; stroke: #3b82f6; stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 0.6s ease; }

@media (max-width: 1024px) {
  .stats-overview { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .stats-overview { grid-template-columns: 1fr; }
  .stat-card { height: auto; gap: 12px; }
}
</style>