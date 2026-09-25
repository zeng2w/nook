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
          source: entry.source || 'tmdb'
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
  const existing = history.find(entry => toCalendarDateKey(entry.date) === incomingKey);
  if (existing) {
    existing.startEpisode = Math.min(existing.startEpisode, incoming.startEpisode);
    existing.endEpisode = Math.max(existing.endEpisode, incoming.endEpisode);
    existing.source = incoming.source;
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
  const eventDate = toStoredCalendarDate(options.eventDate || confirmedAt);
  const updateCount = Math.max(1, Number(options.updateCount ?? show.updateCount) || 1);
  let history = normalizeHistory(show.episodeUpdateHistory);
  let historyChanged = false;

  if (current < previous) {
    history = trimCorrectedHistory(history, current);
    historyChanged = true;
  } else if (current > previous && eventDate) {
    const startEpisode = previous > 0
      ? previous + 1
      : Math.max(1, current - updateCount + 1);
    mergeHistoryEntry(history, {
      date: eventDate,
      startEpisode,
      endEpisode: current,
      source
    });
    historyChanged = true;
  } else if (current > 0 && history.length === 0 && eventDate) {
    mergeHistoryEntry(history, {
      date: eventDate,
      startEpisode: Math.max(1, current - updateCount + 1),
      endEpisode: current,
      source
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
