const express = require('express');
const router = express.Router();
const Show = require('../models/Show');

// --- 智能完结日计算器 ---
const calculateFinishDate = (lastAirDate, total, aired, freq, days, count) => {
  // 基础校验
  if (!total || !aired || total <= aired || freq === 'ended' || freq === 'unknown') {
    return null;
  }

  let remaining = total - aired;
  let currentDate = new Date(lastAirDate || Date.now());
  const epPerUpdate = count || 1; // 默认每次更1集

  // 1. 如果是日更 (简单数学)
  if (freq === 'daily') {
    const daysNeeded = Math.ceil(remaining / epPerUpdate);
    currentDate.setDate(currentDate.getDate() + daysNeeded);
    return currentDate;
  }

  // 2. 如果是月更 (简单数学)
  if (freq === 'monthly') {
    const monthsNeeded = Math.ceil(remaining / epPerUpdate);
    currentDate.setMonth(currentDate.getMonth() + monthsNeeded);
    return currentDate;
  }

  // 3. 如果是周更 (复杂模拟：支持每周多天)
  if (freq === 'weekly') {
    // 如果没有指定具体哪天，默认按7天一更算
    if (!days || days.length === 0) {
      const weeksNeeded = Math.ceil(remaining / epPerUpdate);
      currentDate.setDate(currentDate.getDate() + (weeksNeeded * 7));
      return currentDate;
    }

    // 模拟推演：一天天往后走，直到更完
    // (为了防止死循环，设置最大推演天数，比如10年)
    let safeGuard = 3650; 
    while (remaining > 0 && safeGuard > 0) {
      currentDate.setDate(currentDate.getDate() + 1); // 明天
      const dayOfWeek = currentDate.getDay(); // 0-6
      
      // 如果今天是更新日
      if (days.includes(dayOfWeek)) {
        remaining -= epPerUpdate;
      }
      safeGuard--;
    }
    return currentDate;
  }

  return null;
};

// GET
router.get('/', async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ msg: 'User ID required' });
    const shows = await Show.find({ userId }).sort({ updatedAt: -1 }); 
    res.json(shows);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// POST (添加)
router.post('/', async (req, res) => {
  try {
    const body = req.body;
    
    // 计算日期
    const estimatedFinishDate = calculateFinishDate(
      body.lastAirDate, 
      body.totalEpisodes, 
      body.airedEpisodes, 
      body.updateFrequency,
      body.updateDays,
      body.updateCount
    );

    const newShow = new Show({
      ...body,
      status: body.status || 'wish',
      lastAirDate: body.lastAirDate || Date.now(),
      estimatedFinishDate
    });

    const show = await newShow.save();
    res.json(show);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// PUT (更新 - 包含编辑功能)
router.put('/:id', async (req, res) => {
  try {
    let updateData = req.body;
    updateData.updatedAt = Date.now();

    // 如果这次请求包含了影响日期的字段，则重新计算
    // 注意：这里为了简化，假设前端编辑时会把所有相关字段都传过来
    if (updateData.totalEpisodes || updateData.airedEpisodes || updateData.updateFrequency) {
        updateData.estimatedFinishDate = calculateFinishDate(
            updateData.lastAirDate, 
            updateData.totalEpisodes, 
            updateData.airedEpisodes, 
            updateData.updateFrequency,
            updateData.updateDays,
            updateData.updateCount
        );
    }

    const show = await Show.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    if (!show) return res.status(404).json({ msg: 'Show not found' });
    res.json(show);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await Show.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Show removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;