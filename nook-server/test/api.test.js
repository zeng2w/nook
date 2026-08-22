const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const User = require('../models/User');
const Show = require('../models/Show');
const authRoutes = require('../routes/auth');
const showRoutes = require('../routes/shows');
const { createSessionToken, requireAuth } = require('../middleware/auth');

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/shows', requireAuth, showRoutes);
  return app;
};

test('registration normalizes email and issues an HttpOnly session cookie', async () => {
  const originalFindOne = User.findOne;
  const originalSave = User.prototype.save;

  User.findOne = async () => null;
  User.prototype.save = async function saveStub() { return this; };

  try {
    const response = await request(createTestApp())
      .post('/api/auth/register')
      .send({
        username: 'New User',
        email: '  New.User@Example.COM ',
        password: 'safe-password-123'
      });

    assert.equal(response.status, 201);
    assert.equal(response.body.user.email, 'new.user@example.com');
    assert.equal(Object.hasOwn(response.body.user, 'password'), false);
    assert.match(response.headers['set-cookie'][0], /HttpOnly/);
  } finally {
    User.findOne = originalFindOne;
    User.prototype.save = originalSave;
  }
});

test('login verifies the password and returns a cookie instead of a token', async () => {
  const originalFindOne = User.findOne;
  const password = await bcrypt.hash('safe-password-123', 4);
  const user = new User({
    _id: USER_A,
    username: 'Existing User',
    email: 'existing@example.com',
    password
  });

  User.findOne = async () => user;

  try {
    const response = await request(createTestApp())
      .post('/api/auth/login')
      .send({ email: 'EXISTING@example.com', password: 'safe-password-123' });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.id, USER_A);
    assert.equal(Object.hasOwn(response.body, 'token'), false);
    assert.match(response.headers['set-cookie'][0], /^nook_session=/);
  } finally {
    User.findOne = originalFindOne;
  }
});

test('show queries are scoped to the authenticated user', async () => {
  const originalFind = Show.find;
  const seenUserIds = [];

  Show.find = (filter) => ({
    sort: async () => {
      seenUserIds.push(String(filter.userId));
      return [];
    }
  });

  try {
    const app = createTestApp();
    const responseA = await request(app)
      .get('/api/shows')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);
    const responseB = await request(app)
      .get('/api/shows')
      .set('Cookie', `nook_session=${createSessionToken(USER_B)}`);
    const unauthorized = await request(app).get('/api/shows');

    assert.equal(responseA.status, 200);
    assert.equal(responseB.status, 200);
    assert.equal(unauthorized.status, 401);
    assert.deepEqual(seenUserIds, [USER_A, USER_B]);
  } finally {
    Show.find = originalFind;
  }
});

test('logout expires the session cookie', async () => {
  const response = await request(createTestApp()).post('/api/auth/logout');

  assert.equal(response.status, 204);
  assert.match(response.headers['set-cookie'][0], /Max-Age=0/);
});

test('show import performs one deduplication query before bulk insert', async () => {
  const originalFind = Show.find;
  const originalInsertMany = Show.insertMany;
  let findCalls = 0;
  let insertedShows = [];

  Show.find = () => {
    findCalls++;
    return {
      select() { return this; },
      async lean() { return [{ tmdbId: 100, title: 'Existing Show' }]; }
    };
  };
  Show.insertMany = async shows => {
    insertedShows = shows;
    return shows;
  };

  try {
    const response = await request(createTestApp())
      .post('/api/shows/import')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`)
      .send({
        shows: [
          { title: 'Existing Show', category: 'tv', tmdbId: 100 },
          { title: 'New Show', category: 'tv', tmdbId: 200 },
          { title: 'New Show Duplicate', category: 'tv', tmdbId: 200 },
          { title: 'existing show', category: 'tv' },
          { title: '', category: 'tv' }
        ]
      });

    assert.equal(response.status, 200);
    assert.equal(findCalls, 1);
    assert.equal(insertedShows.length, 1);
    assert.equal(response.body.successCount, 1);
    assert.equal(response.body.skipCount, 4);
    assert.equal(response.body.invalidCount, 1);
  } finally {
    Show.find = originalFind;
    Show.insertMany = originalInsertMany;
  }
});
