const test = require('node:test');
const assert = require('node:assert/strict');

const { getSyncConcurrency, mapWithConcurrency } = require('../utils/concurrency');

test('concurrent mapping preserves order and respects the limit', async () => {
  let active = 0;
  let maxActive = 0;

  const results = await mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
    active++;
    maxActive = Math.max(maxActive, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    return value * 2;
  });

  assert.deepEqual(results, [2, 4, 6, 8, 10]);
  assert.equal(maxActive, 2);
});

test('TMDB synchronization concurrency is bounded', () => {
  const original = process.env.TMDB_SYNC_CONCURRENCY;

  try {
    delete process.env.TMDB_SYNC_CONCURRENCY;
    assert.equal(getSyncConcurrency(), 3);
    process.env.TMDB_SYNC_CONCURRENCY = '99';
    assert.equal(getSyncConcurrency(), 5);
  } finally {
    if (original === undefined) delete process.env.TMDB_SYNC_CONCURRENCY;
    else process.env.TMDB_SYNC_CONCURRENCY = original;
  }
});
