const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyTmdbCategory,
  getAiredEpisodeCount,
  getTmdbMediaType,
  getRecommendedSeasonNumber,
  getTmdbSchedule,
  getTmdbSeasonProgress,
  hasTmdbSeasonActivity
} = require('../utils/tmdb');

test('classifies TMDB search results by media type and genre', () => {
  assert.equal(classifyTmdbCategory({ media_type: 'movie', genre_ids: [16] }), 'movie');
  assert.equal(classifyTmdbCategory({ media_type: 'tv', origin_country: ['JP'], genre_ids: [18] }), 'tv');
  assert.equal(classifyTmdbCategory({ media_type: 'tv', genre_ids: [16, 10759] }), 'anime');
  assert.equal(classifyTmdbCategory({ media_type: 'tv', genre_ids: [10764] }), 'variety');
  assert.equal(classifyTmdbCategory({ media_type: 'tv', genre_ids: [10767] }), 'variety');
  assert.equal(getTmdbMediaType('anime'), 'tv');
  assert.equal(getTmdbMediaType('variety'), 'tv');
  assert.equal(getTmdbMediaType('movie'), 'movie');
});

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

test('recommends the currently updating or most recently updated season', () => {
  const seasons = [
    { season_number: 0, air_date: '2026-01-01' },
    { season_number: 1, air_date: '2024-01-01' },
    { season_number: 2, air_date: '2025-01-01' },
    { season_number: 3, air_date: '2027-01-01' }
  ];

  assert.equal(getRecommendedSeasonNumber({
    seasons,
    next_episode_to_air: { season_number: 3 }
  }, { today: '2026-09-21' }), 3);
  assert.equal(getRecommendedSeasonNumber({
    seasons,
    last_episode_to_air: { season_number: 2 }
  }, { today: '2026-09-21' }), 2);
  assert.equal(getRecommendedSeasonNumber({ seasons }, { today: '2026-09-21' }), 2);
});

test('detects activity only when it belongs to the tracked season', () => {
  assert.equal(hasTmdbSeasonActivity({
    next_episode_to_air: { season_number: 2, episode_number: 5 }
  }, 2, 4), true);
  assert.equal(hasTmdbSeasonActivity({
    last_episode_to_air: { season_number: 2, episode_number: 5 }
  }, 2, 4), true);
  assert.equal(hasTmdbSeasonActivity({
    last_episode_to_air: { season_number: 3, episode_number: 1 }
  }, 2, 4), false);
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
  assert.deepEqual(getTmdbSchedule({
    status: 'Ended',
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

test('an explicit future episode reactivates a season despite a stale ended status', () => {
  const progress = getTmdbSeasonProgress({
    season_number: 1,
    episodes: [
      { episode_number: 12, air_date: '2026-09-01' },
      { episode_number: 13, air_date: '2026-10-01' }
    ]
  }, {
    name: 'Returning Example',
    status: 'Ended',
    next_episode_to_air: { season_number: 1, episode_number: 13, air_date: '2026-10-01' },
    seasons: [{ season_number: 1, air_date: '2026-01-01', episode_count: 13 }]
  }, { today: '2026-09-21' });

  assert.equal(progress.updateFrequency, 'weekly');
  assert.equal(progress.nextAirDate, '2026-10-01');
  assert.equal(progress.isEnded, false);
});
