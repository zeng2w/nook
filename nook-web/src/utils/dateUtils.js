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
  // 手动排期以用户设置的重复规则为准，不再让旧的 TMDB 下一集日期压住周更日期。
  const nextUpdate = show.scheduleLocked ? null : toLocalCalendarDate(show.nextAirDate);
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

/**
 * 找到“当前已更新集数”在推测日历中的日期锚点。
 *
 * airedEpisodes 表示目前实际确认的进度，不能继续固定在一个较早的
 * lastAirDate 上，否则停更或临时改播时会把中间所有理论更新日都累加进去。
 * 对普通重复排期，将实际进度放在参考日期之前最近的更新日；如果 TMDB
 * 明确给出了未来的下一集日期，则保留最后实际播出日期作为停播期锚点。
 */
const getProjectionAnchorDate = (show, referenceDate = new Date()) => {
  const reference = toLocalCalendarDate(referenceDate);
  const lastUpdate = toLocalCalendarDate(show?.lastAirDate);
  if (!reference) return lastUpdate;

  const confirmedAt = toLocalCalendarDate(show?.episodeProgressConfirmedAt);
  const confirmedDay = getCalendarDayNumber(confirmedAt);
  const referenceDay = getCalendarDayNumber(reference);
  const projectionReference = Number.isFinite(confirmedDay) && confirmedDay <= referenceDay
    ? confirmedAt
    : reference;

  const nextUpdate = show?.scheduleLocked ? null : toLocalCalendarDate(show?.nextAirDate);
  const projectionReferenceDay = getCalendarDayNumber(projectionReference);
  const lastUpdateDay = getCalendarDayNumber(lastUpdate);
  const nextUpdateDay = getCalendarDayNumber(nextUpdate);

  // 明确的未来播出日代表当前处于停播/待播阶段，此时不把实际进度挪到今天。
  if (
    Number.isFinite(nextUpdateDay) &&
    projectionReferenceDay < nextUpdateDay &&
    Number.isFinite(lastUpdateDay) &&
    projectionReferenceDay >= lastUpdateDay
  ) {
    return lastUpdate;
  }

  if (!show || show.updateFrequency === 'unknown' || show.updateFrequency === 'ended') {
    return lastUpdate || projectionReference;
  }

  let cursor = projectionReference;
  // 日更、周更和月更的最近一次理论更新日都应在一年范围内。
  for (let offset = 0; offset <= 366; offset += 1) {
    if (isShowUpdateDay(show, cursor)) return cursor;
    cursor = addCalendarDays(cursor, -1);
  }

  return lastUpdate || projectionReference;
};

export const formatDateCN = (dateValue) => {
  const date = toLocalCalendarDate(dateValue);
  if (!date) return '';
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
};

export const getEstimatedDateText = (show, referenceDate = new Date()) => {
  if (show.status === 'watched') return '已看完';
  if (show.status === 'dropped') return '已弃剧';

  const aired = show.airedEpisodes || 0;
  if (show.updateFrequency === 'ended' || (show.totalEpisodes && aired >= show.totalEpisodes)) {
    return '已完结';
  }
  if (!show.totalEpisodes) return '未知';
  if (!show.lastAirDate || !show.updateFrequency || show.updateFrequency === 'unknown') {
    return '待定';
  }

  const projectionAnchor = getProjectionAnchorDate(show, referenceDate);
  if (!projectionAnchor) return '日期无效';

  const remaining = show.totalEpisodes - aired;
  const episodesPerUpdate = Math.max(1, Number(show.updateCount) || 1);
  const updatesNeeded = Math.ceil(remaining / episodesPerUpdate);
  let finishDate = projectionAnchor;

  if (show.updateFrequency === 'daily') {
    finishDate = addCalendarDays(projectionAnchor, updatesNeeded);
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
    finishDate = addCalendarMonths(
      projectionAnchor,
      updatesNeeded,
      projectionAnchor.getDate()
    );
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

export const calculateEpisodeForDate = (show, targetDate, referenceDate = new Date()) => {
  const airedEpisodes = Number(show.airedEpisodes) || 0;
  const projectionAnchor = getProjectionAnchorDate(show, referenceDate);
  const target = toLocalCalendarDate(targetDate);
  if (!projectionAnchor || !target) return '待定';

  const occurrenceOffset = countUpdateOccurrences(show, projectionAnchor, target);
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

const formatEpisodeRange = (startEpisode, endEpisode) => {
  const start = Math.max(1, Number(startEpisode) || 0);
  const end = Math.max(start, Number(endEpisode) || 0);
  return start === end ? `Ep ${end}` : `${start}-${end}`;
};

const getConfirmedHistoryEntry = (show, targetDate) => {
  const matches = Array.isArray(show?.episodeUpdateHistory)
    ? show.episodeUpdateHistory.filter(entry => isSameCalendarDay(entry?.date, targetDate))
    : [];
  if (matches.length === 0) return null;

  const startEpisode = Math.min(...matches.map(entry => Number(entry.startEpisode) || Infinity));
  const endEpisode = Math.max(...matches.map(entry => Number(entry.endEpisode) || 0));
  if (!Number.isFinite(startEpisode) || endEpisode < startEpisode) return null;

  return {
    episodeText: formatEpisodeRange(startEpisode, endEpisode),
    type: 'confirmed',
    statusText: '已更',
    confirmedAt: show.episodeProgressConfirmedAt || matches.at(-1)?.date || null
  };
};

/**
 * 返回日历某一天应该展示的内容及其可信度。
 * 过去只展示已保存的真实更新记录；今天展示当前已确认进度；未来才做推测。
 */
export const getCalendarEpisodeEntry = (show, targetDate, referenceDate = new Date()) => {
  const target = toLocalCalendarDate(targetDate);
  const reference = toLocalCalendarDate(referenceDate);
  if (!show || !target || !reference || show.status === 'dropped') return null;

  const targetDay = getCalendarDayNumber(target);
  const referenceDay = getCalendarDayNumber(reference);
  const historyEntry = getConfirmedHistoryEntry(show, target);
  if (historyEntry && targetDay <= referenceDay) return historyEntry;

  if (targetDay < referenceDay) {
    const hasHistory = Array.isArray(show.episodeUpdateHistory) && show.episodeUpdateHistory.length > 0;
    if (!hasHistory && isSameCalendarDay(target, show.lastAirDate)) {
      const airedEpisodes = Math.max(0, Number(show.airedEpisodes) || 0);
      if (airedEpisodes <= 0) return null;
      const updateCount = Math.max(1, Number(show.updateCount) || 1);
      return {
        episodeText: formatEpisodeRange(
          Math.max(1, airedEpisodes - updateCount + 1),
          airedEpisodes
        ),
        type: 'confirmed',
        statusText: '已更',
        confirmedAt: show.episodeProgressConfirmedAt || show.lastAirDate || null
      };
    }
    return null;
  }

  if (show.updateFrequency === 'ended' || !isShowUpdateDay(show, target)) return null;

  const confirmedAt = toLocalCalendarDate(show.episodeProgressConfirmedAt);
  const isCurrentProgress = targetDay === referenceDay && (
    !confirmedAt || isSameCalendarDay(confirmedAt, reference)
  );
  if (isCurrentProgress) {
    const airedEpisodes = Math.max(0, Number(show.airedEpisodes) || 0);
    if (airedEpisodes <= 0) return null;
    return {
      episodeText: `Ep ${airedEpisodes}`,
      type: 'confirmed',
      statusText: '当前',
      confirmedAt: show.episodeProgressConfirmedAt || null
    };
  }

  const episodeText = calculateEpisodeForDate(show, target, reference);
  if (episodeText === '待定' || episodeText === '完结') return null;
  const hasExactNextDate = !show.scheduleLocked && isSameCalendarDay(target, show.nextAirDate);
  return {
    episodeText,
    type: hasExactNextDate ? 'scheduled' : 'estimated',
    statusText: hasExactNextDate ? '排期' : '预计',
    confirmedAt: show.episodeProgressConfirmedAt || null
  };
};

// Broadcast completion is independent of the viewer's watched status.
export const getCompletionCaption = (show, referenceDate = new Date()) => {
  const ended = show.updateFrequency === 'ended' || (show.totalEpisodes > 0 && show.airedEpisodes >= show.totalEpisodes);
  if (ended) {
    const date = toCalendarDateInput(show.lastAirDate);
    return date ? `${date.replaceAll('-', '.')} 播毕` : '已播毕';
  }
  const estimate = getEstimatedDateText({ ...show, status: 'watching' }, referenceDate);
  const match = estimate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
  return match ? `预计 ${match[1]}.${match[2].padStart(2, '0')}.${match[3].padStart(2, '0')} 完结` : '完结时间待定';
};
