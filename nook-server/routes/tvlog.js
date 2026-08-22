// routes/tvlog.js
const express = require('express');
const router = express.Router();
const TvLog = require('../models/TvLog');
const Show = require('../models/Show');

// @route   GET /api/tvlog
// @desc    获取用户的追剧热力图数据
router.get('/', async (req, res) => {
  try {
    // 只查询该用户的记录，按日期倒序
    const logs = await TvLog.find({ userId: req.user.id }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
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
