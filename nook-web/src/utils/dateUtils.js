/**
 * 日期工具函数库
 */

/**
 * 简单的中文日期格式化
 * @param {string | Date} dateStr - 日期字符串或对象
 * @returns {string} - 例如: "2026年8月13日"
 */
export const formatDateCN = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  return `${year}年${month}月${day}日`;
};

/**
 * 计算剧集预计完结日期
 * @param {Object} show - 剧集对象
 * @returns {string} 
 */
export const getEstimatedDateText = (show) => {
  // 1. 优先判定用户个人状态
  if (show.status === 'watched') return '已完结';
  if (show.status === 'dropped') return '已弃剧';

  // 2. 判定剧集的客观状态
  const aired = show.airedEpisodes || 0;
  // 如果官方标记已完结，或者已播出的集数达到总集数，就算客观完结
  if (show.updateFrequency === 'ended' || (show.totalEpisodes && aired >= show.totalEpisodes)) {
    return '已完结';
  }

  // 3. 数据不全，无法计算
  if (!show.totalEpisodes) return '未知'; // 连总集数都不知道
  if (!show.lastAirDate || !show.updateFrequency || show.updateFrequency === 'unknown') {
    return '待定';
  }

  // 4. 开始精确计算
  const remaining = show.totalEpisodes - aired;
  const epPerUpdate = show.updateCount || 1;
  const lastDate = new Date(show.lastAirDate);

  if (isNaN(lastDate.getTime())) return '日期无效';

  // 修正时区问题：防止 UTC 转换导致日期少一天，加上 12 小时缓冲
  lastDate.setHours(lastDate.getHours() + 12);

  if (show.updateFrequency === 'daily') {
    // 日更
    const daysNeeded = Math.ceil(remaining / epPerUpdate);
    lastDate.setDate(lastDate.getDate() + daysNeeded);
  } else if (show.updateFrequency === 'weekly') {
    // 周更
    if (!show.updateDays || show.updateDays.length === 0) {
      const weeksNeeded = Math.ceil(remaining / epPerUpdate);
      lastDate.setDate(lastDate.getDate() + (weeksNeeded * 7));
    } else {
      let tempRemaining = remaining;
      let safeGuard = 3650; 
      // ★修复：把 updateDays 强制转成数字，防止数据库里的字符 '1' 和数字 1 匹配失败
      const validDays = show.updateDays.map(Number);
      
      while (tempRemaining > 0 && safeGuard > 0) {
        lastDate.setDate(lastDate.getDate() + 1);
        if (validDays.includes(lastDate.getDay())) {
          tempRemaining -= epPerUpdate;
        }
        safeGuard--;
      }
    }
  } else if (show.updateFrequency === 'monthly') {
    // 月更
    const monthsNeeded = Math.ceil(remaining / epPerUpdate);
    lastDate.setMonth(lastDate.getMonth() + monthsNeeded);
  }

  // 统一用 "预计：" 开头，方便后续卡片组件剥离
  return `预计：${formatDateCN(lastDate)}`;
};