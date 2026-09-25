import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateEpisodeForDate,
  formatDateCN,
  getCalendarEpisodeEntry,
  getCurrentTimeZoneLabel,
  getEstimatedDateText,
  isAfterCalendarDay,
  isShowUpdateDay,
  toCalendarDateInput,
  toLocalCalendarDate,
} from '../src/utils/dateUtils.js'

test('calendar dates preserve their written day in the current timezone', () => {
  const date = toLocalCalendarDate('2026-08-22T23:30:00-05:00')

  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 7)
  assert.equal(date.getDate(), 22)
  assert.equal(date.getHours(), 12)
  assert.equal(formatDateCN('2026-08-22T00:00:00.000Z'), '2026年8月22日')
  assert.equal(toCalendarDateInput('2026-08-22T23:30:00-05:00'), '2026-08-22')
  assert.ok(getCurrentTimeZoneLabel())
})

test('update days support weekly fallback and end-of-month schedules', () => {
  assert.equal(isShowUpdateDay({
    updateFrequency: 'weekly',
    updateDays: ['1', 4],
    lastAirDate: '2026-08-03',
  }, new Date(2026, 7, 6)), true)

  assert.equal(isShowUpdateDay({
    updateFrequency: 'weekly',
    updateDays: [],
    lastAirDate: '2026-08-03',
  }, new Date(2026, 7, 10)), true)

  assert.equal(isShowUpdateDay({
    updateFrequency: 'monthly',
    lastAirDate: '2026-01-31',
  }, new Date(2026, 1, 28)), true)
})

test('a known next episode prevents updates from appearing during a hiatus', () => {
  const show = {
    updateFrequency: 'weekly',
    updateDays: [1],
    updateCount: 1,
    lastAirDate: '2026-08-03',
    nextAirDate: '2026-09-07',
    airedEpisodes: 237,
    totalEpisodes: 300,
  }

  assert.equal(isShowUpdateDay(show, '2026-08-10'), false)
  assert.equal(isShowUpdateDay(show, '2026-09-07'), true)
  assert.equal(calculateEpisodeForDate(show, '2026-09-07', '2026-08-10'), 'Ep 238')
})

test('a manually locked weekly schedule takes priority over the TMDB next date', () => {
  const show = {
    updateFrequency: 'weekly',
    updateDays: [1],
    scheduleLocked: true,
    lastAirDate: '2026-08-23',
    nextAirDate: '2026-09-28',
    airedEpisodes: 4,
    totalEpisodes: 16,
  }

  assert.equal(isShowUpdateDay(show, '2026-08-24'), true)
  assert.equal(calculateEpisodeForDate(show, '2026-08-24', '2026-08-23'), 'Ep 5')
})

test('episode calculation counts every scheduled update day', () => {
  const show = {
    lastAirDate: '2026-08-03T00:00:00.000Z',
    airedEpisodes: 10,
    totalEpisodes: 20,
    updateFrequency: 'weekly',
    updateDays: [1, 4],
    updateCount: 1,
  }

  const referenceDate = new Date(2026, 7, 3)
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 3), referenceDate), 'Ep 10')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 6), referenceDate), 'Ep 11')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 10), referenceDate), 'Ep 12')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 6, 30), referenceDate), 'Ep 9')

  assert.equal(calculateEpisodeForDate({
    ...show,
    lastAirDate: '2026-08-03',
    airedEpisodes: 237,
    totalEpisodes: 300,
  }, new Date(2026, 7, 3), referenceDate), 'Ep 237')
})

test('recurring calendar projections rebase on the currently aired episode count', () => {
  const show = {
    lastAirDate: '2026-09-21',
    airedEpisodes: 19,
    totalEpisodes: 30,
    updateFrequency: 'daily',
    updateCount: 2,
  }

  assert.equal(calculateEpisodeForDate(show, '2026-09-24', '2026-09-25'), '16-17')
  assert.equal(calculateEpisodeForDate(show, '2026-09-25', '2026-09-25'), '18-19')
  assert.equal(calculateEpisodeForDate(show, '2026-09-26', '2026-09-25'), '20-21')
})

test('calendar history stays confirmed while only future dates are projected', () => {
  const show = {
    status: 'watching',
    lastAirDate: '2026-09-23',
    airedEpisodes: 19,
    totalEpisodes: 30,
    updateFrequency: 'daily',
    updateCount: 2,
    episodeProgressConfirmedAt: '2026-09-25T08:30:00.000Z',
    episodeUpdateHistory: [{
      date: '2026-09-23',
      startEpisode: 18,
      endEpisode: 19,
      source: 'tmdb',
    }],
  }

  assert.deepEqual(getCalendarEpisodeEntry(show, '2026-09-23', '2026-09-25'), {
    episodeText: '18-19',
    type: 'confirmed',
    statusText: '已更',
    confirmedAt: '2026-09-25T08:30:00.000Z',
  })
  assert.equal(getCalendarEpisodeEntry(show, '2026-09-24', '2026-09-25'), null)
  assert.deepEqual(getCalendarEpisodeEntry(show, '2026-09-25', '2026-09-25'), {
    episodeText: 'Ep 19',
    type: 'confirmed',
    statusText: '当前',
    confirmedAt: '2026-09-25T08:30:00.000Z',
  })
  assert.deepEqual(getCalendarEpisodeEntry(show, '2026-09-26', '2026-09-25'), {
    episodeText: '20-21',
    type: 'estimated',
    statusText: '预计',
    confirmedAt: '2026-09-25T08:30:00.000Z',
  })
})

test('an explicit next air date is labeled as scheduled instead of estimated', () => {
  const show = {
    status: 'watching',
    lastAirDate: '2026-09-23',
    nextAirDate: '2026-09-28',
    airedEpisodes: 19,
    totalEpisodes: 30,
    updateFrequency: 'weekly',
    updateDays: [1],
    updateCount: 1,
    episodeProgressConfirmedAt: '2026-09-25T08:30:00.000Z',
  }

  assert.deepEqual(getCalendarEpisodeEntry(show, '2026-09-28', '2026-09-25'), {
    episodeText: 'Ep 20',
    type: 'scheduled',
    statusText: '排期',
    confirmedAt: '2026-09-25T08:30:00.000Z',
  })
})

test('estimated finish dates use local calendar arithmetic', () => {
  assert.equal(getEstimatedDateText({
    status: 'watching',
    lastAirDate: '2026-08-03T00:00:00.000Z',
    airedEpisodes: 10,
    totalEpisodes: 13,
    updateFrequency: 'weekly',
    updateDays: [1, 4],
    updateCount: 1,
  }, '2026-08-03'), '预计：2026年8月13日')

  assert.equal(getEstimatedDateText({
    status: 'watching',
    lastAirDate: '2026-01-31T00:00:00.000Z',
    airedEpisodes: 3,
    totalEpisodes: 4,
    updateFrequency: 'monthly',
    updateCount: 1,
  }, '2026-01-31'), '预计：2026年2月28日')

  assert.equal(isAfterCalendarDay('2026-08-23', '2026-08-22T00:00:00.000Z'), true)
  assert.equal(isAfterCalendarDay('2026-08-22', '2026-08-22T00:00:00.000Z'), false)
})

test('completion captions distinguish a broadcast ending from watched status', async () => {
  const { getCompletionCaption } = await import('../src/utils/dateUtils.js');
  assert.equal(getCompletionCaption({ updateFrequency: 'ended', lastAirDate: '2026-10-30' }), '2026.10.30 播毕');
  assert.equal(getCompletionCaption({ updateFrequency: 'ended' }), '已播毕');
  assert.equal(getCompletionCaption({ totalEpisodes: 0 }), '完结时间待定');
  const caption = getCompletionCaption({ status: 'watched', totalEpisodes: 10, airedEpisodes: 9, updateFrequency: 'daily', lastAirDate: '2026-10-29', updateCount: 1 }, new Date(2026, 9, 29));
  assert.equal(caption, '预计 2026.10.30 完结');
});
