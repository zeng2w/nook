const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const User = require('../models/User');
const Show = require('../models/Show');
const TvLog = require('../models/TvLog');
const authRoutes = require('../routes/auth');
const showRoutes = require('../routes/shows');
const tvLogRoutes = require('../routes/tvlog');
const { createSessionToken, requireAuth } = require('../middleware/auth');
const { errorHandler } = require('../middleware/error');

const USER_A = '507f1f77bcf86cd799439011';
const USER_B = '507f1f77bcf86cd799439012';

const createTestApp = () => {
  const app = express();
  app.use(express.json());
  app.use('/api/auth/me', requireAuth);
  app.use('/api/auth', authRoutes);
  app.use('/api/shows', requireAuth, showRoutes);
  app.use('/api/tvlog', requireAuth, tvLogRoutes);
  app.use(errorHandler);
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

test('the current user endpoint restores identity from the session cookie', async () => {
  const originalFindById = User.findById;
  const user = new User({
    _id: USER_A,
    username: 'Existing User',
    email: 'existing@example.com',
    password: 'unused-password-hash'
  });
  User.findById = async id => String(id) === USER_A ? user : null;

  try {
    const response = await request(createTestApp())
      .get('/api/auth/me')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);

    assert.equal(response.status, 200);
    assert.deepEqual(response.body.user, {
      id: USER_A,
      username: 'Existing User',
      email: 'existing@example.com'
    });
  } finally {
    User.findById = originalFindById;
  }
});

test('show queries are scoped to the authenticated user', async () => {
  const originalAggregate = Show.aggregate;
  const seenUserIds = [];

  Show.aggregate = async pipeline => {
    seenUserIds.push(String(pipeline[0].$match.userId));
    return [{
      items: [],
      total: [],
      allCount: [],
      statusCounts: [],
      categoryCounts: [],
      networkTotal: [],
      networks: []
    }];
  };

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
    assert.deepEqual(responseA.body.pagination, {
      page: 1,
      limit: 24,
      total: 0,
      totalPages: 0,
      hasMore: false
    });
    assert.deepEqual(seenUserIds, [USER_A, USER_B]);
  } finally {
    Show.aggregate = originalAggregate;
  }
});

test('calendar shows include the episode counts required for calendar labels', async () => {
  const originalFind = Show.find;
  let selectedFields = '';

  Show.find = filter => ({
    select(fields) {
      selectedFields = fields;
      return this;
    },
    sort() { return this; },
    async lean() {
      assert.equal(String(filter.userId), USER_A);
      return [{
        _id: '507f1f77bcf86cd799439021',
        title: 'Long-running Anime',
        airedEpisodes: 237,
        totalEpisodes: 300
      }];
    }
  });

  try {
    const response = await request(createTestApp())
      .get('/api/shows/calendar')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);

    assert.equal(response.status, 200);
    assert.match(selectedFields, /\bairedEpisodes\b/);
    assert.match(selectedFields, /\btotalEpisodes\b/);
    assert.match(selectedFields, /\bnextAirDate\b/);
    assert.equal(response.body[0].airedEpisodes, 237);
    assert.equal(response.body[0].totalEpisodes, 300);
  } finally {
    Show.find = originalFind;
  }
});

test('activity uses the requested time zone and excludes negative corrections', async () => {
  const originalAggregate = TvLog.aggregate;
  let receivedPipeline = null;
  TvLog.aggregate = async pipeline => {
    receivedPipeline = pipeline;
    return [{ date: '2026-08-21', count: 3 }];
  };

  try {
    const response = await request(createTestApp())
      .get('/api/tvlog/activity?timeZone=America%2FChicago')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);

    assert.equal(response.status, 200);
    assert.equal(receivedPipeline[0].$match.count.$gt, 0);
    assert.equal(receivedPipeline[1].$group._id.$dateToString.timezone, 'America/Chicago');
    assert.deepEqual(response.body, [{ date: '2026-08-21', count: 3 }]);

    const invalid = await request(createTestApp())
      .get('/api/tvlog/activity?timeZone=not-a-time-zone')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'INVALID_TIME_ZONE');
  } finally {
    TvLog.aggregate = originalAggregate;
  }
});

test('show list rejects unsupported filters through the shared error format', async () => {
  const response = await request(createTestApp())
    .get('/api/shows?status=unknown')
    .set('Cookie', `nook_session=${createSessionToken(USER_A)}`);

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: 'INVALID_QUERY',
    error: 'status is not supported'
  });
});

test('show mutations reject malformed ids before querying MongoDB', async () => {
  const originalFindOne = Show.findOne;
  let queryCalled = false;
  Show.findOne = async () => {
    queryCalled = true;
    return null;
  };

  try {
    const response = await request(createTestApp())
      .put('/api/shows/not-an-object-id')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`)
      .send({ title: 'Example' });

    assert.equal(response.status, 400);
    assert.equal(response.body.code, 'INVALID_ID');
    assert.equal(queryCalled, false);
  } finally {
    Show.findOne = originalFindOne;
  }
});

test('logout expires the session cookie', async () => {
  const response = await request(createTestApp()).post('/api/auth/logout');

  assert.equal(response.status, 204);
  assert.match(response.headers['set-cookie'][0], /Max-Age=0/);
});

test('the same TMDB show can be added once per season', async () => {
  const originalFindOne = Show.findOne;
  const originalSave = Show.prototype.save;
  const lookups = [];

  Show.findOne = async query => {
    lookups.push(query);
    return query.seasonNumber === 1 ? { title: 'Example · 第 1 季' } : null;
  };
  Show.prototype.save = async function save() { return this; };

  try {
    const secondSeason = await request(createTestApp())
      .post('/api/shows')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`)
      .send({
        title: 'Example · 第 2 季',
        category: 'tv',
        tmdbId: 100,
        seasonNumber: 2
      });
    const duplicateSeason = await request(createTestApp())
      .post('/api/shows')
      .set('Cookie', `nook_session=${createSessionToken(USER_A)}`)
      .send({
        title: 'Example · 第 1 季',
        category: 'tv',
        tmdbId: 100,
        seasonNumber: 1
      });

    assert.equal(secondSeason.status, 200);
    assert.equal(duplicateSeason.status, 409);
    assert.deepEqual(lookups.map(query => query.seasonNumber), [2, 1]);
  } finally {
    Show.findOne = originalFindOne;
    Show.prototype.save = originalSave;
  }
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
          { title: 'Existing Show · 第 1 季', category: 'tv', tmdbId: 100, seasonNumber: 1 },
          { title: 'Existing Show · 第 1 季 Duplicate', category: 'tv', tmdbId: 100, seasonNumber: 1 },
          { title: 'Existing Show · 第 2 季', category: 'tv', tmdbId: 100, seasonNumber: 2 },
          { title: 'New Show', category: 'tv', tmdbId: 200 },
          { title: 'New Show Duplicate', category: 'tv', tmdbId: 200 },
          { title: 'existing show', category: 'tv' },
          { title: '', category: 'tv' }
        ]
      });

    assert.equal(response.status, 200);
    assert.equal(findCalls, 1);
    assert.equal(insertedShows.length, 3);
    assert.deepEqual(insertedShows.map(show => show.seasonNumber || null), [1, 2, null]);
    assert.equal(response.body.successCount, 3);
    assert.equal(response.body.skipCount, 5);
    assert.equal(response.body.invalidCount, 1);
  } finally {
    Show.find = originalFind;
    Show.insertMany = originalInsertMany;
  }
});
