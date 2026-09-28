const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const Show = require('../models/Show');
const tmdb = require('../utils/tmdbClient');

// Stub the remote client before loading the router; no real TMDB requests or database writes.
let responses;
let requests;
tmdb.tmdbGet = async path => {
  requests.push(path);
  assert.ok(responses[path], `Unexpected TMDB request: ${path}`);
  return { data: responses[path], tmdbCache: 'miss' };
};
const routes = require('../routes/shows');
let userNumber = 0;

async function syncShow(show, remoteResponses) {
  responses = remoteResponses;
  requests = [];
  const originalFind = Show.find;
  const originalUpdate = Show.updateOne;
  const markers = [];
  Show.find = () => ({ select: async () => [show] });
  Show.updateOne = async (query, update) => { markers.push(update.$set); };
  const app = express();
  app.use(express.json());
  app.use((req, res, next) => { req.user = { id: `sync-test-${++userNumber}` }; next(); });
  app.use('/shows', routes);
  try {
    const response = await request(app).post('/shows/sync').send({ force: true, timeZone: 'Asia/Shanghai' });
    return { response, markers };
  } finally {
    Show.find = originalFind;
    Show.updateOne = originalUpdate;
  }
}

test('incomplete API confirmation preserves tracked and legacy progress, history and schedule', async () => {
  for (const seasonNumber of [1, undefined]) {
    for (const lastEpisode of [undefined, null, {}]) {
      const show = { _id: 'show', tmdbId: 100, seasonNumber, category: 'tv',
        status: 'watching', updateFrequency: 'weekly', updateDays: [5],
        airedEpisodes: 19, totalEpisodes: 30, watchedEpisodes: 1,
        lastAirDate: '2026-09-25', nextAirDate: '2026-09-28',
        episodeProgressConfirmedAt: '2026-09-25T00:00:00Z',
        episodeUpdateHistory: [{ date: '2026-09-25', startEpisode: 18, endEpisode: 19 }],
        save: async () => assert.fail('Incomplete progress must not be saved') };
      const before = JSON.stringify(show);
      const { response, markers } = await syncShow(show, {
        '/tv/100': { status: 'Ended', last_episode_to_air: lastEpisode }
      });
      assert.equal(response.status, 502);
      assert.equal(response.body.code, 'TMDB_PROGRESS_UNAVAILABLE');
      assert.equal(JSON.stringify(show), before);
      assert.equal(markers[0].lastTmdbSyncStatus, 'error');
      assert.deepEqual(requests, ['/tv/100']);
    }
  }
});

test('sync reopens a finale-marked season with a later episode but does not announce an aired update', async () => {
  let saves = 0;
  const show = { _id: 'show', title: 'Example', tmdbId: 100, seasonNumber: 1, category: 'tv',
    status: 'watching', updateFrequency: 'ended', updateDays: [],
    airedEpisodes: 19, totalEpisodes: 20, watchedEpisodes: 1,
    episodeUpdateHistory: [], save: async () => { saves++; } };
  const last = { season_number: 1, episode_number: 19, air_date: '2026-01-01', episode_type: 'finale' };
  const next = { season_number: 1, episode_number: 20, air_date: '2099-10-01' };
  const { response } = await syncShow(show, {
    '/tv/100': { status: 'Ended', last_episode_to_air: last, next_episode_to_air: next },
    '/tv/100/season/1': { season_number: 1, episodes: [last, next] }
  });
  assert.equal(response.status, 200);
  assert.equal(saves, 1);
  assert.equal(show.airedEpisodes, 19);
  assert.equal(show.updateFrequency, 'weekly');
  assert.equal(show.nextAirDate, '2099-10-01');
  assert.equal(response.body.changedCount, 1);
  assert.deepEqual(response.body.logs, []);
});
