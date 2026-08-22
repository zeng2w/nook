const test = require('node:test');
const assert = require('node:assert/strict');

const { classifyTmdbError, getTimeout } = require('../utils/tmdbClient');

test('TMDB timeout uses a safe default and upper bound', () => {
  const original = process.env.TMDB_TIMEOUT_MS;

  try {
    delete process.env.TMDB_TIMEOUT_MS;
    assert.equal(getTimeout(), 12000);

    process.env.TMDB_TIMEOUT_MS = '5000';
    assert.equal(getTimeout(), 5000);

    process.env.TMDB_TIMEOUT_MS = '999999';
    assert.equal(getTimeout(), 60000);
  } finally {
    if (original === undefined) delete process.env.TMDB_TIMEOUT_MS;
    else process.env.TMDB_TIMEOUT_MS = original;
  }
});

test('TMDB failures are classified for clients', () => {
  assert.equal(classifyTmdbError({ code: 'ECONNABORTED' }).code, 'TMDB_TIMEOUT');
  assert.equal(classifyTmdbError({ response: { status: 401 } }).code, 'TMDB_CONFIGURATION_ERROR');
  assert.equal(classifyTmdbError({ response: { status: 429, headers: {} } }).code, 'TMDB_RATE_LIMITED');
  assert.equal(classifyTmdbError({ code: 'ECONNRESET' }).code, 'TMDB_UNAVAILABLE');
});
