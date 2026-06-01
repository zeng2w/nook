<template>
  <div class="filter-bar-wrapper">
    <div class="main-toolbar">
      
      <div class="status-group">
        <button 
          v-for="st in statuses" 
          :key="st.value" 
          class="status-pill" 
          :class="{ active: status === st.value }" 
          @click="$emit('update:status', st.value)"
        >
          {{ st.label }}
          <span class="count-badge">{{ getStatusCount(st.value) }}</span>
        </button>
      </div>

      <div class="toolbar-actions">
        <div class="trigger-group">
          
          <div class="dropdown-container">
            <button 
              class="dropdown-btn" 
              :class="{ 'has-selection': category !== 'all', 'is-open': activeDropdown === 'category' }" 
              @click="toggleDropdown('category')"
            >
              <span>{{ currentCategoryLabel }}</span>
              <svg class="chevron" :class="{ 'rotate': activeDropdown === 'category' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <transition name="dropdown-fade">
              <div v-if="activeDropdown === 'category'" class="dropdown-menu category-menu">
                <button 
                  v-for="cat in categories" 
                  :key="cat.value" 
                  class="option-pill" 
                  :class="{ active: category === cat.value }" 
                  @click="selectCategory(cat.value)"
                >
                  <span v-if="cat.icon" class="pill-icon">{{ cat.icon }}</span>
                  <span>{{ cat.label }}</span>
                  <span class="pill-count">{{ getCategoryCount(cat.value) }}</span>
                </button>
              </div>
            </transition>
          </div>
          
          <div class="dropdown-container">
            <button 
              class="dropdown-btn" 
              :class="{ 'has-selection': network !== 'all', 'is-open': activeDropdown === 'network' }" 
              @click="toggleDropdown('network')"
            >
              <span>{{ currentNetworkLabel }}</span>
              <svg class="chevron" :class="{ 'rotate': activeDropdown === 'network' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <transition name="dropdown-fade">
              <div v-if="activeDropdown === 'network'" class="dropdown-menu network-menu">
                <button 
                  class="option-pill" 
                  :class="{ active: network === 'all' }" 
                  @click="selectNetwork('all')"
                >
                  全部平台
                  <span class="pill-count">{{ getNetworkCount('all') }}</span>
                </button>
                <button 
                  v-for="net in networks" 
                  :key="net.name" 
                  class="option-pill platform-pill" 
                  :class="{ active: network === net.name }" 
                  @click="selectNetwork(net.name)" 
                >
                  <img v-if="net.logo" :src="net.logo" class="net-logo" alt="logo" />
                  <span>{{ net.name }}</span>
                  <span class="pill-count">{{ getNetworkCount(net.name) }}</span>
                </button>
              </div>
            </transition>
          </div>

          <div class="dropdown-container">
            <button 
              class="dropdown-btn" 
              :class="{ 'is-open': activeDropdown === 'sort' }" 
              @click="toggleDropdown('sort')"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
              <span>{{ currentSortLabel }}</span>
              <svg class="chevron" :class="{ 'rotate': activeDropdown === 'sort' }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <transition name="dropdown-fade">
              <div v-if="activeDropdown === 'sort'" class="dropdown-menu sort-menu">
                <button 
                  v-for="opt in sortOptions" 
                  :key="opt.value"
                  class="sort-item"
                  :class="{ active: sortBy === opt.value }"
                  @click="selectSort(opt.value)"
                >
                  <span>{{ opt.label }}</span>
                  <span v-if="sortBy === opt.value" class="sort-direction-arrow">
                    {{ sortDesc ? '↓' : '↑' }}
                  </span>
                </button>
              </div>
            </transition>
          </div>

        </div>

        <div class="divider"></div>

        <div class="view-toggle">
          <button class="toggle-btn" :class="{ active: viewMode === 'grid' }" @click="$emit('update:viewMode', 'grid')" title="网格视图">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
          </button>
          <button class="toggle-btn" :class="{ active: viewMode === 'list' }" @click="$emit('update:viewMode', 'list')" title="列表视图">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeDropdown" class="click-outside-mask" @click="closeDropdown"></div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  category: String,
  status: String,
  network: String,
  networks: Array,
  shows: { type: Array, default: () => [] },
  viewMode: { type: String, default: 'grid' },
  sortBy: { type: String, default: 'date' }, 
  sortDesc: { type: Boolean, default: true }
});

const emit = defineEmits([
  'update:category', 
  'update:status', 
  'update:network', 
  'update:viewMode',
  'change-sort'
]);

// ✨ 控制下拉菜单的核心逻辑
const activeDropdown = ref(null);
const toggleDropdown = (type) => {
  activeDropdown.value = activeDropdown.value === type ? null : type;
};
const closeDropdown = () => { activeDropdown.value = null; };

const statuses = [
  { label: '全部', value: 'all' },
  { label: '想看', value: 'wish' },
  { label: '在看', value: 'watching' },
  { label: '已看', value: 'watched' },
  { label: '弃剧', value: 'dropped' }
];

const categories = [
  { label: '全部', value: 'all' },
  { label: '电视剧', value: 'tv', icon: '📺' },
  { label: '动漫', value: 'anime', icon: '🎎' },
  { label: '电影', value: 'movie', icon: '🎬' },
  { label: '综艺', value: 'variety', icon: '🎤' }
];

const sortOptions = [
  { label: '更新时间', value: 'date' },
  { label: '待看数量', value: 'lag' }
];

const currentCategoryLabel = computed(() => {
  return categories.find(c => c.value === props.category)?.label || '类型';
});
const currentNetworkLabel = computed(() => {
  return props.network === 'all' ? '平台' : props.network;
});
const currentSortLabel = computed(() => {
  return sortOptions.find(o => o.value === props.sortBy)?.label || '排序';
});

// 选择处理
const selectCategory = (val) => {
  emit('update:category', val);
  closeDropdown();
};
const selectNetwork = (val) => {
  emit('update:network', val);
  closeDropdown();
};
const selectSort = (val) => {
  emit('change-sort', val);
  // 如果点击的是相同排序（切正逆序），保留下拉框；点击新排序则关闭
  if (props.sortBy !== val) closeDropdown();
};

const getStatusCount = (val) => {
  if (!props.shows) return 0;
  return props.shows.filter(s => {
    const catMatch = props.category === 'all' || s.category === props.category;
    const netMatch = props.network === 'all' || s.network === props.network;
    const statusMatch = val === 'all' || s.status === val;
    return catMatch && netMatch && statusMatch;
  }).length;
};

const getCategoryCount = (val) => {
  if (!props.shows) return 0;
  return props.shows.filter(s => {
    const statusMatch = props.status === 'all' || s.status === props.status;
    const netMatch = props.network === 'all' || s.network === props.network;
    const catMatch = val === 'all' || s.category === val;
    return statusMatch && netMatch && catMatch;
  }).length;
};

const getNetworkCount = (val) => {
  if (!props.shows) return 0;
  return props.shows.filter(s => {
    const catMatch = props.category === 'all' || s.category === props.category;
    const statusMatch = props.status === 'all' || s.status === props.status;
    const netMatch = val === 'all' || s.network === val;
    return catMatch && statusMatch && netMatch;
  }).length;
};
</script>

<style scoped>
.filter-bar-wrapper { 
  width: 100%; 
  position: relative; 
  /* ✨ 核心模块化样式：白色背景、圆角、柔和阴影 */
  background-color: var(--theme-surface, #ffffff);
  border-radius: 16px;
  padding: 12px 20px;
  box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(226, 232, 240, 0.8);
}
.main-toolbar { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  width: 100%; 
  position: relative; 
  z-index: 1001; 
}
/* 状态页签 */
.status-group { display: flex; gap: 6px; background: #f1f5f9; padding: 4px; border-radius: 30px; }
.status-pill { border: none; background: transparent; color: #64748b; padding: 6px 16px; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s ease; }
.status-pill:hover:not(.active) { color: #7c3aed; }
.status-pill.active { background: #ffffff; color: #7c3aed; box-shadow: 0 2px 8px rgba(124, 58, 237, 0.08); }
.count-badge { font-size: 0.75rem; opacity: 0.6; font-weight: normal; }

/* 右侧工具栏对齐修复核心区 */
.toolbar-actions { display: flex; align-items: center; gap: 12px; }
.trigger-group { display: flex; align-items: center; gap: 8px; } /* 强制内部元素居中对齐 */
.dropdown-container { position: relative; height: 36px; } /* 容器高度统一锁死 */

/* 统一控制所有触发按钮，强制盒模型对齐 */
.dropdown-btn { 
  box-sizing: border-box; /* 核心：避免 border 撑开高度 */
  height: 100%; /* 填满父容器的 36px */
  border: 1px solid #e2e8f0; 
  background: #ffffff; 
  color: #475569; 
  padding: 0 14px; 
  border-radius: 10px; 
  font-size: 0.85rem; 
  font-weight: 600; 
  cursor: pointer; 
  display: flex; 
  align-items: center; 
  justify-content: space-between;
  gap: 8px; 
  transition: all 0.2s ease; 
}
.chevron { opacity: 0.5; transition: transform 0.25s ease; }
.chevron.rotate { transform: rotate(180deg); }

/* 按钮高亮互动 */
.dropdown-btn:hover, .dropdown-btn.is-open { border-color: #c084fc; color: #7c3aed; background-color: #f5f3ff; }
.dropdown-btn:hover .chevron, .dropdown-btn.is-open .chevron { opacity: 1; }
.dropdown-btn.has-selection { border-color: #a78bfa; background-color: #f5f3ff; color: #7c3aed; }
.dropdown-btn.has-selection .chevron { opacity: 1; }

.divider { width: 1px; height: 20px; background: #e2e8f0; }

.view-toggle { display: flex; gap: 2px; background: #f1f5f9; padding: 3px; border-radius: 10px; height: 36px; box-sizing: border-box;}
.toggle-btn { background: transparent; border: none; width: 30px; height: 100%; border-radius: 8px; cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.toggle-btn.active { background: #ffffff; color: #7c3aed; box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05); }

/* ==========================================================================
   ✨ 下拉菜单面板样式 (Dropdown Menu)
   ========================================================================== */
.dropdown-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0; /* 默认右对齐，确保不溢出屏幕 */
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.08), 0 4px 6px rgba(15, 23, 42, 0.04);
  z-index: 1000;
  padding: 16px;
  transform-origin: top right;
}

/* 类型和平台菜单 - 流体布局 */
.category-menu, .network-menu {
  width: 300px;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 排序菜单 - 垂直列表 */
.sort-menu {
  width: 140px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* 选项 Pill 样式 */
.option-pill { border: 1px solid #e2e8f0; background: #ffffff; color: #475569; padding: 8px 16px; border-radius: 24px; font-size: 0.85rem; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; height: 38px; transition: all 0.2s; }
.option-pill:hover:not(.active) { border-color: #cbd5e1; background: #f8fafc; }
.option-pill.active { border-color: transparent; background: #7c3aed; color: #ffffff; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.25); }

.pill-count { font-size: 0.75rem; background: #f1f5f9; color: #64748b; padding: 2px 6px; border-radius: 8px; }
.option-pill.active .pill-count { background: rgba(255, 255, 255, 0.2); color: #ffffff; }

.platform-pill { padding-left: 12px; }
.net-logo { height: 16px; object-fit: contain; filter: grayscale(100%); opacity: 0.6; }
.option-pill.active .net-logo { filter: brightness(0) invert(1); opacity: 1; }

/* 排序选项列表项样式 */
.sort-item { border: none; background: transparent; padding: 10px 12px; border-radius: 8px; font-size: 0.9rem; font-weight: 600; color: #475569; text-align: left; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.sort-item:hover:not(.active) { background: #f1f5f9; }
.sort-item.active { background: #f5f3ff; color: #7c3aed; }
.sort-direction-arrow { font-size: 1.1rem; font-weight: 800; }

/* 全屏透明遮罩层 - 负责点击外部区域关闭菜单 */
.click-outside-mask {
  position: fixed;
  inset: 0;
  z-index: 1000; /* 保持 1000 */
  background: transparent;
}

/* 下拉菜单过渡动画 */
.dropdown-fade-enter-active, .dropdown-fade-leave-active { transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
.dropdown-fade-enter-from, .dropdown-fade-leave-to { opacity: 0; transform: translateY(-8px) scale(0.98); }

@media (max-width: 860px) {
  .main-toolbar { flex-direction: column; align-items: flex-start; gap: 12px; }
  .toolbar-actions { width: 100%; justify-content: space-between; }
  .dropdown-menu { right: auto; left: 0; transform-origin: top left; } /* 在小屏幕下左对齐下拉菜单 */
}
</style>