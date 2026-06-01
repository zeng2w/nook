<template>
  <div class="modern-stats-overview">
    
    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-title">正在追剧</span>
        <div class="stat-icon bg-indigo-50 text-indigo-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 12h5l3 5 5-11 4 6h3"/></svg>
        </div>
      </div>
      <div class="stat-body">
        <span class="stat-number">{{ statusCounts.watching || 0 }}</span>
        <span class="stat-unit">部作品</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-title">待补进度</span>
        <div class="stat-icon bg-amber-50 text-amber-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
      </div>
      <div class="stat-body">
        <span class="stat-number">{{ progressStats.lag || 0 }}</span>
        <span class="stat-unit">集未看</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-title">累计观看</span>
        <div class="stat-icon bg-emerald-50 text-emerald-500">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
        </div>
      </div>
      <div class="stat-body">
        <span class="stat-number">{{ progressStats.watched || 0 }}</span>
        <span class="stat-unit">集已阅</span>
      </div>
    </div>

    <div class="stat-card">
      <div class="stat-header">
        <span class="stat-title">总完成率</span>
      </div>
      <div class="stat-body with-chart">
        <div class="mini-chart">
          <svg viewBox="0 0 36 36" class="circular-chart">
            <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
            <path class="circle" :stroke-dasharray="`${progressStats.percent || 0}, 100`" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
          </svg>
        </div>
        <div>
          <span class="stat-number">{{ progressStats.percent || 0 }}</span>
          <span class="stat-unit">%</span>
        </div>
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
.modern-stats-overview { 
  display: grid; 
  grid-template-columns: repeat(4, 1fr); 
  gap: 20px; 
  width: 100%; 
}

.stat-card {
  background: #ffffff;
  border: 1px solid #f1f5f9;
  border-radius: 20px;
  padding: 24px;
  display: flex; 
  flex-direction: column; 
  justify-content: space-between;
  height: 130px; 
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
}
.stat-card:hover {
  box-shadow: 0 10px 30px -4px rgba(99, 102, 241, 0.08);
  border-color: #e2e8f0;
}

.stat-header { display: flex; justify-content: space-between; align-items: center; }
.stat-title { font-size: 0.85rem; font-weight: 600; color: #64748b; }

.stat-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.bg-indigo-50 { background-color: #e0e7ff; color: #6366F1; }
.bg-amber-50 { background-color: #fef3c7; color: #f59e0b; }
.bg-emerald-50 { background-color: #d1fae5; color: #10b981; }

.stat-body { display: flex; align-items: baseline; gap: 6px; margin-top: auto; }
.stat-body.with-chart { align-items: center; gap: 12px; }

.stat-number { font-size: 2.2rem; font-weight: 800; color: #0f172a; line-height: 1; letter-spacing: -1px; }
.stat-unit { font-size: 0.9rem; color: #94a3b8; font-weight: 500; }

.mini-chart { width: 40px; height: 40px; }
.circular-chart { display: block; max-width: 100%; max-height: 100%; }
.circle-bg { fill: none; stroke: #f1f5f9; stroke-width: 4; }
.circle { fill: none; stroke: #6366F1; stroke-width: 4; stroke-linecap: round; transition: stroke-dasharray 1s ease-out; }

@media (max-width: 1024px) { .modern-stats-overview { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 640px) { .modern-stats-overview { grid-template-columns: 1fr; } .stat-card { height: auto; gap: 16px; } }
</style>