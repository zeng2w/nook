const { getCalendarDateKeyInTimeZone } = require('./timeZone');

const DUE_SHOW_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const UNKNOWN_SCHEDULE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

const toCalendarDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const getShowSyncDecision = (show, options = {}) => {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const timeZone = options.timeZone || 'UTC';

  if (options.force) return { shouldCheck: true, reason: 'forced' };

  const today = getCalendarDateKeyInTimeZone(now, timeZone);
  const nextAirDate = toCalendarDateKey(show?.nextAirDate);
  if (nextAirDate && nextAirDate > today) {
    return { shouldCheck: false, reason: 'future-air-date' };
  }

  const cooldownMs = nextAirDate
    ? DUE_SHOW_COOLDOWN_MS
    : UNKNOWN_SCHEDULE_COOLDOWN_MS;
  const lastCheckedAt = new Date(show?.lastTmdbCheckedAt || 0);
  if (
    !Number.isNaN(lastCheckedAt.getTime()) &&
    now.getTime() - lastCheckedAt.getTime() < cooldownMs
  ) {
    return { shouldCheck: false, reason: 'cooldown' };
  }

  return {
    shouldCheck: true,
    reason: nextAirDate ? 'air-date-due' : 'unknown-schedule'
  };
};

module.exports = {
  DUE_SHOW_COOLDOWN_MS,
  UNKNOWN_SCHEDULE_COOLDOWN_MS,
  getShowSyncDecision,
  toCalendarDateKey
};
