const test = require('node:test');
const assert = require('node:assert/strict');
const { Mongoose } = require('mongoose');

const Show = require('../models/Show');

const testMongoUri = process.env.TEST_MONGO_URI;

test('MongoDB enforces one record per user, TMDB show, and season', {
  skip: !testMongoUri
}, async () => {
  const database = new Mongoose();

  try {
    await database.connect(testMongoUri, { serverSelectionTimeoutMS: 8000 });
    assert.match(database.connection.name, /test/i, 'TEST_MONGO_URI must target a test database');
    await database.connection.dropDatabase();

    const IntegrationShow = database.model('Show', Show.schema.clone());
    await IntegrationShow.syncIndexes();
    const indexes = await IntegrationShow.collection.indexes();
    const seasonIndex = indexes.find(index => index.name === 'uniq_user_tmdb_season');
    assert.equal(seasonIndex.unique, true);

    const userId = new database.Types.ObjectId();
    const base = { userId, category: 'tv', tmdbId: 100 };
    await IntegrationShow.create({ ...base, title: 'Example · 第 1 季', seasonNumber: 1 });
    await IntegrationShow.create({ ...base, title: 'Example · 第 2 季', seasonNumber: 2 });

    await assert.rejects(
      IntegrationShow.create({ ...base, title: 'Duplicate', seasonNumber: 1 }),
      error => error.code === 11000
    );
  } finally {
    await database.disconnect();
  }
});
