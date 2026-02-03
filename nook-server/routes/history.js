const express = require('express');
const router = express.Router();
const History = require('../models/History');

// @route   GET /api/history
// @desc    获取用户记录
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ msg: 'User ID is required' });

    const history = await History.find({ userId }).sort({ date: -1 });
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST /api/history
// @desc    添加新记录 (已升级：支持手动指定日期)
router.post('/', async (req, res) => {
  try {
    // 允许前端传 date 进来，如果不传则默认当前时间
    const { userId, count, duration, date } = req.body;

    const newHistory = new History({
      userId,
      count,
      duration,
      date: date || Date.now() // 如果前端传了 date 就用前端的，否则用现在
    });

    const history = await newHistory.save();
    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT /api/history/:id
// @desc    【新增】更新一条记录
router.put('/:id', async (req, res) => {
  try {
    const { count, duration, date } = req.body;

    // 找到并更新，new: true 表示返回更新后的数据
    const history = await History.findByIdAndUpdate(
      req.params.id,
      { count, duration, date },
      { new: true }
    );

    if (!history) return res.status(404).json({ msg: 'Record not found' });

    res.json(history);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE /api/history/:id
// @desc    删除记录
router.delete('/:id', async (req, res) => {
  try {
    const result = await History.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ msg: 'Record not found' });
    res.json({ msg: 'Record deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;