const express = require('express');
const router = express.Router();
const History = require('../models/History');
const { findPage } = require('../utils/pagination');
const { validateObjectIdArray, validateObjectIdParam } = require('../middleware/validate');

// @route   GET /api/history
// @desc    获取用户记录
router.get('/', async (req, res, next) => {
  try {
    const filter = { userId: req.user.id };
    const page = await findPage(History, filter, {
      query: req.query,
      defaultLimit: 50,
      select: '-userId -__v',
      sort: { date: -1 }
    });
    res.json(page);
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/history
// @desc    添加新记录 (已升级：支持手动指定日期)
router.post('/', async (req, res, next) => {
  try {
    // 允许前端传 date 进来，如果不传则默认当前时间
    const { count, duration, date } = req.body || {};

    const newHistory = new History({
      userId: req.user.id,
      count,
      duration,
      date: date || Date.now() // 如果前端传了 date 就用前端的，否则用现在
    });

    const history = await newHistory.save();
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// @route   PUT /api/history/:id
// @desc    【新增】更新一条记录
router.put('/:id', validateObjectIdParam(), async (req, res, next) => {
  try {
    const { count, duration, date } = req.body || {};

    // 找到并更新，返回更新后的数据。
    const history = await History.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { count, duration, date },
      { returnDocument: 'after', runValidators: true }
    );

    if (!history) return res.status(404).json({ code: 'HISTORY_NOT_FOUND', error: 'Record not found' });

    res.json(history);
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/history/:id
// @desc    删除记录
router.delete('/:id', validateObjectIdParam(), async (req, res, next) => {
  try {
    const result = await History.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!result) return res.status(404).json({ code: 'HISTORY_NOT_FOUND', error: 'Record not found' });
    res.json({ message: 'Record deleted' });
  } catch (err) {
    next(err);
  }
});

// nook-server/routes/history.js 新增路由
router.post('/batch-delete', async (req, res, next) => {
  try {
    const { ids, all } = req.body || {};
    if (all === true) {
      const result = await History.deleteMany({ userId: req.user.id });
      return res.status(200).json({ message: 'All history deleted', deletedCount: result.deletedCount });
    }
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 500) {
      return res.status(400).json({
        code: 'INVALID_HISTORY_IDS',
        error: 'ids must be an array containing 1 to 500 records'
      });
    }
    if (!validateObjectIdArray(ids)) {
      return res.status(400).json({ code: 'INVALID_ID', error: 'Every history id must be valid' });
    }
    const result = await History.deleteMany({ _id: { $in: ids }, userId: req.user.id });
    res.status(200).json({ message: 'Batch deletion successful', deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
