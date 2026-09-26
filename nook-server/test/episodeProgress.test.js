const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MAX_EPISODE_HISTORY_ENTRIES,
  confirmEpisodeProgress,
  toCalendarDateKey
} = require('../utils/episodeProgress');

test('catch-up sync records each episode on its own broadcast date', () => {
  const show = { airedEpisodes: 19, episodeUpdateHistory: [] };
  confirmEpisodeProgress(show, 25, {
    confirmedAt: '2026-09-26T08:00:00Z', confirmationDate: '2026-09-26',
    episodeDates: [20, 21, 22, 23, 24, 25].map((episode_number, index) => ({
      episode_number, air_date: `2026-09-${24 + Math.floor(index / 2)}`
    }))
  });
  assert.deepEqual(show.episodeUpdateHistory.map(e => [toCalendarDateKey(e.date), e.startEpisode, e.endEpisode]), [
    ['2026-09-24', 20, 21], ['2026-09-25', 22, 23], ['2026-09-26', 24, 25]
  ]);
});

test('unknown dates create a progress snapshot, not an invented broadcast range', () => {
  const show = { airedEpisodes: 19, episodeUpdateHistory: [] };
  confirmEpisodeProgress(show, 25, {
    confirmedAt: '2026-09-25T17:00:00Z', confirmationDate: '2026-09-26', eventDate: '2026-09-23'
  });
  const entry = show.episodeUpdateHistory[0];
  assert.equal(entry.kind, 'snapshot');
  assert.equal(toCalendarDateKey(entry.date), '2026-09-26');
  assert.equal(entry.startEpisode, 25);
  assert.equal(entry.endEpisode, 25);
  confirmEpisodeProgress(show, 28, {
    confirmedAt: '2026-09-25T18:00:00Z', confirmationDate: '2026-09-26'
  });
  assert.equal(show.episodeUpdateHistory.length, 1);
  assert.equal(show.episodeUpdateHistory[0].endEpisode, 28);
});

test('episode confirmations keep an immutable daily history and confirmation time', () => {
  const show = {
    airedEpisodes: 19,
    updateCount: 2,
    episodeUpdateHistory: []
  };

  const baseline = confirmEpisodeProgress(show, 19, {
    confirmedAt: '2026-09-25T08:30:00.000Z',
    eventDate: '2026-09-23',
    episodeDates: [18, 19].map(episode_number => ({ episode_number, air_date: '2026-09-23' })),
    source: 'tmdb'
  });

  assert.equal(baseline.changed, false);
  assert.equal(baseline.historyChanged, true);
  assert.equal(show.episodeProgressConfirmedAt.toISOString(), '2026-09-25T08:30:00.000Z');
  assert.deepEqual(show.episodeUpdateHistory.map(entry => ({
    date: toCalendarDateKey(entry.date),
    startEpisode: entry.startEpisode,
    endEpisode: entry.endEpisode,
    source: entry.source
  })), [{
    date: '2026-09-23',
    startEpisode: 18,
    endEpisode: 19,
    source: 'tmdb'
  }]);

  confirmEpisodeProgress(show, 21, {
    confirmedAt: '2026-09-26T08:30:00.000Z',
    eventDate: '2026-09-26',
    episodeDates: [20, 21].map(episode_number => ({ episode_number, air_date: '2026-09-26' })),
    source: 'tmdb'
  });
  confirmEpisodeProgress(show, 21, {
    confirmedAt: '2026-09-26T10:30:00.000Z',
    eventDate: '2026-09-26',
    source: 'tmdb'
  });

  assert.equal(show.episodeUpdateHistory.length, 2);
  assert.deepEqual(show.episodeUpdateHistory.map(entry => [
    toCalendarDateKey(entry.date),
    entry.startEpisode,
    entry.endEpisode
  ]), [
    ['2026-09-23', 18, 19],
    ['2026-09-26', 20, 21]
  ]);
});

test('episode corrections trim impossible future history and history stays bounded', () => {
  const show = {
    airedEpisodes: 10,
    updateCount: 1,
    episodeUpdateHistory: Array.from({ length: MAX_EPISODE_HISTORY_ENTRIES + 10 }, (_, index) => ({
      date: new Date(Date.UTC(2025, 0, index + 1, 12)),
      startEpisode: index + 1,
      endEpisode: index + 1,
      source: 'tmdb'
    }))
  };

  confirmEpisodeProgress(show, 8, {
    confirmedAt: '2026-09-25T08:30:00.000Z',
    eventDate: '2026-09-25',
    source: 'manual'
  });

  assert.equal(show.airedEpisodes, 8);
  assert.ok(show.episodeUpdateHistory.every(entry => entry.endEpisode <= 8));
  assert.ok(show.episodeUpdateHistory.length <= MAX_EPISODE_HISTORY_ENTRIES);
});
