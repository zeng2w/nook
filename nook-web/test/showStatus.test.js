import test from 'node:test'
import assert from 'node:assert/strict'

import { deriveShowStatus } from '../src/utils/showStatus.js'

test('completion requires both aired and watched progress to reach a known total', () => {
  assert.equal(deriveShowStatus({ watchedEpisodes: 0, airedEpisodes: 0, totalEpisodes: 12 }), 'wish')
  assert.equal(deriveShowStatus({ watchedEpisodes: 5, airedEpisodes: 5, totalEpisodes: 0 }), 'watching')
  assert.equal(deriveShowStatus({ watchedEpisodes: 12, airedEpisodes: 11, totalEpisodes: 12 }), 'watching')
  assert.equal(deriveShowStatus({ watchedEpisodes: 12, airedEpisodes: 12, totalEpisodes: 12 }), 'watched')
})

test('an explicit dropped status is preserved', () => {
  assert.equal(deriveShowStatus({
    status: 'dropped',
    watchedEpisodes: 12,
    airedEpisodes: 12,
    totalEpisodes: 12,
  }), 'dropped')
})
