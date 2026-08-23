const test = require('node:test');
const assert = require('node:assert/strict');

const { getAiredEpisodeCount, getTmdbSchedule, getTmdbSeasonProgress } = require('../utils/tmdb');

test('counts aired episodes across completed seasons', () => {
  const count = getAiredEpisodeCount({
    last_episode_to_air: { season_number: 3, episode_number: 4 },
    seasons: [
      { season_number: 0, episode_count: 8 },
      { season_number: 1, episode_count: 10 },
      { season_number: 2, episode_count: 12 },
      { season_number: 3, episode_count: 10 }
    ]
  });

  assert.equal(count, 26);
});

test('uses the current episode number during the first season', () => {
  const count = getAiredEpisodeCount({
    last_episode_to_air: { season_number: 1, episode_number: 6 },
    seasons: [{ season_number: 1, episode_count: 10 }]
  });

  assert.equal(count, 6);
});

test('falls back to the total when no last episode is available', () => {
  assert.equal(getAiredEpisodeCount({ number_of_episodes: 20 }), 20);
});

test('uses the next TMDB episode as the calendar schedule anchor', () => {
  assert.deepEqual(getTmdbSchedule({
    status: 'Returning Series',
    next_episode_to_air: { air_date: '2026-09-07' }
  }), {
    updateFrequency: 'weekly',
    updateDays: [1],
    nextAirDate: '2026-09-07'
  });
});

test('does not extrapolate schedules during a hiatus', () => {
  assert.deepEqual(getTmdbSchedule({ status: 'Returning Series' }), {
    updateFrequency: 'unknown',
    updateDays: [],
    nextAirDate: null
  });
  assert.deepEqual(getTmdbSchedule({ status: 'Ended' }), {
    updateFrequency: 'ended',
    updateDays: [],
    nextAirDate: null
  });
});

test('calculates progress and the next episode for one season', () => {
  const progress = getTmdbSeasonProgress({
    season_number: 2,
    name: 'Season 2',
    episodes: [
      { episode_number: 1, air_date: '2026-08-03' },
      { episode_number: 2, air_date: '2026-08-10' },
      { episode_number: 3, air_date: '2026-08-30' }
    ]
  }, {
    name: 'Example Show',
    status: 'Returning Series',
    next_episode_to_air: { season_number: 2, episode_number: 3, air_date: '2026-08-30' },
    seasons: [{ season_number: 2, air_date: '2026-08-03', episode_count: 3 }]
  }, { today: '2026-08-23' });

  assert.deepEqual(progress, {
    seriesTitle: 'Example Show',
    seasonNumber: 2,
    seasonName: 'Season 2',
    totalEpisodes: 3,
    airedEpisodes: 2,
    lastAirDate: '2026-08-10',
    nextAirDate: '2026-08-30',
    updateFrequency: 'weekly',
    updateDays: [0],
    updateCount: 1,
    isEnded: false
  });
});

test('marks an older season as ended without ending the whole series', () => {
  const progress = getTmdbSeasonProgress({
    season_number: 1,
    episodes: [
      { episode_number: 1, air_date: '2025-01-01' },
      { episode_number: 2, air_date: '2025-01-08' }
    ]
  }, {
    name: 'Example Show',
    status: 'Returning Series',
    last_episode_to_air: { season_number: 2, episode_number: 4, air_date: '2026-08-20' },
    seasons: [
      { season_number: 1, air_date: '2025-01-01', episode_count: 2 },
      { season_number: 2, air_date: '2026-08-01', episode_count: 8 }
    ]
  }, { today: '2026-08-23' });

  assert.equal(progress.airedEpisodes, 2);
  assert.equal(progress.updateFrequency, 'ended');
  assert.equal(progress.nextAirDate, null);
  assert.equal(progress.isEnded, true);
});

test('uses a TMDB finale marker to end the latest season', () => {
  const progress = getTmdbSeasonProgress({
    season_number: 3,
    episodes: [
      { episode_number: 1, air_date: '2026-08-01' },
      { episode_number: 2, air_date: '2026-08-08', episode_type: 'finale' }
    ]
  }, {
    name: 'Example Show',
    status: 'Returning Series',
    last_episode_to_air: {
      season_number: 3,
      episode_number: 2,
      air_date: '2026-08-08',
      episode_type: 'finale'
    },
    seasons: [{ season_number: 3, air_date: '2026-08-01', episode_count: 2 }]
  }, { today: '2026-08-23' });

  assert.equal(progress.airedEpisodes, 2);
  assert.equal(progress.updateFrequency, 'ended');
  assert.equal(progress.isEnded, true);
});
