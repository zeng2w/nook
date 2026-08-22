const test = require('node:test');
const assert = require('node:assert/strict');

const {
  QueryValidationError,
  buildShowListPipeline,
  parseShowQuery
} = require('../utils/showQuery');

const USER_ID = '507f1f77bcf86cd799439011';

test('show query parser applies safe pagination and sorting defaults', () => {
  assert.deepEqual(parseShowQuery({}), {
    page: 1,
    limit: 24,
    skip: 0,
    search: '',
    status: undefined,
    category: undefined,
    network: undefined,
    sort: 'date',
    order: 'desc'
  });

  assert.deepEqual(parseShowQuery({
    page: '2',
    limit: '12',
    search: '  Example  ',
    status: 'watching',
    category: 'anime',
    network: 'Netflix',
    sort: 'lag',
    order: 'asc'
  }), {
    page: 2,
    limit: 12,
    skip: 12,
    search: 'Example',
    status: 'watching',
    category: 'anime',
    network: 'Netflix',
    sort: 'lag',
    order: 'asc'
  });
});

test('show query parser rejects unsupported values and oversized search text', () => {
  assert.throws(
    () => parseShowQuery({ status: 'paused' }),
    error => error instanceof QueryValidationError && error.code === 'INVALID_QUERY'
  );
  assert.throws(
    () => parseShowQuery({ sort: 'createdAt' }),
    error => error instanceof QueryValidationError && error.code === 'INVALID_QUERY'
  );
  assert.throws(
    () => parseShowQuery({ search: 'x'.repeat(101) }),
    error => error instanceof QueryValidationError && error.code === 'INVALID_QUERY'
  );
});

test('show list pipeline escapes search text and builds global facets', () => {
  const options = parseShowQuery({
    search: 'A+B',
    status: 'watching',
    category: 'tv',
    network: 'Netflix',
    sort: 'lag'
  });
  const pipeline = buildShowListPipeline(USER_ID, options);
  const baseMatch = pipeline[0].$match;
  const facets = pipeline[1].$facet;

  assert.equal(baseMatch.userId, USER_ID);
  assert.equal(baseMatch.title.$regex.test('A+B'), true);
  assert.equal(baseMatch.title.$regex.test('AAAB'), false);
  assert.deepEqual(facets.items[0].$match, {
    status: 'watching',
    category: 'tv',
    network: 'Netflix'
  });
  assert.deepEqual(facets.statusCounts[0].$match, {
    category: 'tv',
    network: 'Netflix'
  });
  assert.deepEqual(facets.categoryCounts[0].$match, {
    status: 'watching',
    network: 'Netflix'
  });
  assert.equal(facets.items[2].$sort.sortLag, -1);
});
