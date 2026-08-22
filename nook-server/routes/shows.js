const express = require('express');
const router = express.Router();
const Show = require('../models/Show'); 
const { getAiredEpisodeCount } = require('../utils/tmdb');
const { classifyTmdbError, sendTmdbError, tmdbGet } = require('../utils/tmdbClient');

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

// ==========================================
// 1. 获取剧集列表
// ==========================================
router.get('/', async (req, res) => {
  try {
    const shows = await Show.find({ userId: req.user.id }).sort({ updatedAt: -1 });
    res.json(shows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 2. 添加新剧集 (含查重逻辑)
// ==========================================
router.post('/', async (req, res) => {
  try {
    const showData = pickShowFields(req.body);
    const { tmdbId } = showData;

    if (tmdbId) {
      const existingShow = await Show.findOne({ userId: req.user.id, tmdbId });
      if (existingShow) {
        return res.status(400).json({ error: `剧集《${existingShow.title}》已存在，请勿重复添加。` });
      }
    }

    const newShow = new Show({ userId: req.user.id, ...showData });

    const show = await newShow.save();
    res.json(show);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 3. 更新剧集 (进度/状态)
// ==========================================
router.put('/:id', async (req, res) => {
  try {
    const updateData = { ...pickShowFields(req.body), updatedAt: Date.now() };
    const show = await Show.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: updateData },
      { new: true, runValidators: true }
    );
    if (!show) return res.status(404).json({ msg: 'Show not found' });
    res.json(show);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 4. 删除剧集
// ==========================================
router.delete('/:id', async (req, res) => {
  try {
    const show = await Show.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!show) return res.status(404).json({ msg: 'Show not found' });
    res.json({ msg: 'Show removed' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 5. 🔄 手动同步接口 (修复：串行执行 + 延时控制防封 IP)
// ==========================================
router.post('/sync', async (req, res) => {
  try {
    const activeShows = await Show.find({
      userId: req.user.id,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    });

    const updateLogs = [];
    let attemptedCount = 0;
    let failedCount = 0;
    let firstFailure = null;

    // ★ 修复：改用 for...of 串行处理，保护 TMDB API 额度
    for (const show of activeShows) {
      if (!show.tmdbId) continue; 

      const queryType = show.category === 'movie' ? 'movie' : 'tv';
      if (queryType === 'movie') continue; 
      attemptedCount++;

      try {
        const tmdbRes = await tmdbGet(`/${queryType}/${show.tmdbId}`, {
          params: { language: 'zh-CN' }
        });
        
        const remoteData = tmdbRes.data;
        let needsSave = false;
        
        if (remoteData.last_episode_to_air) {
          const newEpisodeCount = getAiredEpisodeCount(remoteData);
          const newAirDate = remoteData.last_episode_to_air.air_date;
          
          if (newEpisodeCount > show.airedEpisodes) {
            updateLogs.push({
              id: show._id,
              title: show.title,
              oldEp: show.airedEpisodes,
              newEp: newEpisodeCount,
              date: newAirDate || new Date().toISOString().split('T')[0],
              posterUrl: show.posterUrl
            });

            show.airedEpisodes = newEpisodeCount;
            if (newAirDate) show.lastAirDate = newAirDate;
            needsSave = true;
          }
        }
        
        if (remoteData.number_of_episodes && remoteData.number_of_episodes > show.totalEpisodes) {
          show.totalEpisodes = remoteData.number_of_episodes;
          needsSave = true;
        }
        if (remoteData.status === 'Ended' || remoteData.status === 'Canceled') {
           if (show.updateFrequency !== 'ended') {
             show.updateFrequency = 'ended';
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

        if (needsSave) {
          await show.save();
        }

      } catch (err) {
        failedCount++;
        firstFailure ||= err;
        const failure = classifyTmdbError(err);
        console.error(`[Sync] ${failure.code} for show ${show._id}`);
      } finally {
        // 每次请求后暂停 200 毫秒，避免短时间内触发上游限流。
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }

    if (attemptedCount > 0 && failedCount === attemptedCount) {
      return sendTmdbError(res, firstFailure, 'sync');
    }

    res.json({ 
      success: true, 
      updatedCount: updateLogs.length, 
      failedCount,
      logs: updateLogs 
    });

  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ error: '同步服务出错' });
  }
});

// GET /api/shows/export
router.get('/export', async (req, res) => {
  try {
    const shows = await Show.find({ userId: req.user.id });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tv_shows_backup_${Date.now()}.json`);
    res.send(JSON.stringify(shows, null, 2));
  } catch (err) {
    res.status(500).send('Export Failed');
  }
});

// ==========================================
// 6. 📥 数据导入接口 (批量化 & 事务优化)
// ==========================================
router.post('/import', async (req, res) => {
  const { shows } = req.body || {};
  if (!Array.isArray(shows)) return res.status(400).json({ error: 'Invalid data format' });
  if (shows.length > 1000) return res.status(400).json({ error: 'A maximum of 1000 shows can be imported at once' });

  let skipCount = 0;
  const validShowsToInsert = [];
  const seenKeys = new Set();

  try {
    for (const item of shows) {
      const showData = pickShowFields(item);
      const duplicateKey = showData.tmdbId
        ? `tmdb:${showData.tmdbId}`
        : `title:${String(showData.title || '').trim().toLowerCase()}`;

      if (seenKeys.has(duplicateKey)) {
        skipCount++;
        continue;
      }
      seenKeys.add(duplicateKey);

      let exists = null;
      if (showData.tmdbId) {
        exists = await Show.findOne({ userId: req.user.id, tmdbId: showData.tmdbId });
      } else {
        exists = await Show.findOne({ userId: req.user.id, title: showData.title });
      }

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
      skipCount 
    });

  } catch (err) {
    console.error('Import Error:', err);
    res.status(500).json({ error: '导入过程中发生错误' });
  }
});

module.exports = router;
