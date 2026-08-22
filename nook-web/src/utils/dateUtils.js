/**
 * 日历日期工具。
 *
 * 剧集的 lastAirDate/estimatedFinishDate 表示“某地日历上的一天”，不是一个
 * 需要跨时区换算的精确时刻。这里保留字符串中的 YYYY-MM-DD，并在浏览器
 * 当前时区的中午构造 Date，避免芝加哥等负时区和夏令时边界导致前后偏一天。
 */

const DATE_PARTS_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;
const MAX_CALENDAR_ITERATIONS = 5000;

export const toLocalCalendarDate = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const match = value.match(DATE_PARTS_PATTERN);
    if (match) {
      const year = Number(match[1]);
      const monthIndex = Number(match[2]) - 1;
      const day = Number(match[3]);
      const date = new Date(year, monthIndex, day, 12, 0, 0, 0);
      if (
        date.getFullYear() === year &&
        date.getMonth() === monthIndex &&
        date.getDate() === day
      ) {
        return date;
      }
      return null;
    }
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), 12, 0, 0, 0);
};

const getCalendarDayNumber = (value) => {
  const date = toLocalCalendarDate(value);
  if (!date) return Number.NaN;
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000;
};

const addCalendarDays = (value, amount) => {
  const date = toLocalCalendarDate(value);
  if (!date) return null;
  date.setDate(date.getDate() + amount);
  date.setHours(12, 0, 0, 0);
  return date;
};

const addCalendarMonths = (value, amount, anchorDay) => {
  const date = toLocalCalendarDate(value);
  if (!date) return null;
  const desiredDay = anchorDay || date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  date.setDate(Math.min(desiredDay, lastDay));
  date.setHours(12, 0, 0, 0);
  return date;
};

export const getCurrentTimeZone = () => (
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
);

export const getCurrentTimeZoneLabel = () => {
  const zone = getCurrentTimeZone();
  const shortName = new Intl.DateTimeFormat('zh-CN', { timeZoneName: 'short' })
    .formatToParts(new Date())
    .find(part => part.type === 'timeZoneName')?.value;
  return shortName && shortName !== zone ? `${zone} · ${shortName}` : zone;
};

export const toCalendarDateInput = (value) => {
  const date = toLocalCalendarDate(value);
  if (!date) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameCalendarDay = (left, right) => (
  getCalendarDayNumber(left) === getCalendarDayNumber(right)
);

export const isAfterCalendarDay = (target, endDate) => (
  getCalendarDayNumber(target) > getCalendarDayNumber(endDate)
);

const getValidUpdateDays = (show) => (
  Array.isArray(show.updateDays)
    ? [...new Set(show.updateDays.map(Number).filter(day => Number.isInteger(day) && day >= 0 && day <= 6))]
    : []
);

export const isShowUpdateDay = (show, targetDate) => {
  const target = toLocalCalendarDate(targetDate);
  if (!target || !show || show.updateFrequency === 'ended') {
    return false;
  }

  const lastUpdate = toLocalCalendarDate(show.lastAirDate);
  const nextUpdate = toLocalCalendarDate(show.nextAirDate);
  const targetDay = getCalendarDayNumber(target);
  const lastUpdateDay = getCalendarDayNumber(lastUpdate);
  const nextUpdateDay = getCalendarDayNumber(nextUpdate);

  // 下一集日期是 TMDB 明确给出的时间锚点。停播期间不继续按旧星期外推，
  // 但仍保留 lastAirDate 之前的历史日历计算。
  if (Number.isFinite(nextUpdateDay)) {
    if (targetDay === nextUpdateDay) return true;
    const isAfterLastKnownUpdate = !Number.isFinite(lastUpdateDay) || targetDay > lastUpdateDay;
    if (isAfterLastKnownUpdate && targetDay < nextUpdateDay) return false;
  }

  if (show.updateFrequency === 'unknown') return false;
  if (show.updateFrequency === 'daily') return true;

  if (show.updateFrequency === 'weekly') {
    const updateDays = getValidUpdateDays(show);
    if (updateDays.length > 0) return updateDays.includes(target.getDay());
    if (nextUpdate) return target.getDay() === nextUpdate.getDay();
    return Boolean(lastUpdate) && target.getDay() === lastUpdate.getDay();
  }

  if (show.updateFrequency === 'monthly' && lastUpdate) {
    const lastDayOfTargetMonth = new Date(
      target.getFullYear(),
      target.getMonth() + 1,
      0
    ).getDate();
    return target.getDate() === Math.min(lastUpdate.getDate(), lastDayOfTargetMonth);
  }

  return false;
};

export const formatDateCN = (dateValue) => {
  const date = toLocalCalendarDate(dateValue);
  if (!date) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const getEstimatedDateText = (show) => {
  if (show.status === 'watched') return '已完结';
  if (show.status === 'dropped') return '已弃剧';

  const aired = show.airedEpisodes || 0;
  if (show.updateFrequency === 'ended' || (show.totalEpisodes && aired >= show.totalEpisodes)) {
    return '已完结';
  }
  if (!show.totalEpisodes) return '未知';
  if (!show.lastAirDate || !show.updateFrequency || show.updateFrequency === 'unknown') {
    return '待定';
  }

  const lastDate = toLocalCalendarDate(show.lastAirDate);
  if (!lastDate) return '日期无效';

  const remaining = show.totalEpisodes - aired;
  const episodesPerUpdate = Math.max(1, Number(show.updateCount) || 1);
  const updatesNeeded = Math.ceil(remaining / episodesPerUpdate);
  let finishDate = lastDate;

  if (show.updateFrequency === 'daily') {
    finishDate = addCalendarDays(lastDate, updatesNeeded);
  } else if (show.updateFrequency === 'weekly') {
    let completedUpdates = 0;
    let iterations = 0;
    while (completedUpdates < updatesNeeded && iterations < MAX_CALENDAR_ITERATIONS) {
      finishDate = addCalendarDays(finishDate, 1);
      if (isShowUpdateDay(show, finishDate)) completedUpdates++;
      iterations++;
    }
    if (completedUpdates < updatesNeeded) return '待定';
  } else if (show.updateFrequency === 'monthly') {
    finishDate = addCalendarMonths(lastDate, updatesNeeded, lastDate.getDate());
  } else {
    return '待定';
  }

  return finishDate ? `预计：${formatDateCN(finishDate)}` : '日期无效';
};

const countUpdateOccurrences = (show, lastUpdate, target) => {
  const lastDay = getCalendarDayNumber(lastUpdate);
  const targetDay = getCalendarDayNumber(target);
  if (!Number.isFinite(lastDay) || !Number.isFinite(targetDay) || lastDay === targetDay) return 0;

  let count = 0;
  let iterations = 0;
  if (targetDay > lastDay) {
    let cursor = addCalendarDays(lastUpdate, 1);
    while (getCalendarDayNumber(cursor) <= targetDay && iterations < MAX_CALENDAR_ITERATIONS) {
      if (isShowUpdateDay(show, cursor)) count++;
      cursor = addCalendarDays(cursor, 1);
      iterations++;
    }
    return count;
  }

  let cursor = addCalendarDays(target, 1);
  while (getCalendarDayNumber(cursor) <= lastDay && iterations < MAX_CALENDAR_ITERATIONS) {
    if (isShowUpdateDay(show, cursor)) count--;
    cursor = addCalendarDays(cursor, 1);
    iterations++;
  }
  return count;
};

export const calculateEpisodeForDate = (show, targetDate) => {
  const airedEpisodes = Number(show.airedEpisodes) || 0;
  if (!show.lastAirDate) return `${airedEpisodes}集`;

  const lastUpdate = toLocalCalendarDate(show.lastAirDate);
  const target = toLocalCalendarDate(targetDate);
  if (!lastUpdate || !target) return '待定';

  const occurrenceOffset = countUpdateOccurrences(show, lastUpdate, target);
  const updateCount = Math.max(1, Number(show.updateCount) || 1);
  const endEpisode = airedEpisodes + (occurrenceOffset * updateCount);
  let startEpisode = endEpisode - updateCount + 1;

  if (endEpisode <= 0) return '待定';
  if (show.totalEpisodes && startEpisode > show.totalEpisodes) return '完结';
  if (startEpisode < 1) startEpisode = 1;

  const displayEnd = show.totalEpisodes
    ? Math.min(endEpisode, show.totalEpisodes)
    : endEpisode;
  return updateCount === 1 || startEpisode === displayEnd
    ? `Ep ${displayEnd}`
    : `${startEpisode}-${displayEnd}`;
};
