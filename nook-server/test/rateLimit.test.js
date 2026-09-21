const test = require('node:test');
const assert = require('node:assert/strict');

const { createRateLimit } = require('../middleware/rateLimit');

const runMiddleware = (middleware, ip = '127.0.0.1', reqOverrides = {}) => {
  const headers = {};
  const req = { headers: {}, ip, ...reqOverrides };
  const res = {
    statusCode: 200,
    body: null,
    setHeader(name, value) { headers[name] = value; },
    status(statusCode) { this.statusCode = statusCode; return this; },
    json(body) { this.body = body; return this; }
  };
  let nextCalled = false;
  middleware(req, res, () => { nextCalled = true; });
  return { headers, res, nextCalled };
};

test('rate limiter permits the configured allowance and then returns 429', () => {
  const middleware = createRateLimit({ windowMs: 60_000, max: 2 });

  assert.equal(runMiddleware(middleware).nextCalled, true);
  assert.equal(runMiddleware(middleware).nextCalled, true);
  const blocked = runMiddleware(middleware);

  assert.equal(blocked.nextCalled, false);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.body.code, 'RATE_LIMITED');
  assert.equal(blocked.headers['RateLimit-Remaining'], 0);
  assert.ok(blocked.headers['Retry-After'] >= 1);
});

test('rate limiter can isolate authenticated users behind the same IP', () => {
  const middleware = createRateLimit({
    windowMs: 60_000,
    max: 1,
    keyGenerator: req => req.user?.id
  });

  assert.equal(runMiddleware(middleware, '127.0.0.1', { user: { id: 'user-a' } }).nextCalled, true);
  assert.equal(runMiddleware(middleware, '127.0.0.1', { user: { id: 'user-b' } }).nextCalled, true);
  assert.equal(runMiddleware(middleware, '127.0.0.1', { user: { id: 'user-a' } }).res.statusCode, 429);
});
