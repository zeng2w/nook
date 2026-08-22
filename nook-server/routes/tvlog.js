// routes/tvlog.js
const express = require('express');
const router = express.Router();
const TvLog = require('../models/TvLog');
const Show = require('../models/Show');
const { findPage } = require('../utils/pagination');
const mongoose = require('mongoose');

const DEFAULT_ACTIVITY_TIME_ZONE = 'UTC';

const getActivityTimeZone = (value) => {
  if (value === undefined || value === '') return DEFAULT_ACTIVITY_TIME_ZONE;
  if (typeof value !== 'string' || value.length > 100) return null;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return value;
  } catch {
    return null;
  }
};

// @route   GET /api/tvlog
// @desc    获取用户的追剧热力图数据
router.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    const page = await findPage(TvLog, filter, {
      query: req.query,
      defaultLimit: 100,
      select: '-userId -__v',
      sort: { date: -1 }
    });
    res.json(page);
  } catch (err) {
    next(err);
  }
});

// Dashboard 只需要每日总数，直接在数据库端聚合以缩小响应体。
router.get('/activity', async (req, res, next) => {
  try {
    const timeZone = getActivityTimeZone(req.query.timeZone);
    if (!timeZone) {
      return res.status(400).json({
        code: 'INVALID_TIME_ZONE',
        error: 'timeZone must be a valid IANA time zone'
      });
    }

    const userId = new TvLog.base.Types.ObjectId(req.user.id);
    const activity = await TvLog.aggregate([
      // 减少已看集数属于进度修正，不应让“观影活跃度”出现负数。
      { $match: { userId, count: { $gt: 0 } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: timeZone } },
          count: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } }
    ]);
    res.json(activity);
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/tvlog
// @desc    添加一条观看记录
router.post('/', async (req, res, next) => {
  try {
    const { showId, showTitle, count, date } = req.body || {};

    if (showId) {
      if (!mongoose.isObjectIdOrHexString(showId)) {
        return res.status(400).json({ code: 'INVALID_ID', error: 'showId must be valid' });
      }
      const ownsShow = await Show.exists({ _id: showId, userId: req.user.id });
      if (!ownsShow) return res.status(404).json({ code: 'SHOW_NOT_FOUND', error: 'Show not found' });
    }

    const newLog = new TvLog({
      userId: req.user.id,
      showId,
      showTitle,
      count,
      // 如果前端传了日期就用前端的，否则用当前时间
      date: date || Date.now() 
    });

    const log = await newLog.save();
    res.json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
