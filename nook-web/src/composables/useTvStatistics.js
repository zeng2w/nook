import { computed } from 'vue';

/**
 * 追剧统计逻辑封装
 * @param {Ref<Array>} showsRef - 响应式的剧集列表数据 (ref(shows))
 */
export function useTvStatistics(showsRef) {
  
  // 1. 状态计数 (Status Counts)
  // 统计每种状态下有多少部剧 (例如: 在追 3 部, 已看 10 部)
  const statusCounts = computed(() => {
    const counts = { watching: 0, watched: 0, wish: 0, dropped: 0 };
    const list = showsRef.value || [];
    
    list.forEach(s => {
      // 确保状态值有效
      if (s.status && counts[s.status] !== undefined) {
        counts[s.status]++;
      }
    });
    return counts;
  });

  // 2. 进度统计 (Progress Stats)
  // 计算全局的观看量、待看量和完成率
  const progressStats = computed(() => {
    let totalWatchedEp = 0; // 分子：总共看了多少集
    let totalTargetEp = 0;  // 分母：总共应该看多少集 (用于计算百分比)
    let totalLagEp = 0;     // 待办：还剩多少集没看 (只计算"在追"的剧)

    const list = showsRef.value || [];

    list.forEach(s => {
      // "弃剧" 和 "想看" 的剧集不计入进度统计
      if (s.status === 'dropped' || s.status === 'wish') return;

      const watched = Number(s.watchedEpisodes) || 0;
      const aired = Number(s.airedEpisodes) || 0;
      const total = Number(s.totalEpisodes) || 0;
      
      // 累加已看集数
      totalWatchedEp += watched;
      
      // 计算分母 (Target)
      // 逻辑：如果剧集有总集数(已完结)，分母就是总集数；
      // 如果是连载中(无total)，分母就是当前已更集数(aired)。
      const currentTarget = total > 0 ? total : aired;
      
      // 累加分母 (Math.max 确保分母不会小于分子，防止数据错误导致百分比>100%)
      totalTargetEp += Math.max(watched, currentTarget);

      // 计算落后集数 (Lag) - 这是用户最关心的 "欠债"
      // 只对状态为 "watching" (在追) 的剧计算落后进度
      // 如果是 "watched" (已看)，理论上 lag 应该是 0
      if (s.status === 'watching') {
        const lag = Math.max(0, aired - watched);
        totalLagEp += lag;
      }
    });

    // 计算总完成百分比
    const percent = totalTargetEp > 0 
      ? Math.round((totalWatchedEp / totalTargetEp) * 100) 
      : 0;

    return {
      watched: totalWatchedEp, // 累计观看 (集)
      total: totalTargetEp,    // 总目标 (集)
      lag: totalLagEp,         // 待补完 (集)
      percent                  // 总进度 (%)
    };
  });

  return {
    statusCounts,
    progressStats
  };
}