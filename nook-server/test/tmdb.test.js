const test = require('node:test');
const assert = require('node:assert/strict');

const { getAiredEpisodeCount } = require('../utils/tmdb');

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
