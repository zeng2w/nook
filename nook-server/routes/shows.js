const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Show = require('../models/Show'); 
const TvLog = require('../models/TvLog');
const { getAiredEpisodeCount, getTmdbSchedule, getTmdbSeasonProgress } = require('../utils/tmdb');
const { classifyTmdbError, sendTmdbError, tmdbGet } = require('../utils/tmdbClient');
const { getSyncConcurrency, mapWithConcurrency } = require('../utils/concurrency');
const { buildShowListPipeline, parseShowQuery, SHOW_CATEGORIES, SHOW_STATUSES } = require('../utils/showQuery');
const { getShowSyncDecision } = require('../utils/showSyncPolicy');
const { getCalendarDateKeyInTimeZone, isValidTimeZone } = require('../utils/timeZone');
const logger = require('../utils/logger');
const { validateObjectIdParam } = require('../middleware/validate');

const SHOW_LIST_FIELDS = '-userId -__v -lastTmdbCheckedAt -lastTmdbSyncStatus';

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
  'isFavorite',
  'seriesTitle',
  'seasonNumber',
  'seasonName'
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

const normalizeSeasonNumber = (value) => {
  const seasonNumber = Number(value);
  return Number.isInteger(seasonNumber) && seasonNumber > 0 ? seasonNumber : null;
};

const getTmdbDuplicateKey = show => (
  `tmdb:${String(show.tmdbId)}:season:${normalizeSeasonNumber(show.seasonNumber) || 'all'}`
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
      .select('title posterUrl network networkLogo status totalEpisodes airedEpisodes updateFrequency updateDays updateCount lastAirDate nextAirDate estimatedFinishDate seriesTitle seasonNumber seasonName')
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
      const seasonNumber = normalizeSeasonNumber(showData.seasonNumber);
      const existingShow = await Show.findOne({ userId: req.user.id, tmdbId, seasonNumber });
      if (existingShow) {
        const seasonLabel = seasonNumber ? `第 ${seasonNumber} 季` : '整部剧';
        return res.status(409).json({
          code: 'DUPLICATE_SHOW',
          error: `剧集《${existingShow.title}》的${seasonLabel}已存在，请勿重复添加。`
        });
      }
    }

    const newShow = new Show({ userId: req.user.id, ...showData });

    const show = await newShow.save();
    res.json(show);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        code: 'DUPLICATE_SHOW',
        error: '该剧集的这一季已经存在，请勿重复添加。'
      });
    }
    next(err);
  }
});

// 在同一个 MongoDB 事务中更新观看进度并写入活动日志。
// 目标进度是幂等的：客户端重试相同请求时不会重复产生 TvLog。
router.patch('/:id/progress', validateObjectIdParam(), async (req, res, next) => {
  const watchedEpisodes = Number(req.body?.watchedEpisodes);
  const status = req.body?.status;
  const date = req.body?.date;

  if (!Number.isInteger(watchedEpisodes) || watchedEpisodes < 0) {
    return res.status(400).json({
      code: 'INVALID_PROGRESS',
      error: 'watchedEpisodes must be a non-negative integer'
    });
  }

  const session = await mongoose.startSession();
  let updatedShow;
  let loggedDelta = 0;

  try {
    await session.withTransaction(async () => {
      const show = await Show.findOne(
        { _id: req.params.id, userId: req.user.id },
        null,
        { session }
      );
      if (!show) {
        const error = new Error('Show not found');
        error.status = 404;
        error.code = 'SHOW_NOT_FOUND';
        throw error;
      }

      loggedDelta = watchedEpisodes - show.watchedEpisodes;
      show.watchedEpisodes = watchedEpisodes;
      if (status !== undefined) show.status = status;
      show.updatedAt = Date.now();
      await show.save({ session });

      if (loggedDelta !== 0) {
        await TvLog.create([{
          userId: req.user.id,
          showId: show._id,
          showTitle: show.title,
          count: loggedDelta,
          date: date || Date.now()
        }], { session });
      }

      updatedShow = show;
    });

    res.json({ show: updatedShow, loggedDelta });
  } catch (err) {
    next(err);
  } finally {
    await session.endSession();
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
// 5. 🔄 智能/手动同步接口（受控并发 + 短期缓存）
// ==========================================
router.post('/sync', async (req, res, next) => {
  try {
    // 未传 force 时保留原有手动接口的全量行为；页面自动同步会明确传 false。
    const force = req.body?.force !== false;
    const requestedTimeZone = req.body?.timeZone;
    if (requestedTimeZone !== undefined && !isValidTimeZone(requestedTimeZone)) {
      return res.status(400).json({
        code: 'INVALID_TIME_ZONE',
        error: 'timeZone must be a valid IANA time zone'
      });
    }
    const timeZone = requestedTimeZone?.trim() || 'UTC';
    const checkedAt = new Date();
    const today = getCalendarDateKeyInTimeZone(checkedAt, timeZone);

    const activeShows = await Show.find({
      userId: req.user.id,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    }).select('+lastTmdbCheckedAt +lastTmdbSyncStatus');

    const eligibleShows = activeShows.filter(show => show.tmdbId && show.category !== 'movie');
    const syncCandidates = eligibleShows.filter(show => getShowSyncDecision(show, {
      force,
      now: checkedAt,
      timeZone
    }).shouldCheck);
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
          let seasonProgress = null;
          if (show.seasonNumber) {
            const seasonRes = await tmdbGet(`/tv/${show.tmdbId}/season/${show.seasonNumber}`, {
              cacheTtlMs: 60 * 1000,
              params: { language: 'zh-CN' }
            });
            seasonProgress = getTmdbSeasonProgress(seasonRes.data, remoteData, {
              seasonNumber: show.seasonNumber,
              today
            });
          }
          const remoteSchedule = seasonProgress || getTmdbSchedule(remoteData);
          const remoteEpisodeCount = seasonProgress
            ? seasonProgress.airedEpisodes
            : getAiredEpisodeCount(remoteData);
          const remoteAirDate = seasonProgress
            ? seasonProgress.lastAirDate
            : remoteData.last_episode_to_air?.air_date;
          const remoteTotalEpisodes = seasonProgress
            ? seasonProgress.totalEpisodes
            : remoteData.number_of_episodes;
          let needsSave = false;
          let updateLog = null;

          if (remoteEpisodeCount > show.airedEpisodes) {
            updateLog = {
              id: show._id,
              title: show.title,
              oldEp: show.airedEpisodes,
              newEp: remoteEpisodeCount,
              date: remoteAirDate || today,
              posterUrl: show.posterUrl
            };
          }
          if (
            seasonProgress
              ? remoteEpisodeCount !== show.airedEpisodes
              : remoteEpisodeCount > show.airedEpisodes
          ) {
            show.airedEpisodes = remoteEpisodeCount;
            needsSave = true;
          }
          if (remoteAirDate && toCalendarDateKey(show.lastAirDate) !== remoteAirDate) {
            show.lastAirDate = remoteAirDate;
            needsSave = true;
          }

          const canUseExactSeasonTotal = seasonProgress && remoteTotalEpisodes >= Math.max(
            show.watchedEpisodes,
            remoteEpisodeCount
          );
          if (
            remoteTotalEpisodes &&
            (remoteTotalEpisodes > show.totalEpisodes || (
              canUseExactSeasonTotal && remoteTotalEpisodes !== show.totalEpisodes
            ))
          ) {
            show.totalEpisodes = remoteTotalEpisodes;
            needsSave = true;
          }
          const managedFrequencies = seasonProgress
            ? ['weekly', 'unknown', 'ended']
            : ['weekly', 'unknown'];
          const scheduleIsManagedByTmdb = managedFrequencies.includes(show.updateFrequency);
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
            if (seasonProgress && show.updateCount !== remoteSchedule.updateCount) {
              show.updateCount = remoteSchedule.updateCount;
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

          const contentChanged = needsSave;
          show.lastTmdbCheckedAt = checkedAt;
          show.lastTmdbSyncStatus = 'success';
          await show.save();
          return { contentChanged, updateLog };
        } catch (err) {
          const failure = classifyTmdbError(err);
          logger.warn('show_sync_item_failed', { code: failure.code, showId: String(show._id) });
          try {
            await Show.updateOne(
              { _id: show._id, userId: req.user.id },
              { $set: { lastTmdbCheckedAt: checkedAt, lastTmdbSyncStatus: 'error' } }
            );
          } catch (markerError) {
            logger.warn('show_sync_marker_failed', {
              showId: String(show._id),
              message: markerError.message
            });
          }
          return { error: err };
        }
      }
    );

    const failures = syncResults.filter(result => result.error);
    const updateLogs = syncResults.flatMap(result => result.updateLog ? [result.updateLog] : []);
    const attemptedCount = syncCandidates.length;
    const failedCount = failures.length;
    const changedCount = syncResults.filter(result => result.contentChanged).length;

    if (attemptedCount > 0 && failedCount === attemptedCount) {
      return sendTmdbError(res, failures[0].error, 'sync');
    }

    res.json({ 
      success: true, 
      checkedCount: attemptedCount,
      skippedCount: eligibleShows.length - attemptedCount,
      changedCount,
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
  let duplicateCount = 0;
  const validShowsToInsert = [];
  const errors = [];
  const seenKeys = new Set();

  try {
    // 一次性读取当前用户的查重字段，避免最多 1000 次逐条查询。
    const existingShows = await Show.find({ userId: req.user.id })
      .select({ tmdbId: 1, seasonNumber: 1, title: 1 })
      .lean();
    const existingTmdbKeys = new Set(
      existingShows.filter(show => show.tmdbId).map(getTmdbDuplicateKey)
    );
    const existingTitles = new Set(
      existingShows.map(show => String(show.title || '').trim().toLowerCase())
    );

    for (const [index, item] of shows.entries()) {
      const showData = pickShowFields(item);
      const backupTimestamps = item && typeof item === 'object' && !Array.isArray(item)
        ? {
            ...(Object.prototype.hasOwnProperty.call(item, 'createdAt') ? { createdAt: item.createdAt } : {}),
            ...(Object.prototype.hasOwnProperty.call(item, 'updatedAt') ? { updatedAt: item.updatedAt } : {})
          }
        : {};
      const normalizedTitle = String(showData.title || '').trim().toLowerCase();
      const candidate = new Show({ userId: req.user.id, ...showData, ...backupTimestamps });

      try {
        await candidate.validate();
      } catch (validationError) {
        skipCount++;
        invalidCount++;
        if (errors.length < 100) {
          errors.push({
            index,
            title: showData.title || '',
            error: Object.values(validationError.errors || {})[0]?.message || 'Invalid show data'
          });
        }
        continue;
      }

      const duplicateKey = showData.tmdbId
        ? getTmdbDuplicateKey(showData)
        : `title:${normalizedTitle}`;

      if (seenKeys.has(duplicateKey)) {
        skipCount++;
        duplicateCount++;
        continue;
      }
      seenKeys.add(duplicateKey);

      const exists = showData.tmdbId
        ? existingTmdbKeys.has(getTmdbDuplicateKey(showData))
        : existingTitles.has(normalizedTitle);

      if (exists) {
        skipCount++;
        duplicateCount++;
      } else {
        validShowsToInsert.push(candidate.toObject({ versionKey: false }));
      }
    }

    if (validShowsToInsert.length > 0) {
      await Show.insertMany(validShowsToInsert);
    }

    res.json({ 
      success: true, 
      message: `导入完成：成功 ${validShowsToInsert.length} 部，重复 ${duplicateCount} 部，无效 ${invalidCount} 部`,
      successCount: validShowsToInsert.length,
      skipCount,
      duplicateCount,
      invalidCount,
      errors: errors.slice(0, 100)
    });

  } catch (err) {
    next(err);
  }
});

module.exports = router;
