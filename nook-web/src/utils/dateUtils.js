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
  
  // 使用本地时间获取年月日
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  
  return `${year}年${month}月${day}日`;
};

/**
 * 计算剧集预计完结日期
 * @param {Object} show - 剧集对象 (包含 totalEpisodes, airedEpisodes, updateFrequency 等)
 * @returns {string} - 状态文本 (e.g. "已完结", "预计完结: 2026年...")
 */
export const getEstimatedDateText = (show) => {
  // 1. 基础状态判断
  if (!show.totalEpisodes || !show.airedEpisodes || show.airedEpisodes >= show.totalEpisodes) {
    if (show.status === 'watched') return '已完结';
    if (show.status === 'dropped') return '已弃剧';
    return '暂无数据'; // 或者是 '已完结'，视你的业务逻辑而定
  }

  // 2. 缺少必要计算数据
  if (!show.lastAirDate || show.updateFrequency === 'unknown' || show.updateFrequency === 'ended') {
    return '待计算';
  }

  // 3. 计算逻辑
  const remaining = show.totalEpisodes - show.airedEpisodes;
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
      // 如果没有指定具体周几，按每7天一更粗略计算
      const weeksNeeded = Math.ceil(remaining / epPerUpdate);
      lastDate.setDate(lastDate.getDate() + (weeksNeeded * 7));
    } else {
      // 精确计算：模拟每一天，直到看完
      let tempRemaining = remaining;
      let safeGuard = 3650; // 防止死循环（10年）
      
      while (tempRemaining > 0 && safeGuard > 0) {
        lastDate.setDate(lastDate.getDate() + 1);
        // 如果这一天是更新日 (0=周日, 1=周一...)
        if (show.updateDays.includes(lastDate.getDay())) {
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

  return `预计完结：${formatDateCN(lastDate)}`;
};