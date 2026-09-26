const test = require('node:test');
const assert = require('node:assert/strict');

const {
  applyDerivedShowStatus,
  deriveShowStatus,
  getSyncedEpisodeCount
} = require('../utils/showStatus');

test('marks a show watched only after every accepted episode aired and was watched', () => {
  assert.equal(deriveShowStatus({ watchedEpisodes: 0, airedEpisodes: 0, totalEpisodes: 12 }), 'wish');
  assert.equal(deriveShowStatus({ watchedEpisodes: 5, airedEpisodes: 5, totalEpisodes: 12 }), 'watching');
  assert.equal(deriveShowStatus({ watchedEpisodes: 12, airedEpisodes: 11, totalEpisodes: 12 }), 'watching');
  assert.equal(deriveShowStatus({
    status: 'watching',
    watchedEpisodes: 12,
    airedEpisodes: 12,
    totalEpisodes: 12,
    updateFrequency: 'weekly'
  }), 'watched');
});

test('returns a completed show to watching when its total grows', () => {
  const show = {
    status: 'watched',
    watchedEpisodes: 12,
    airedEpisodes: 13,
    totalEpisodes: 13
  };

  assert.equal(applyDerivedShowStatus(show), true);
  assert.equal(show.status, 'watching');
  assert.equal(applyDerivedShowStatus(show), false);
});

test('preserves an explicit dropped status', () => {
  assert.equal(deriveShowStatus({
    status: 'dropped',
    watchedEpisodes: 12,
    totalEpisodes: 12
  }), 'dropped');
});

test('does not treat catching up as completion when no total is known', () => {
  assert.equal(deriveShowStatus({ watchedEpisodes: 5, airedEpisodes: 5 }), 'watching');
  assert.equal(deriveShowStatus({ watchedEpisodes: 4, airedEpisodes: 5 }), 'watching');
});

test('a locked local total caps TMDB aired progress without changing unlocked shows', () => {
  assert.equal(getSyncedEpisodeCount({ totalEpisodesLocked: true, totalEpisodes: 12 }, 13), 12);
  assert.equal(getSyncedEpisodeCount({ totalEpisodesLocked: false, totalEpisodes: 12 }, 13), 13);
  assert.equal(getSyncedEpisodeCount({ totalEpisodesLocked: true, totalEpisodes: 0 }, 13), 13);
});

test('starting at zero stays watching and completion records the viewing date once', () => {
  assert.equal(deriveShowStatus({ trackingStarted: true, watchedEpisodes: 0 }), 'watching');
  const show = { status: 'watching', watchedEpisodes: 12, airedEpisodes: 12, totalEpisodes: 12 };
  applyDerivedShowStatus(show);
  assert.equal(show.status, 'watched');
  assert.ok(show.completedAt instanceof Date);
  const date = show.completedAt;
  applyDerivedShowStatus(show);
  assert.equal(show.completedAt, date);
  Object.assign(show, { status: 'watching', watchedEpisodes: 0, trackingStarted: true });
  applyDerivedShowStatus(show);
  assert.equal(show.status, 'watching');
  assert.equal(show.completedAt, date);
});
