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

test('history count and duration cannot be negative', async () => {
  const history = new History({ userId: USER_ID, count: -1, duration: -5 });
  await assert.rejects(history.validate(), error => (
    Boolean(error.errors.count) && Boolean(error.errors.duration)
  ));
});

test('user-owned collections define compound query indexes', () => {
  assert.ok(History.schema.indexes().some(([keys]) => keys.userId === 1 && keys.date === -1));
  assert.ok(Show.schema.indexes().some(([keys]) => keys.userId === 1 && keys.updatedAt === -1));
  assert.ok(Show.schema.indexes().some(([keys]) => keys.userId === 1 && keys.tmdbId === 1));
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
