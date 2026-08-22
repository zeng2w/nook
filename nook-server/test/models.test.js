const test = require('node:test');
const assert = require('node:assert/strict');

const History = require('../models/History');
const Show = require('../models/Show');
const TvLog = require('../models/TvLog');
const User = require('../models/User');

const USER_ID = '507f1f77bcf86cd799439011';

test('show progress cannot be negative', async () => {
  const show = new Show({
    userId: USER_ID,
    title: 'Example',
    category: 'tv',
    watchedEpisodes: -1
  });

  await assert.rejects(show.validate(), error => Boolean(error.errors.watchedEpisodes));
});

test('show update days must be valid weekdays', async () => {
  const show = new Show({
    userId: USER_ID,
    title: 'Example',
    category: 'tv',
    updateDays: [1, 7]
  });

  await assert.rejects(show.validate(), error => Boolean(error.errors.updateDays));
});

test('show episode counts are integers and cannot exceed a known total', async () => {
  const fractional = new Show({
    userId: USER_ID,
    title: 'Fractional',
    category: 'tv',
    watchedEpisodes: 1.5
  });
  const aboveTotal = new Show({
    userId: USER_ID,
    title: 'Above total',
    category: 'tv',
    totalEpisodes: 10,
    airedEpisodes: 11,
    watchedEpisodes: 12
  });

  await assert.rejects(fractional.validate(), error => Boolean(error.errors.watchedEpisodes));
  await assert.rejects(aboveTotal.validate(), error => (
    Boolean(error.errors.airedEpisodes) && Boolean(error.errors.watchedEpisodes)
  ));
});

test('show title and media URLs are validated', async () => {
  const show = new Show({
    userId: USER_ID,
    title: '   ',
    category: 'tv',
    posterUrl: 'javascript:alert(1)'
  });

  await assert.rejects(show.validate(), error => (
    Boolean(error.errors.title) && Boolean(error.errors.posterUrl)
  ));
});

test('history count and duration cannot be negative', async () => {
  const history = new History({ userId: USER_ID, count: -1, duration: -5 });
  await assert.rejects(history.validate(), error => (
    Boolean(error.errors.count) && Boolean(error.errors.duration)
  ));
});

test('history count and tv activity deltas must be whole numbers', async () => {
  const history = new History({ userId: USER_ID, count: 1.5, duration: 5 });
  const zeroDelta = new TvLog({ userId: USER_ID, showTitle: 'Example', count: 0 });
  const fractionalDelta = new TvLog({ userId: USER_ID, showTitle: 'Example', count: 1.5 });

  await assert.rejects(history.validate(), error => Boolean(error.errors.count));
  await assert.rejects(zeroDelta.validate(), error => Boolean(error.errors.count));
  await assert.rejects(fractionalDelta.validate(), error => Boolean(error.errors.count));
});

test('user-owned collections define compound query indexes', () => {
  assert.ok(History.schema.indexes().some(([keys]) => keys.userId === 1 && keys.date === -1));
  assert.ok(Show.schema.indexes().some(([keys]) => keys.userId === 1 && keys.updatedAt === -1));
  assert.ok(Show.schema.indexes().some(([keys]) => keys.userId === 1 && keys.tmdbId === 1));
  assert.ok(Show.schema.indexes().some(([keys]) => (
    keys.userId === 1 && keys.status === 1 && keys.category === 1 && keys.lastAirDate === -1
  )));
  assert.ok(TvLog.schema.indexes().some(([keys]) => keys.userId === 1 && keys.date === -1));
});

test('email index is unique and case-insensitive', () => {
  const emailIndex = User.schema.indexes().find(([, options]) => (
    options.name === 'email_unique_case_insensitive'
  ));

  assert.ok(emailIndex);
  assert.equal(emailIndex[1].unique, true);
  assert.equal(emailIndex[1].collation.strength, 2);
});
