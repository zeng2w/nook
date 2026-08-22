const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createSessionToken,
  issueSession,
  requireAuth,
  verifySessionToken
} = require('../middleware/auth');

const USER_ID = '507f1f77bcf86cd799439011';
const NOW = Date.UTC(2026, 7, 21, 0, 0, 0);

test('a signed session token can be verified', () => {
  const token = createSessionToken(USER_ID, NOW);
  const session = verifySessionToken(token, NOW + 1000);

  assert.equal(session.sub, USER_ID);
  assert.equal(session.v, 1);
});

test('a tampered session token is rejected', () => {
  const token = createSessionToken(USER_ID, NOW);
  const [payload, signature] = token.split('.');
  const tamperedSignature = `${signature.slice(0, -1)}${signature.endsWith('a') ? 'b' : 'a'}`;

  assert.equal(verifySessionToken(`${payload}.${tamperedSignature}`, NOW), null);
});

test('an expired session token is rejected', () => {
  const token = createSessionToken(USER_ID, NOW);
  const eightDaysLater = NOW + (8 * 24 * 60 * 60 * 1000);

  assert.equal(verifySessionToken(token, eightDaysLater), null);
});

test('authentication middleware derives the user from the signed cookie', () => {
  const token = createSessionToken(USER_ID);
  const req = { headers: { cookie: `theme=dark; nook_session=${token}` } };
  let nextCalled = false;

  requireAuth(req, {}, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.user.id, USER_ID);
});

test('authentication middleware rejects a request without a session', () => {
  const req = { headers: {} };
  const res = {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    }
  };

  requireAuth(req, res, () => assert.fail('next should not be called'));

  assert.equal(res.statusCode, 401);
  assert.deepEqual(res.body, { msg: 'Authentication required' });
});

test('session cookies are HttpOnly and restricted to same-site requests', () => {
  const headers = {};
  const res = {
    setHeader(name, value) {
      headers[name] = value;
    }
  };

  issueSession(res, USER_ID);

  assert.match(headers['Set-Cookie'], /^nook_session=/);
  assert.match(headers['Set-Cookie'], /HttpOnly/);
  assert.match(headers['Set-Cookie'], /SameSite=Strict/);
});
