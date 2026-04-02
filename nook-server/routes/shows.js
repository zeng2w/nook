const express = require('express');
const router = express.Router();
const Show = require('../models/Show'); 
const axios = require('axios');

// TMDB API Key
const TMDB_API_KEY = process.env.TMDB_API_KEY; 

// ==========================================
// 1. 获取剧集列表
// ==========================================
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ msg: 'UserId is required' });

  try {
    const shows = await Show.find({ userId }).sort({ updatedAt: -1 });
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
    const { 
      userId, title, category, status, 
      totalEpisodes, airedEpisodes, watchedEpisodes,
      posterUrl, tmdbId, updateFrequency, 
      updateDays, updateCount, lastAirDate,
      network, networkLogo 
    } = req.body;

    if (tmdbId) {
      const existingShow = await Show.findOne({ userId, tmdbId });
      if (existingShow) {
        return res.status(400).json({ error: `剧集《${existingShow.title}》已存在，请勿重复添加。` });
      }
    }

    const newShow = new Show({
      userId, title, category, status,
      totalEpisodes, airedEpisodes, watchedEpisodes,
      posterUrl, tmdbId, updateFrequency,
      updateDays, updateCount, lastAirDate,
      network, networkLogo
    });

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
    const updateData = { ...req.body, updatedAt: Date.now() };
    const show = await Show.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );
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
    await Show.findByIdAndDelete(req.params.id);
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
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserId required' });

  try {
    const activeShows = await Show.find({
      userId,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    });

    const updateLogs = [];

    // ★ 修复：改用 for...of 串行处理，保护 TMDB API 额度
    for (const show of activeShows) {
      if (!show.tmdbId) continue; 

      const queryType = show.category === 'movie' ? 'movie' : 'tv';
      if (queryType === 'movie') continue; 

      try {
        const tmdbRes = await axios.get(`https://api.themoviedb.org/3/${queryType}/${show.tmdbId}`, {
          params: { api_key: TMDB_API_KEY, language: 'zh-CN' }
        });
        
        const remoteData = tmdbRes.data;
        let needsSave = false;
        
        if (remoteData.last_episode_to_air) {
          const newEpisodeCount = remoteData.last_episode_to_air.episode_number;
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

        // ★ 每次请求后暂停 200 毫秒
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (err) {
        console.error(`[Sync] Fail: ${show.title}`, err.message);
      }
    }

    res.json({ 
      success: true, 
      updatedCount: updateLogs.length, 
      logs: updateLogs 
    });

  } catch (err) {
    console.error('Sync Error:', err);
    res.status(500).json({ error: '同步服务出错' });
  }
});

// GET /api/shows/export
router.get('/export', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'UserId required' });

  try {
    const shows = await Show.find({ userId });
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
  const { userId, shows } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserId required' });
  if (!Array.isArray(shows)) return res.status(400).json({ error: 'Invalid data format' });

  let skipCount = 0;
  const validShowsToInsert = [];

  try {
    for (const item of shows) {
      delete item._id;
      delete item.__v;
      item.userId = userId;

      let exists = null;
      if (item.tmdbId) {
        exists = await Show.findOne({ userId, tmdbId: item.tmdbId });
      } else {
        exists = await Show.findOne({ userId, title: item.title });
      }

      if (exists) {
        skipCount++;
      } else {
        validShowsToInsert.push(item);
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