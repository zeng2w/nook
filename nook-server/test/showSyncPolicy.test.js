const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DUE_SHOW_COOLDOWN_MS,
  UNKNOWN_SCHEDULE_COOLDOWN_MS,
  getShowSyncDecision
} = require('../utils/showSyncPolicy');
const { getCalendarDateKeyInTimeZone, isValidTimeZone } = require('../utils/timeZone');

const NOW = new Date('2026-08-22T16:30:00.000Z');

test('gets the calendar date in the browser time zone', () => {
  assert.equal(getCalendarDateKeyInTimeZone(NOW, 'Asia/Shanghai'), '2026-08-23');
  assert.equal(getCalendarDateKeyInTimeZone(NOW, 'America/Chicago'), '2026-08-22');
  assert.equal(isValidTimeZone('Asia/Shanghai'), true);
  assert.equal(isValidTimeZone('not/a-time-zone'), false);
});

test('skips a show whose next air date is still in the future locally', () => {
  assert.deepEqual(getShowSyncDecision({ nextAirDate: '2026-08-24' }, {
    now: NOW,
    timeZone: 'Asia/Shanghai'
  }), { shouldCheck: false, reason: 'future-air-date' });
});

test('checks a due show only after its two-hour cooldown', () => {
  const recentlyChecked = new Date(NOW.getTime() - DUE_SHOW_COOLDOWN_MS + 1);
  const cooledDown = new Date(NOW.getTime() - DUE_SHOW_COOLDOWN_MS);

  assert.equal(getShowSyncDecision({
    nextAirDate: '2026-08-23',
    lastTmdbCheckedAt: recentlyChecked
  }, { now: NOW, timeZone: 'Asia/Shanghai' }).shouldCheck, false);
  assert.equal(getShowSyncDecision({
    nextAirDate: '2026-08-23',
    lastTmdbCheckedAt: cooledDown
  }, { now: NOW, timeZone: 'Asia/Shanghai' }).shouldCheck, true);
});

test('checks an unknown schedule at most once every 24 hours', () => {
  assert.equal(getShowSyncDecision({
    nextAirDate: null,
    lastTmdbCheckedAt: new Date(NOW.getTime() - UNKNOWN_SCHEDULE_COOLDOWN_MS + 1)
  }, { now: NOW, timeZone: 'Asia/Shanghai' }).shouldCheck, false);
  assert.deepEqual(getShowSyncDecision({
    nextAirDate: null,
    lastTmdbCheckedAt: new Date(NOW.getTime() - UNKNOWN_SCHEDULE_COOLDOWN_MS)
  }, { now: NOW, timeZone: 'Asia/Shanghai' }), {
    shouldCheck: true,
    reason: 'unknown-schedule'
  });
});

test('force mode bypasses schedule and cooldown checks', () => {
  assert.deepEqual(getShowSyncDecision({
    nextAirDate: '2027-01-01',
    lastTmdbCheckedAt: NOW
  }, { force: true, now: NOW, timeZone: 'Asia/Shanghai' }), {
    shouldCheck: true,
    reason: 'forced'
  });
});
