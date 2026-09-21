import test from 'node:test'
import assert from 'node:assert/strict'

import { getDefaultSeasonNumber } from '../src/utils/seasons.js'

test('selects the recommended season when it exists', () => {
  assert.equal(getDefaultSeasonNumber({
    recommendedSeasonNumber: 2,
    seasons: [{ seasonNumber: 1 }, { seasonNumber: 2 }, { seasonNumber: 3 }],
  }), 2)
})

test('automatically selects a single season', () => {
  assert.equal(getDefaultSeasonNumber({ seasons: [{ seasonNumber: 1 }] }), 1)
})

test('falls back to the latest numbered season', () => {
  assert.equal(getDefaultSeasonNumber({
    recommendedSeasonNumber: 99,
    seasons: [{ seasonNumber: 1 }, { seasonNumber: 3 }, { seasonNumber: 2 }],
  }), 3)
  assert.equal(getDefaultSeasonNumber({ seasons: [] }), null)
})
