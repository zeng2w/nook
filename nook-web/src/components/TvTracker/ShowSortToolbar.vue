<template>
  <div class="sort-toolbar">
    <div class="sort-group">
      <!-- <span class="sort-label">排序方式</span> -->
      
      <button 
        class="sort-chip" 
        :class="{ active: sortBy === 'date' }" 
        @click="$emit('change', 'date')"
      >
        更新时间
        <span class="sort-arrow" :class="{ up: sortBy === 'date' && !sortDesc }">↓</span>
      </button>

      <button 
        class="sort-chip" 
        :class="{ active: sortBy === 'lag' }" 
        @click="$emit('change', 'lag')"
      >
        待看数量
        <span class="sort-arrow" :class="{ up: sortBy === 'lag' && !sortDesc }">↓</span>
      </button>
    </div>
  </div>
</template>

<script setup>
// 接收父组件传来的状态
defineProps({
  sortBy: String,
  sortDesc: Boolean
});

// 定义向外发送的事件
defineEmits(['change']);
</script>

<style scoped>
.sort-toolbar { display: flex; justify-content: space-between; align-items: center; margin: 10px 0 20px 0; padding: 0 4px; }
.sort-group { display: flex; align-items: center; gap: 12px; }
.sort-label { font-size: 0.85rem; color: #94a3b8; font-weight: 600; margin-right: 4px; }
.sort-chip { display: inline-flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0; background: #fff; color: #64748b; font-size: 0.85rem; font-weight: 600; cursor: pointer; transition: all 0.2s ease; }
.sort-chip:hover { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
.sort-chip.active { background: #eff6ff; color: #2563eb; border-color: #bfdbfe; }
.sort-arrow { font-size: 0.8rem; font-weight: 800; transition: transform 0.3s ease; display: inline-block; }
.sort-arrow.up { transform: rotate(180deg); }
</style>