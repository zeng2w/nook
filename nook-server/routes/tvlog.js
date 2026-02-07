// routes/tvlog.js
const express = require('express');
const router = express.Router();
const TvLog = require('../models/TvLog');

// @route   GET /api/tvlog
// @desc    获取用户的追剧热力图数据
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ msg: 'User ID is required' });

    // 只查询该用户的记录，按日期倒序
    const logs = await TvLog.find({ userId }).sort({ date: -1 });
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
    const { userId, showId, showTitle, count, date } = req.body;

    const newLog = new TvLog({
      userId,
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