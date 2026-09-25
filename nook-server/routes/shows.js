const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Show = require('../models/Show'); 
const TvLog = require('../models/TvLog');
const {
  getAiredEpisodeCount,
  getRecommendedSeasonNumber,
  getTmdbSchedule,
  getTmdbSeasonProgress,
  hasTmdbSeasonActivity
} = require('../utils/tmdb');
const { classifyTmdbError, sendTmdbError, tmdbGet } = require('../utils/tmdbClient');
const { getSyncConcurrency, mapWithConcurrency } = require('../utils/concurrency');
const { buildShowListPipeline, parseShowQuery, SHOW_CATEGORIES, SHOW_STATUSES } = require('../utils/showQuery');
const { getShowSyncDecision } = require('../utils/showSyncPolicy');
const { applyDerivedShowStatus, getSyncedEpisodeCount } = require('../utils/showStatus');
const { getCalendarDateKeyInTimeZone, isValidTimeZone } = require('../utils/timeZone');
const logger = require('../utils/logger');
const { validateObjectIdParam } = require('../middleware/validate');
const { createRateLimit } = require('../middleware/rateLimit');
const {
  MAX_EPISODE_HISTORY_ENTRIES,
  confirmEpisodeProgress
} = require('../utils/episodeProgress');

const SHOW_LIST_FIELDS = '-userId -__v -lastTmdbCheckedAt -lastTmdbSyncStatus';
const activeSyncUsers = new Set();
const syncRateLimit = createRateLimit({
  windowMs: 60 * 1000,
  max: 3,
  code: 'SYNC_RATE_LIMITED',
  keyGenerator: req => req.user?.id
});
const forcedSyncRateLimit = createRateLimit({
  windowMs: 10 * 60 * 1000,
  max: 1,
  code: 'FORCED_SYNC_RATE_LIMITED',
  keyGenerator: req => req.user?.id
});

const limitForcedSync = (req, res, next) => (
  req.body?.force === true ? forcedSyncRateLimit(req, res, next) : next()
);

const preventConcurrentSync = (req, res, next) => {
  const userId = String(req.user.id);
  if (activeSyncUsers.has(userId)) {
    return res.status(409).json({
      code: 'SYNC_IN_PROGRESS',
      error: 'A synchronization is already in progress'
    });
  }

  activeSyncUsers.add(userId);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeSyncUsers.delete(userId);
  };
  res.once('finish', release);
  res.once('close', release);
  next();
};

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
  'totalEpisodesLocked',
  'scheduleLocked',
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

const pickEpisodeProgressBackup = source => {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return {};
  const result = {};
  if (Object.prototype.hasOwnProperty.call(source, 'episodeProgressConfirmedAt')) {
    result.episodeProgressConfirmedAt = source.episodeProgressConfirmedAt;
  }
  if (Array.isArray(source.episodeUpdateHistory)) {
    result.episodeUpdateHistory = source.episodeUpdateHistory.slice(-MAX_EPISODE_HISTORY_ENTRIES);
  }
  return result;
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
      .select('title posterUrl network networkLogo status totalEpisodes airedEpisodes updateFrequency updateDays updateCount scheduleLocked lastAirDate nextAirDate estimatedFinishDate seriesTitle seasonNumber seasonName +episodeProgressConfirmedAt +episodeUpdateHistory')
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
        if (showData.category === 'movie') {
          return res.status(409).json({
            code: 'DUPLICATE_SHOW',
            error: `电影《${existingShow.title}》已存在，请勿重复添加。`
          });
        }
        const seasonLabel = seasonNumber ? `第 ${seasonNumber} 季` : '整部剧';
        return res.status(409).json({
          code: 'DUPLICATE_SHOW',
          error: `剧集《${existingShow.title}》的${seasonLabel}已存在，请勿重复添加。`
        });
      }
    }

    const newShow = new Show({ userId: req.user.id, ...showData });
    if (newShow.airedEpisodes > 0) {
      confirmEpisodeProgress(newShow, newShow.airedEpisodes, {
        confirmedAt: new Date(),
        eventDate: newShow.lastAirDate || new Date(),
        source: 'manual'
      });
    }
    applyDerivedShowStatus(newShow);

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
      applyDerivedShowStatus(show);
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
    const show = await Show.findOne({ _id: req.params.id, userId: req.user.id })
      .select('+episodeProgressConfirmedAt +episodeUpdateHistory');
    if (!show) return res.status(404).json({ code: 'SHOW_NOT_FOUND', error: 'Show not found' });

    const updates = pickShowFields(req.body);
    const hasAiredEpisodes = Object.prototype.hasOwnProperty.call(updates, 'airedEpisodes');
    const nextAiredEpisodes = updates.airedEpisodes;
    delete updates.airedEpisodes;
    Object.assign(show, updates, { updatedAt: Date.now() });
    if (hasAiredEpisodes) {
      confirmEpisodeProgress(show, nextAiredEpisodes, {
        confirmedAt: new Date(),
        eventDate: show.lastAirDate || new Date(),
        source: 'manual'
      });
    }
    applyDerivedShowStatus(show);
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
router.post('/sync', syncRateLimit, limitForcedSync, preventConcurrentSync, async (req, res, next) => {
  try {
    // 智能同步是默认行为。强制全量同步必须明确传 true，且有更严格的频率限制。
    const force = req.body?.force === true;
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

    const syncableShows = await Show.find({
      userId: req.user.id,
      status: { $ne: 'dropped' }
    }).select('+lastTmdbCheckedAt +lastTmdbSyncStatus +episodeProgressConfirmedAt +episodeUpdateHistory');

    const eligibleShows = syncableShows.filter(show => show.tmdbId && show.category !== 'movie');
    const trackedSeasonKeys = new Set();
    const highestTrackedSeasonByTmdb = new Map();
    eligibleShows.forEach(show => {
      const seasonNumber = normalizeSeasonNumber(show.seasonNumber);
      if (!seasonNumber) return;
      const tmdbId = Number(show.tmdbId);
      trackedSeasonKeys.add(`${tmdbId}:${seasonNumber}`);
      highestTrackedSeasonByTmdb.set(
        tmdbId,
        Math.max(highestTrackedSeasonByTmdb.get(tmdbId) || 0, seasonNumber)
      );
    });
    const syncCandidates = eligibleShows.filter(show => getShowSyncDecision(show, {
      force,
      now: checkedAt,
      timeZone
    }).shouldCheck);
    const syncResults = await mapWithConcurrency(
      syncCandidates,
      getSyncConcurrency(),
      async show => {
        let cacheHitCount = 0;
        try {
          const tmdbRes = await tmdbGet(`/tv/${show.tmdbId}`, {
            cacheTtlMs: 60 * 1000,
            params: { language: 'zh-CN' }
          });
          if (tmdbRes.tmdbCache !== 'miss') cacheHitCount++;

          const remoteData = tmdbRes.data;
          const tmdbId = Number(show.tmdbId);
          const trackedSeasonNumber = normalizeSeasonNumber(show.seasonNumber);
          const highestTrackedSeason = highestTrackedSeasonByTmdb.get(tmdbId) || 0;
          const recommendedSeasonNumber = getRecommendedSeasonNumber(remoteData, { today });
          let seasonDiscovery = null;
          if (
            trackedSeasonNumber &&
            trackedSeasonNumber === highestTrackedSeason &&
            recommendedSeasonNumber > highestTrackedSeason &&
            !trackedSeasonKeys.has(`${tmdbId}:${recommendedSeasonNumber}`)
          ) {
            const remoteSeason = (remoteData.seasons || []).find(
              season => Number(season.season_number) === recommendedSeasonNumber
            );
            seasonDiscovery = {
              type: 'new-season',
              tmdbId,
              seasonNumber: recommendedSeasonNumber,
              seasonName: remoteSeason?.name || `第 ${recommendedSeasonNumber} 季`,
              title: remoteData.name || show.seriesTitle || show.title,
              category: show.category,
              tmdbType: show.category === 'anime' ? 'anime' : 'tv',
              posterUrl: remoteSeason?.poster_path
                ? `https://image.tmdb.org/t/p/w342${remoteSeason.poster_path}`
                : show.posterUrl
            };
          }

          let seasonProgress = null;
          const shouldLoadSeason = trackedSeasonNumber && (
            show.updateFrequency !== 'ended' ||
            force ||
            hasTmdbSeasonActivity(remoteData, trackedSeasonNumber, show.airedEpisodes)
          );
          if (shouldLoadSeason) {
            const seasonRes = await tmdbGet(`/tv/${show.tmdbId}/season/${trackedSeasonNumber}`, {
              cacheTtlMs: 60 * 1000,
              params: { language: 'zh-CN' }
            });
            if (seasonRes.tmdbCache !== 'miss') cacheHitCount++;
            seasonProgress = getTmdbSeasonProgress(seasonRes.data, remoteData, {
              seasonNumber: trackedSeasonNumber,
              today
            });
          }

          // 休眠季度没有出现同季新集时，只记录检查时间和新季提示，避免额外季度请求。
          if (trackedSeasonNumber && !seasonProgress) {
            let contentChanged = false;
            if (!show.network && remoteData.networks && remoteData.networks.length > 0) {
              show.network = remoteData.networks[0].name;
              if (remoteData.networks[0].logo_path) {
                show.networkLogo = `https://image.tmdb.org/t/p/h60${remoteData.networks[0].logo_path}`;
              }
              contentChanged = true;
            }
            show.lastTmdbCheckedAt = checkedAt;
            show.lastTmdbSyncStatus = 'success';
            await show.save();
            return { contentChanged, updateLog: null, seasonDiscovery, cacheHitCount };
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
          // 用户锁定总集数后，以本地确认过的总集数作为进度上限。
          // 这样 TMDB 的临时错数不会让已更新集数越界并导致保存失败。
          const syncedEpisodeCount = getSyncedEpisodeCount(show, remoteEpisodeCount);
          const previousEpisodeCount = Number(show.airedEpisodes) || 0;
          let needsSave = false;
          let updateLog = null;

          if (syncedEpisodeCount > previousEpisodeCount) {
            updateLog = {
              id: show._id,
              title: show.title,
              oldEp: previousEpisodeCount,
              newEp: syncedEpisodeCount,
              date: remoteAirDate || today,
              posterUrl: show.posterUrl
            };
          }
          const shouldApplyEpisodeCount = (
            seasonProgress
              ? syncedEpisodeCount !== previousEpisodeCount
              : syncedEpisodeCount > previousEpisodeCount
          );
          if (shouldApplyEpisodeCount || syncedEpisodeCount === previousEpisodeCount) {
            confirmEpisodeProgress(show, syncedEpisodeCount, {
              confirmedAt: checkedAt,
              eventDate: remoteAirDate || today,
              updateCount: remoteSchedule.updateCount,
              source: 'tmdb'
            });
          }
          if (shouldApplyEpisodeCount) {
            needsSave = true;
          }
          if (
            !show.scheduleLocked &&
            remoteAirDate &&
            syncedEpisodeCount === remoteEpisodeCount &&
            toCalendarDateKey(show.lastAirDate) !== remoteAirDate
          ) {
            show.lastAirDate = remoteAirDate;
            needsSave = true;
          }

          const canUseExactSeasonTotal = seasonProgress && remoteTotalEpisodes >= Math.max(
            show.watchedEpisodes,
            syncedEpisodeCount
          );
          if (
            !show.totalEpisodesLocked &&
            remoteTotalEpisodes &&
            (remoteTotalEpisodes > show.totalEpisodes || (
              canUseExactSeasonTotal && remoteTotalEpisodes !== show.totalEpisodes
            ))
          ) {
            show.totalEpisodes = remoteTotalEpisodes;
            needsSave = true;
          }
          if (!show.scheduleLocked) {
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
          }
          if (!show.network && remoteData.networks && remoteData.networks.length > 0) {
            show.network = remoteData.networks[0].name;
            if (remoteData.networks[0].logo_path) {
              show.networkLogo = `https://image.tmdb.org/t/p/h60${remoteData.networks[0].logo_path}`;
            }
            needsSave = true;
          }

          if (applyDerivedShowStatus(show)) needsSave = true;
          const contentChanged = needsSave;
          show.lastTmdbCheckedAt = checkedAt;
          show.lastTmdbSyncStatus = 'success';
          await show.save();
          return { contentChanged, updateLog, seasonDiscovery, cacheHitCount };
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
          return { error: err, cacheHitCount };
        }
      }
    );

    const failures = syncResults.filter(result => result.error);
    const updateLogs = syncResults.flatMap(result => result.updateLog ? [result.updateLog] : []);
    const seasonDiscoveries = Array.from(new Map(
      syncResults
        .flatMap(result => result.seasonDiscovery ? [result.seasonDiscovery] : [])
        .map(discovery => [`${discovery.tmdbId}:${discovery.seasonNumber}`, discovery])
    ).values());
    const attemptedCount = syncCandidates.length;
    const failedCount = failures.length;
    const changedCount = syncResults.filter(result => result.contentChanged).length;
    const cacheHitCount = syncResults.reduce(
      (total, result) => total + (Number(result.cacheHitCount) || 0),
      0
    );

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
      cacheHitCount,
      usedCache: cacheHitCount > 0,
      logs: updateLogs,
      seasonDiscoveries
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
      .select('+episodeProgressConfirmedAt +episodeUpdateHistory')
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
      const progressBackup = pickEpisodeProgressBackup(item);
      const backupTimestamps = item && typeof item === 'object' && !Array.isArray(item)
        ? {
            ...(Object.prototype.hasOwnProperty.call(item, 'createdAt') ? { createdAt: item.createdAt } : {}),
            ...(Object.prototype.hasOwnProperty.call(item, 'updatedAt') ? { updatedAt: item.updatedAt } : {})
          }
        : {};
      const normalizedTitle = String(showData.title || '').trim().toLowerCase();
      const candidate = new Show({
        userId: req.user.id,
        ...showData,
        ...progressBackup,
        ...backupTimestamps
      });
      if (!candidate.episodeProgressConfirmedAt && candidate.airedEpisodes > 0) {
        confirmEpisodeProgress(candidate, candidate.airedEpisodes, {
          confirmedAt: candidate.updatedAt || candidate.createdAt || new Date(),
          eventDate: candidate.lastAirDate || candidate.updatedAt || new Date(),
          source: 'manual'
        });
      }
      applyDerivedShowStatus(candidate);

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
