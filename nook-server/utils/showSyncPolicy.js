const { getCalendarDateKeyInTimeZone } = require('./timeZone');

const DUE_SHOW_COOLDOWN_MS = 2 * 60 * 60 * 1000;
const UNKNOWN_SCHEDULE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const DORMANT_SHOW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const FAILED_SYNC_RETRY_MS = 15 * 60 * 1000;

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

  const lastCheckedAt = new Date(show?.lastTmdbCheckedAt || 0);
  const elapsedSinceLastCheck = now.getTime() - lastCheckedAt.getTime();
  const today = getCalendarDateKeyInTimeZone(now, timeZone);
  const nextAirDate = toCalendarDateKey(show?.nextAirDate);

  // A failed forced check for a future episode should not cause unnecessary
  // retries before that episode is due. For eligible shows, however, use a
  // much shorter cooldown than the normal 2-hour/24-hour/7-day schedules.
  if (nextAirDate && nextAirDate > today) {
    return { shouldCheck: false, reason: 'future-air-date' };
  }
  if (show?.lastTmdbSyncStatus === 'error') {
    if (
      !Number.isNaN(lastCheckedAt.getTime()) &&
      elapsedSinceLastCheck < FAILED_SYNC_RETRY_MS
    ) {
      return { shouldCheck: false, reason: 'failed-retry-cooldown' };
    }
    return { shouldCheck: true, reason: 'failed-retry' };
  }

  if (show?.updateFrequency === 'ended') {
    if (
      !Number.isNaN(lastCheckedAt.getTime()) &&
      elapsedSinceLastCheck < DORMANT_SHOW_COOLDOWN_MS
    ) {
      return { shouldCheck: false, reason: 'dormant-cooldown' };
    }
    return { shouldCheck: true, reason: 'dormant-recheck' };
  }

  const cooldownMs = nextAirDate
    ? DUE_SHOW_COOLDOWN_MS
    : UNKNOWN_SCHEDULE_COOLDOWN_MS;
  if (
    !Number.isNaN(lastCheckedAt.getTime()) &&
    elapsedSinceLastCheck < cooldownMs
  ) {
    return { shouldCheck: false, reason: 'cooldown' };
  }

  return {
    shouldCheck: true,
    reason: nextAirDate ? 'air-date-due' : 'unknown-schedule'
  };
};

module.exports = {
  DORMANT_SHOW_COOLDOWN_MS,
  DUE_SHOW_COOLDOWN_MS,
  FAILED_SYNC_RETRY_MS,
  UNKNOWN_SCHEDULE_COOLDOWN_MS,
  getShowSyncDecision,
  toCalendarDateKey
};
