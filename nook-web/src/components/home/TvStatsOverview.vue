<template>
  <div class="stats-overview">
    
    <div class="stat-card glass-card">
      <div class="card-top">
        <span class="card-label">正在追</span>
        <div class="icon-mini blue">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 12h5l3 5 5-11 4 6h3"/></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ statusCounts.watching || 0 }}</span>
        <span class="unit">部</span>
      </div>
    </div>

    <div class="stat-card glass-card">
      <div class="card-top">
        <span class="card-label">待补完</span>
        <div class="icon-mini purple">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ progressStats.lag || 0 }}</span>
        <span class="unit">集</span>
      </div>
    </div>

    <div class="stat-card glass-card">
      <div class="card-top">
        <span class="card-label">累计观看</span>
        <div class="icon-mini green">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
      </div>
      <div class="card-main">
        <span class="big-value">{{ progressStats.watched || 0 }}</span>
        <span class="unit">集</span>
      </div>
    </div>

    <div class="stat-card glass-card">
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
.stats-overview { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; width: 100%; }

/* 毛玻璃风格的独立卡片 */
.stat-card.glass-card {
  background: rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 24px;
  padding: 22px 28px;
  display: flex; flex-direction: column; justify-content: space-between;
  height: 125px; 
  box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.stat-card.glass-card:hover {
  transform: translateY(-6px);
  background: rgba(255, 255, 255, 0.75);
  box-shadow: 0 15px 50px -10px rgba(0, 0, 0, 0.1);
  border-color: rgba(255, 255, 255, 1);
}

.card-top { display: flex; justify-content: space-between; align-items: center; }
.card-label { font-size: 0.9rem; font-weight: 600; color: #64748b; letter-spacing: 0.5px; }

/* 图标也做半透明处理，更加通透 */
.icon-mini { 
  width: 32px; height: 32px; border-radius: 10px; 
  display: flex; align-items: center; justify-content: center; 
  background: rgba(255, 255, 255, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(4px);
}
.icon-mini.blue { color: #3b82f6; box-shadow: inset 0 0 10px rgba(59,130,246,0.1); }
.icon-mini.purple { color: #a855f7; box-shadow: inset 0 0 10px rgba(168,85,247,0.1); }
.icon-mini.green { color: #10b981; box-shadow: inset 0 0 10px rgba(16,185,129,0.1); }

.card-main { display: flex; align-items: baseline; gap: 6px; margin-top: auto; }
.card-main.flex-row { align-items: center; gap: 14px; }

.big-value { font-size: 2.5rem; font-weight: 800; color: #1e293b; line-height: 1; letter-spacing: -1px; }
.unit { font-size: 0.95rem; color: #94a3b8; font-weight: 600; }
.percent-sign { font-size: 1.3rem; color: #94a3b8; margin-left: 2px; }

.chart-wrapper { width: 36px; height: 36px; }
.circular-chart { display: block; max-width: 100%; max-height: 100%; }
.circle-bg { fill: none; stroke: rgba(203, 213, 225, 0.3); stroke-width: 4; }
.circle { fill: none; stroke: #3b82f6; stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 0.6s ease; }

@media (max-width: 1024px) { .stats-overview { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .stats-overview { grid-template-columns: 1fr; } .stat-card.glass-card { height: auto; gap: 16px; } }
</style>