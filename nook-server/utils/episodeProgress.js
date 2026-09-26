const MAX_EPISODE_HISTORY_ENTRIES = 400;

const toCalendarDateKey = value => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const toStoredCalendarDate = value => {
  const key = toCalendarDateKey(value);
  return key ? new Date(`${key}T12:00:00.000Z`) : null;
};

const normalizeHistory = history => (
  Array.isArray(history)
    ? history
        .map(entry => ({
          date: toStoredCalendarDate(entry.date),
          startEpisode: Number(entry.startEpisode) || 0,
          endEpisode: Number(entry.endEpisode) || 0,
          source: entry.source || 'tmdb',
          kind: entry.kind || 'broadcast',
          confirmedAt: entry.confirmedAt || null
        }))
        .filter(entry => (
          entry.date &&
          entry.startEpisode > 0 &&
          entry.endEpisode >= entry.startEpisode
        ))
    : []
);

const mergeHistoryEntry = (history, incoming) => {
  const incomingKey = toCalendarDateKey(incoming.date);
  if (incoming.kind === 'snapshot') {
    const snapshot = history.find(entry => entry.kind === 'snapshot' && toCalendarDateKey(entry.date) === incomingKey);
    if (snapshot) {
      Object.assign(snapshot, incoming);
      return history;
    }
  }
  const existing = history.find(entry => toCalendarDateKey(entry.date) === incomingKey &&
    entry.kind === incoming.kind && entry.startEpisode <= incoming.endEpisode + 1 &&
    incoming.startEpisode <= entry.endEpisode + 1);
  if (existing) {
    existing.startEpisode = Math.min(existing.startEpisode, incoming.startEpisode);
    existing.endEpisode = Math.max(existing.endEpisode, incoming.endEpisode);
    existing.source = incoming.source;
    existing.confirmedAt = incoming.confirmedAt;
    return history;
  }
  history.push(incoming);
  return history;
};

const trimCorrectedHistory = (history, airedEpisodes) => history
  .filter(entry => entry.startEpisode <= airedEpisodes)
  .map(entry => ({
    ...entry,
    endEpisode: Math.min(entry.endEpisode, airedEpisodes)
  }))
  .filter(entry => entry.endEpisode >= entry.startEpisode);

/**
 * 确认当前实际已更新集数，并保存日历可以长期复用的历史事件。
 * 该函数只记录“已更新”进度，不处理用户的观看进度。
 */
const confirmEpisodeProgress = (show, airedEpisodes, options = {}) => {
  const current = Math.max(0, Number(airedEpisodes) || 0);
  const previous = Math.max(0, Number(show.airedEpisodes) || 0);
  const confirmedAt = new Date(options.confirmedAt || Date.now());
  const source = options.source === 'manual' ? 'manual' : 'tmdb';
  const eventDate = toStoredCalendarDate(options.confirmationDate || confirmedAt);
  let history = normalizeHistory(show.episodeUpdateHistory);
  let historyChanged = false;

  if (current < previous) {
    history = trimCorrectedHistory(history, current);
    historyChanged = true;
  }

  const datedEpisodes = (Array.isArray(options.episodeDates) ? options.episodeDates : [])
    .filter(episode => Number.isInteger(episode.episode_number) && episode.episode_number > 0 &&
      episode.episode_number <= current && toStoredCalendarDate(episode.air_date) &&
      toCalendarDateKey(episode.air_date) <= toCalendarDateKey(eventDate))
    .sort((a, b) => a.episode_number - b.episode_number);
  if (datedEpisodes.length) {
    // 此次季度响应里的日期替换对应集数的旧记录，保留未覆盖的历史。
    const covered = new Set(datedEpisodes.map(episode => episode.episode_number));
    history = history.filter(entry => entry.kind === 'snapshot' ||
      !covered.has(entry.startEpisode) || !covered.has(entry.endEpisode));
    for (const episode of datedEpisodes) mergeHistoryEntry(history, {
      date: toStoredCalendarDate(episode.air_date),
      startEpisode: episode.episode_number,
      endEpisode: episode.episode_number,
      source, kind: 'broadcast', confirmedAt
    });
    historyChanged = true;
  }
  if (current > 0 && eventDate && !datedEpisodes.some(episode => episode.episode_number === current) &&
      (current !== previous || history.length === 0)) {
    mergeHistoryEntry(history, {
      date: eventDate,
      startEpisode: current,
      endEpisode: current,
      source, kind: 'snapshot', confirmedAt
    });
    historyChanged = true;
  }

  history.sort((left, right) => left.date - right.date);
  show.episodeUpdateHistory = history.slice(-MAX_EPISODE_HISTORY_ENTRIES);
  show.episodeProgressConfirmedAt = Number.isNaN(confirmedAt.getTime()) ? new Date() : confirmedAt;
  show.airedEpisodes = current;

  return {
    changed: current !== previous,
    historyChanged,
    previous,
    current
  };
};

module.exports = {
  MAX_EPISODE_HISTORY_ENTRIES,
  confirmEpisodeProgress,
  toCalendarDateKey
};
