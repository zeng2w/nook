import test from 'node:test'
import assert from 'node:assert/strict'

import {
  calculateEpisodeForDate,
  formatDateCN,
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

test('episode calculation counts every scheduled update day', () => {
  const show = {
    lastAirDate: '2026-08-03T00:00:00.000Z',
    airedEpisodes: 10,
    totalEpisodes: 20,
    updateFrequency: 'weekly',
    updateDays: [1, 4],
    updateCount: 1,
  }

  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 3)), 'Ep 10')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 6)), 'Ep 11')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 7, 10)), 'Ep 12')
  assert.equal(calculateEpisodeForDate(show, new Date(2026, 6, 30)), 'Ep 9')

  assert.equal(calculateEpisodeForDate({
    ...show,
    lastAirDate: '2026-08-03',
    airedEpisodes: 237,
    totalEpisodes: 300,
  }, new Date(2026, 7, 3)), 'Ep 237')
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
  }), '预计：2026年8月13日')

  assert.equal(getEstimatedDateText({
    status: 'watching',
    lastAirDate: '2026-01-31T00:00:00.000Z',
    airedEpisodes: 3,
    totalEpisodes: 4,
    updateFrequency: 'monthly',
    updateCount: 1,
  }), '预计：2026年2月28日')

  assert.equal(isAfterCalendarDay('2026-08-23', '2026-08-22T00:00:00.000Z'), true)
  assert.equal(isAfterCalendarDay('2026-08-22', '2026-08-22T00:00:00.000Z'), false)
})
