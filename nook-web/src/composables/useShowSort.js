import { ref, computed } from 'vue';

export function useShowSort(showsRef) {
  // --- 状态 ---
  const sortBy = ref('date'); // 'date' | 'lag'
  const sortDesc = ref(true); // true = 降序

  // --- 操作 ---
  const handleSort = (type) => {
    if (sortBy.value === type) {
      sortDesc.value = !sortDesc.value; // 切换升降序
    } else {
      sortBy.value = type;
      sortDesc.value = true; // 默认降序
    }
  };

  // --- 计算属性：核心排序逻辑 ---
  const sortedShows = computed(() => {
    // 1. 复制列表防止修改原数据
    // 注意：这里的 showsRef 是一个 ref，需要 .value 访问
    let list = [...(showsRef.value || [])]; 

    // 2. 执行排序
    return list.sort((a, b) => {
      let valA, valB;

      if (sortBy.value === 'date') {
        // 排序 1: 按最后更新时间
        // 如果没有日期，给一个极小值沉底
        valA = a.lastAirDate ? new Date(a.lastAirDate).getTime() : 0;
        valB = b.lastAirDate ? new Date(b.lastAirDate).getTime() : 0;
      } else if (sortBy.value === 'lag') {
        // 排序 2: 按待看差值 (已更 - 已看)
        const lagA = (a.airedEpisodes || 0) - (a.watchedEpisodes || 0);
        const lagB = (b.airedEpisodes || 0) - (b.watchedEpisodes || 0);
        valA = Math.max(0, lagA);
        valB = Math.max(0, lagB);
      }

      // 3. 处理相等情况 (按标题兜底，保证列表稳定)
      if (valA === valB) return 0;

      // 4. 升降序
      return sortDesc.value ? (valB - valA) : (valA - valB);
    });
  });

  // 导出给组件使用
  return {
    sortBy,
    sortDesc,
    handleSort,
    sortedShows
  };
}