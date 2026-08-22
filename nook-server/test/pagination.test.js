const test = require('node:test');
const assert = require('node:assert/strict');
const { findPage, getPagination } = require('../utils/pagination');

test('pagination applies safe defaults and an upper limit', () => {
  assert.deepEqual(getPagination({}), { page: 1, limit: 24, skip: 0 });
  assert.deepEqual(getPagination({ page: '3', limit: '1000' }), { page: 3, limit: 100, skip: 200 });
});

test('findPage returns items and pagination metadata', async () => {
  const calls = {};
  const query = {
    select(value) { calls.select = value; return this; },
    sort(value) { calls.sort = value; return this; },
    skip(value) { calls.skip = value; return this; },
    limit(value) { calls.limit = value; return this; },
    async lean() { return [{ _id: 'one' }]; }
  };
  const Model = {
    find(filter) { calls.filter = filter; return query; },
    async countDocuments() { return 25; }
  };

  const result = await findPage(Model, { userId: 'user' }, {
    query: { page: 2, limit: 10 },
    select: '-userId',
    sort: { date: -1 }
  });

  assert.deepEqual(calls, {
    select: '-userId',
    sort: { date: -1 },
    skip: 10,
    limit: 10,
    filter: { userId: 'user' }
  });
  assert.deepEqual(result.pagination, {
    page: 2,
    limit: 10,
    total: 25,
    totalPages: 3,
    hasMore: true
  });
});
