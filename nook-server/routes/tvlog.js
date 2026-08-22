// routes/tvlog.js
const express = require('express');
const router = express.Router();
const TvLog = require('../models/TvLog');
const Show = require('../models/Show');
const { findPage, wantsPagination } = require('../utils/pagination');
const logger = require('../utils/logger');

// @route   GET /api/tvlog
// @desc    获取用户的追剧热力图数据
router.get('/', async (req, res) => {
  try {
    const filter = { userId: req.user.id };
    if (wantsPagination(req.query)) {
      const page = await findPage(TvLog, filter, {
        query: req.query,
        defaultLimit: 100,
        select: '-userId -__v',
        sort: { date: -1 }
      });
      return res.json(page);
    }

    const logs = await TvLog.find(filter)
      .select('-userId -__v')
      .sort({ date: -1 })
      .lean();
    res.json(logs);
  } catch (err) {
    logger.error('tvlog_list_failed', { error: err });
    res.status(500).json({ error: 'Server Error' });
  }
});

// Dashboard 只需要每日总数，直接在数据库端聚合以缩小响应体。
router.get('/activity', async (req, res) => {
  try {
    const userId = new TvLog.base.Types.ObjectId(req.user.id);
    const activity = await TvLog.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date', timezone: 'Asia/Shanghai' } },
          count: { $sum: '$count' }
        }
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, date: '$_id', count: 1 } }
    ]);
    res.json(activity);
  } catch (err) {
    logger.error('tvlog_activity_failed', { error: err });
    res.status(500).json({ error: 'Server Error' });
  }
});

// @route   POST /api/tvlog
// @desc    添加一条观看记录
router.post('/', async (req, res) => {
  try {
    const { showId, showTitle, count, date } = req.body || {};

    if (showId) {
      const ownsShow = await Show.exists({ _id: showId, userId: req.user.id });
      if (!ownsShow) return res.status(404).json({ msg: 'Show not found' });
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
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
