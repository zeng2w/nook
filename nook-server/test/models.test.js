const test = require('node:test');
const assert = require('node:assert/strict');

const History = require('../models/History');
const Show = require('../models/Show');

const USER_ID = '507f1f77bcf86cd799439011';

test('show progress cannot be negative', () => {
  const show = new Show({
    userId: USER_ID,
    title: 'Example',
    category: 'tv',
    watchedEpisodes: -1
  });

  const error = show.validateSync();
  assert.ok(error.errors.watchedEpisodes);
});

test('show update days must be valid weekdays', () => {
  const show = new Show({
    userId: USER_ID,
    title: 'Example',
    category: 'tv',
    updateDays: [1, 7]
  });

  const error = show.validateSync();
  assert.ok(error.errors.updateDays);
});

test('history count and duration cannot be negative', () => {
  const history = new History({ userId: USER_ID, count: -1, duration: -5 });
  const error = history.validateSync();

  assert.ok(error.errors.count);
  assert.ok(error.errors.duration);
});
