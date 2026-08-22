const express = require('express');
const router = express.Router();
const Show = require('../models/Show'); 
const { getAiredEpisodeCount, getTmdbSchedule } = require('../utils/tmdb');
const { classifyTmdbError, sendTmdbError, tmdbGet } = require('../utils/tmdbClient');
const { getSyncConcurrency, mapWithConcurrency } = require('../utils/concurrency');
const { buildShowListPipeline, parseShowQuery, SHOW_CATEGORIES, SHOW_STATUSES } = require('../utils/showQuery');
const logger = require('../utils/logger');
const { validateObjectIdParam } = require('../middleware/validate');

const SHOW_LIST_FIELDS = '-userId -__v';

const ALLOWED_SHOW_FIELDS = [
  'title',
  'category',
  'status',
  'totalEpisodes',
  'airedEpisodes',
  'watchedEpisodes',
  'posterUrl',
  'tmdbId',
  'updateFrequency',
  'updateDays',
  'updateCount',
  'lastAirDate',
  'nextAirDate',
  'estimatedFinishDate',
  'network',
  'networkLogo',
  'isFavorite'
];

const pickShowFields = (source) => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};

  return Object.fromEntries(
    ALLOWED_SHOW_FIELDS
      .filter(field => Object.prototype.hasOwnProperty.call(source, field))
      .map(field => [field, source[field]])
  );
};

const toCalendarDateKey = (value) => {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

const hasSameUpdateDays = (left = [], right = []) => (
  left.length === right.length && left.every((day, index) => Number(day) === Number(right[index]))
);

// ==========================================
// 1. 获取剧集列表
// ==========================================
router.get('/', async (req, res, next) => {
  try {
    const options = parseShowQuery(req.query);
    const userId = new Show.base.Types.ObjectId(req.user.id);
    const [aggregateResult] = await Show.aggregate(buildShowListPipeline(userId, options));
    const result = aggregateResult || {
      items: [], total: [], allCount: [], statusCounts: [],
      categoryCounts: [], networkTotal: [], networks: []
    };
    const total = result.total[0]?.count || 0;
    const totalPages = total === 0 ? 0 : Math.ceil(total / options.limit);
    const toCountMap = (rows, keys) => Object.fromEntries(
      keys.map(key => [key, rows.find(row => row._id === key)?.count || 0])
    );

    res.json({
      items: result.items,
      pagination: {
        page: options.page,
        limit: options.limit,
        total,
        totalPages,
        hasMore: options.page < totalPages
      },
      facets: {
        allCount: result.allCount[0]?.count || 0,
        statusCounts: toCountMap(result.statusCounts, SHOW_STATUSES),
        categoryCounts: toCountMap(result.categoryCounts, SHOW_CATEGORIES),
        networkTotal: result.networkTotal[0]?.count || 0,
        networks: result.networks
      }
    });
  } catch (err) {
    next(err);
  }
});

// Dashboard 使用聚合结果，避免为了四个统计数字下载全部剧集。
router.get('/stats', async (req, res, next) => {
  try {
    const userId = new Show.base.Types.ObjectId(req.user.id);
    const [stats] = await Show.aggregate([
      { $match: { userId } },
      {
        $project: {
          status: 1,
          watched: { $ifNull: ['$watchedEpisodes', 0] },
          aired: { $ifNull: ['$airedEpisodes', 0] },
          total: { $ifNull: ['$totalEpisodes', 0] }
        }
      },
      {
        $group: {
          _id: null,
          showCount: { $sum: 1 },
          watching: { $sum: { $cond: [{ $eq: ['$status', 'watching'] }, 1, 0] } },
          watchedCount: { $sum: { $cond: [{ $eq: ['$status', 'watched'] }, 1, 0] } },
          wish: { $sum: { $cond: [{ $eq: ['$status', 'wish'] }, 1, 0] } },
          dropped: { $sum: { $cond: [{ $eq: ['$status', 'dropped'] }, 1, 0] } },
          watchedEpisodes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['watching', 'watched']] },
                '$watched',
                0
              ]
            }
          },
          targetEpisodes: {
            $sum: {
              $cond: [
                { $in: ['$status', ['watching', 'watched']] },
                {
                  $let: {
                    vars: { target: { $cond: [{ $gt: ['$total', 0] }, '$total', '$aired'] } },
                    in: { $cond: [{ $gt: ['$watched', '$$target'] }, '$watched', '$$target'] }
                  }
                },
                0
              ]
            }
          },
          lagEpisodes: {
            $sum: {
              $cond: [
                { $eq: ['$status', 'watching'] },
                { $cond: [{ $gt: ['$aired', '$watched'] }, { $subtract: ['$aired', '$watched'] }, 0] },
                0
              ]
            }
          }
        }
      }
    ]);

    const watchedEpisodes = stats?.watchedEpisodes || 0;
    const targetEpisodes = stats?.targetEpisodes || 0;
    res.json({
      showCount: stats?.showCount || 0,
      statusCounts: {
        watching: stats?.watching || 0,
        watched: stats?.watchedCount || 0,
        wish: stats?.wish || 0,
        dropped: stats?.dropped || 0
      },
      progressStats: {
        watched: watchedEpisodes,
        total: targetEpisodes,
        lag: stats?.lagEpisodes || 0,
        percent: targetEpisodes > 0 ? Math.round((watchedEpisodes / targetEpisodes) * 100) : 0
      }
    });
  } catch (err) {
    next(err);
  }
});

router.get('/calendar', async (req, res, next) => {
  try {
    const shows = await Show.find({ userId: req.user.id })
      .select('title posterUrl network networkLogo status totalEpisodes airedEpisodes updateFrequency updateDays updateCount lastAirDate nextAirDate estimatedFinishDate')
      .sort({ lastAirDate: -1, title: 1 })
      .lean();
    res.json(shows);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 2. 添加新剧集 (含查重逻辑)
// ==========================================
router.post('/', async (req, res, next) => {
  try {
    const showData = pickShowFields(req.body);
    const { tmdbId } = showData;

    if (tmdbId) {
      const existingShow = await Show.findOne({ userId: req.user.id, tmdbId });
      if (existingShow) {
        return res.status(409).json({ code: 'DUPLICATE_SHOW', error: `剧集《${existingShow.title}》已存在，请勿重复添加。` });
      }
    }

    const newShow = new Show({ userId: req.user.id, ...showData });

    const show = await newShow.save();
    res.json(show);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 3. 更新剧集 (进度/状态)
// ==========================================
router.put('/:id', validateObjectIdParam(), async (req, res, next) => {
  try {
    const show = await Show.findOne({ _id: req.params.id, userId: req.user.id });
    if (!show) return res.status(404).json({ code: 'SHOW_NOT_FOUND', error: 'Show not found' });

    Object.assign(show, pickShowFields(req.body), { updatedAt: Date.now() });
    await show.save();
    res.json(show);
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 4. 删除剧集
// ==========================================
router.delete('/:id', validateObjectIdParam(), async (req, res, next) => {
  try {
    const show = await Show.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!show) return res.status(404).json({ code: 'SHOW_NOT_FOUND', error: 'Show not found' });
    res.json({ message: 'Show removed' });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 5. 🔄 手动同步接口（受控并发 + 短期缓存）
// ==========================================
router.post('/sync', async (req, res, next) => {
  try {
    const activeShows = await Show.find({
      userId: req.user.id,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    });

    const syncCandidates = activeShows.filter(show => show.tmdbId && show.category !== 'movie');
    const syncResults = await mapWithConcurrency(
      syncCandidates,
      getSyncConcurrency(),
      async show => {
        try {
          const tmdbRes = await tmdbGet(`/tv/${show.tmdbId}`, {
            cacheTtlMs: 60 * 1000,
            params: { language: 'zh-CN' }
          });

          const remoteData = tmdbRes.data;
          const remoteSchedule = getTmdbSchedule(remoteData);
          let needsSave = false;
          let updateLog = null;

          if (remoteData.last_episode_to_air) {
            const newEpisodeCount = getAiredEpisodeCount(remoteData);
            const newAirDate = remoteData.last_episode_to_air.air_date;

            if (newEpisodeCount > show.airedEpisodes) {
              updateLog = {
                id: show._id,
                title: show.title,
                oldEp: show.airedEpisodes,
                newEp: newEpisodeCount,
                date: newAirDate || new Date().toISOString().split('T')[0],
                posterUrl: show.posterUrl
              };

              show.airedEpisodes = newEpisodeCount;
              if (newAirDate) show.lastAirDate = newAirDate;
              needsSave = true;
            }
          }

          if (remoteData.number_of_episodes && remoteData.number_of_episodes > show.totalEpisodes) {
            show.totalEpisodes = remoteData.number_of_episodes;
            needsSave = true;
          }
          const scheduleIsManagedByTmdb = ['weekly', 'unknown'].includes(show.updateFrequency);
          if (remoteSchedule.updateFrequency === 'ended') {
            if (show.updateFrequency !== 'ended') {
              show.updateFrequency = 'ended';
              needsSave = true;
            }
            if (show.nextAirDate) {
              show.nextAirDate = null;
              needsSave = true;
            }
            if (Array.isArray(show.updateDays) && show.updateDays.length > 0) {
              show.updateDays = [];
              needsSave = true;
            }
          } else if (scheduleIsManagedByTmdb) {
            if (show.updateFrequency !== remoteSchedule.updateFrequency) {
              show.updateFrequency = remoteSchedule.updateFrequency;
              needsSave = true;
            }
            if (!hasSameUpdateDays(show.updateDays, remoteSchedule.updateDays)) {
              show.updateDays = remoteSchedule.updateDays;
              needsSave = true;
            }
            if (toCalendarDateKey(show.nextAirDate) !== remoteSchedule.nextAirDate) {
              show.nextAirDate = remoteSchedule.nextAirDate;
              needsSave = true;
            }
          }
          if (!show.network && remoteData.networks && remoteData.networks.length > 0) {
            show.network = remoteData.networks[0].name;
            if (remoteData.networks[0].logo_path) {
              show.networkLogo = `https://image.tmdb.org/t/p/h60${remoteData.networks[0].logo_path}`;
            }
            needsSave = true;
          }

          if (needsSave) await show.save();
          return { updateLog };
        } catch (err) {
          const failure = classifyTmdbError(err);
          logger.warn('show_sync_item_failed', { code: failure.code, showId: String(show._id) });
          return { error: err };
        }
      }
    );

    const failures = syncResults.filter(result => result.error);
    const updateLogs = syncResults.flatMap(result => result.updateLog ? [result.updateLog] : []);
    const attemptedCount = syncCandidates.length;
    const failedCount = failures.length;

    if (attemptedCount > 0 && failedCount === attemptedCount) {
      return sendTmdbError(res, failures[0].error, 'sync');
    }

    res.json({ 
      success: true, 
      updatedCount: updateLogs.length, 
      failedCount,
      logs: updateLogs 
    });

  } catch (err) {
    next(err);
  }
});

// GET /api/shows/export
router.get('/export', async (req, res, next) => {
  try {
    const shows = await Show.find({ userId: req.user.id })
      .select(SHOW_LIST_FIELDS)
      .lean();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tv_shows_backup_${Date.now()}.json`);
    res.send(JSON.stringify(shows, null, 2));
  } catch (err) {
    next(err);
  }
});

// ==========================================
// 6. 📥 数据导入接口 (批量化 & 事务优化)
// ==========================================
router.post('/import', async (req, res, next) => {
  const { shows } = req.body || {};
  if (!Array.isArray(shows)) {
    return res.status(400).json({ code: 'INVALID_IMPORT', error: 'Invalid data format' });
  }
  if (shows.length > 1000) {
    return res.status(400).json({
      code: 'IMPORT_LIMIT_EXCEEDED',
      error: 'A maximum of 1000 shows can be imported at once'
    });
  }

  let skipCount = 0;
  let invalidCount = 0;
  const validShowsToInsert = [];
  const seenKeys = new Set();

  try {
    // 一次性读取当前用户的查重字段，避免最多 1000 次逐条查询。
    const existingShows = await Show.find({ userId: req.user.id })
      .select({ tmdbId: 1, title: 1 })
      .lean();
    const existingTmdbIds = new Set(
      existingShows.filter(show => show.tmdbId).map(show => String(show.tmdbId))
    );
    const existingTitles = new Set(
      existingShows.map(show => String(show.title || '').trim().toLowerCase())
    );

    for (const item of shows) {
      const showData = pickShowFields(item);
      const normalizedTitle = String(showData.title || '').trim().toLowerCase();
      if (!normalizedTitle || !showData.category) {
        skipCount++;
        invalidCount++;
        continue;
      }

      const duplicateKey = showData.tmdbId
        ? `tmdb:${String(showData.tmdbId)}`
        : `title:${normalizedTitle}`;

      if (seenKeys.has(duplicateKey)) {
        skipCount++;
        continue;
      }
      seenKeys.add(duplicateKey);

      const exists = showData.tmdbId
        ? existingTmdbIds.has(String(showData.tmdbId))
        : existingTitles.has(normalizedTitle);

      if (exists) {
        skipCount++;
      } else {
        validShowsToInsert.push({ userId: req.user.id, ...showData });
      }
    }

    if (validShowsToInsert.length > 0) {
      await Show.insertMany(validShowsToInsert);
    }

    res.json({ 
      success: true, 
      message: `导入完成：成功 ${validShowsToInsert.length} 部，跳过重复 ${skipCount} 部`,
      successCount: validShowsToInsert.length,
      skipCount,
      invalidCount
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
