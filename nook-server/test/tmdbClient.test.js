const test = require('node:test');
const assert = require('node:assert/strict');

const {
  classifyTmdbError,
  createTmdbGet,
  getCacheTtl,
  getTimeout
} = require('../utils/tmdbClient');

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

test('TMDB cache reuses successful responses until expiry', async () => {
  const originalKey = process.env.TMDB_API_KEY;
  let currentTime = 1000;
  let requestCount = 0;
  const client = {
    async get() {
      requestCount++;
      return { data: { requestCount }, status: 200, headers: {} };
    }
  };
  const get = createTmdbGet(client, { now: () => currentTime, maxEntries: 2 });

  try {
    process.env.TMDB_API_KEY = 'test-key';
    const first = await get('/tv/1', { cacheTtlMs: 100, params: { language: 'zh-CN' } });
    const cached = await get('/tv/1', { cacheTtlMs: 100, params: { language: 'zh-CN' } });

    assert.equal(first.data.requestCount, 1);
    assert.equal(cached.data.requestCount, 1);
    assert.equal(requestCount, 1);

    currentTime += 101;
    const refreshed = await get('/tv/1', { cacheTtlMs: 100, params: { language: 'zh-CN' } });
    assert.equal(refreshed.data.requestCount, 2);
  } finally {
    if (originalKey === undefined) delete process.env.TMDB_API_KEY;
    else process.env.TMDB_API_KEY = originalKey;
  }
});

test('TMDB cache TTL has a configurable upper bound', () => {
  const original = process.env.TMDB_CACHE_TTL_MS;

  try {
    delete process.env.TMDB_CACHE_TTL_MS;
    assert.equal(getCacheTtl(), 300000);
    process.env.TMDB_CACHE_TTL_MS = '99999999';
    assert.equal(getCacheTtl(), 3600000);
  } finally {
    if (original === undefined) delete process.env.TMDB_CACHE_TTL_MS;
    else process.env.TMDB_CACHE_TTL_MS = original;
  }
});
