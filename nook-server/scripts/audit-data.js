require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 });

  const shows = mongoose.connection.collection('shows');
  const users = mongoose.connection.collection('users');
  const [showCount, userCount, invalidCounts, duplicateGroups] = await Promise.all([
    shows.countDocuments(),
    users.countDocuments(),
    shows.aggregate([
      {
        $group: {
          _id: null,
          blankTitle: {
            $sum: {
              $cond: [{ $eq: [{ $trim: { input: { $ifNull: ['$title', ''] } } }, ''] }, 1, 0]
            }
          },
          airedAboveTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $ifNull: ['$totalEpisodes', 0] }, 0] },
                    { $gt: [{ $ifNull: ['$airedEpisodes', 0] }, { $ifNull: ['$totalEpisodes', 0] }] }
                  ]
                },
                1,
                0
              ]
            }
          },
          watchedAboveTotal: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: [{ $ifNull: ['$totalEpisodes', 0] }, 0] },
                    { $gt: [{ $ifNull: ['$watchedEpisodes', 0] }, { $ifNull: ['$totalEpisodes', 0] }] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      }
    ]).toArray(),
    shows.aggregate([
      { $match: { tmdbId: { $exists: true, $ne: null } } },
      { $group: { _id: { userId: '$userId', tmdbId: '$tmdbId' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $count: 'count' }
    ]).toArray()
  ]);

  const invalid = invalidCounts[0] || {};
  console.log(JSON.stringify({
    database: mongoose.connection.name,
    userCount,
    showCount,
    duplicateShowGroups: duplicateGroups[0]?.count || 0,
    invalid: {
      blankTitle: invalid.blankTitle || 0,
      airedAboveTotal: invalid.airedAboveTotal || 0,
      watchedAboveTotal: invalid.watchedAboveTotal || 0
    }
  }, null, 2));
};

run()
  .catch(error => {
    console.error(`Data audit failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
