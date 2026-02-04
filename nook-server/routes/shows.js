const express = require('express');
const router = express.Router();
const Show = require('../models/Show'); 
const axios = require('axios');

// TMDB API Key (建议后续放入 .env)
const TMDB_API_KEY = process.env.TMDB_API_KEY; 

// ==========================================
// 1. 获取剧集列表
// GET /api/shows
// ==========================================
router.get('/', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ msg: 'UserId is required' });

  try {
    // 按最后更新时间倒序
    const shows = await Show.find({ userId }).sort({ updatedAt: -1 });
    res.json(shows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 2. 添加新剧集 (含查重逻辑)
// POST /api/shows
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

    // 【1. 查重逻辑】防止重复添加
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
// PUT /api/shows/:id
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
// DELETE /api/shows/:id
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
// 5. 🔄 手动同步接口 (返回详细日志)
// POST /api/shows/sync
// ==========================================
router.post('/sync', async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserId required' });

  try {
    // 1. 找出需要检查的剧集 (排除弃剧和已完结)
    const activeShows = await Show.find({
      userId,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    });

    const updateLogs = []; // 用于收集本次更新的具体内容

    // 2. 遍历检查
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
        
        // --- A. 核心检查：集数更新 ---
        if (remoteData.last_episode_to_air) {
          const newEpisodeCount = remoteData.last_episode_to_air.episode_number;
          const newAirDate = remoteData.last_episode_to_air.air_date;
          
          // 只有当远程集数 > 本地集数时，才视为“有效更新”并记录日志
          if (newEpisodeCount > show.airedEpisodes) {
            // 添加到日志列表
            updateLogs.push({
              id: show._id,
              title: show.title,
              oldEp: show.airedEpisodes,
              newEp: newEpisodeCount,
              date: newAirDate || new Date().toISOString().split('T')[0],
              posterUrl: show.posterUrl
            });

            // 更新本地数据
            show.airedEpisodes = newEpisodeCount;
            if (newAirDate) show.lastAirDate = newAirDate;
            needsSave = true;
          }
        }
        
        // --- B. 辅助检查：总集数/状态/Logo (静默更新) ---
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

        // 3. 执行保存
        if (needsSave) {
          await show.save();
        }

      } catch (err) {
        console.error(`[Sync] Fail: ${show.title}`, err.message);
        continue; 
      }
    }

    // 返回结果给前端
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
// 导出所有数据为 JSON
router.get('/export', async (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'UserId required' });

  try {
    const shows = await Show.find({ userId });
    // 设置响应头，告诉浏览器这是一个要下载的文件
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=tv_shows_backup_${Date.now()}.json`);
    
    // 格式化 JSON 输出，2个空格缩进
    res.send(JSON.stringify(shows, null, 2));
  } catch (err) {
    res.status(500).send('Export Failed');
  }
});

// ==========================================
// 6. 📥 数据导入接口 (恢复备份)
// POST /api/shows/import
// ==========================================
router.post('/import', async (req, res) => {
  const { userId, shows } = req.body;
  if (!userId) return res.status(400).json({ error: 'UserId required' });
  if (!Array.isArray(shows)) return res.status(400).json({ error: 'Invalid data format' });

  let successCount = 0;
  let skipCount = 0;

  try {
    for (const item of shows) {
      // 1. 基本清洗：移除原有的 _id 和 __v，防止冲突
      delete item._id;
      delete item.__v;
      
      // 2. 归属权强制修正
      item.userId = userId;

      // 3. 查重逻辑：如果该剧集(tmdbId)已存在，则跳过
      // 如果是旧数据没有 tmdbId，则根据 title 查重(兜底)
      let exists = null;
      if (item.tmdbId) {
        exists = await Show.findOne({ userId, tmdbId: item.tmdbId });
      } else {
        exists = await Show.findOne({ userId, title: item.title });
      }

      if (exists) {
        skipCount++;
        continue;
      }

      // 4. 插入新数据
      const newShow = new Show(item);
      await newShow.save();
      successCount++;
    }

    res.json({ 
      success: true, 
      message: `导入完成：成功 ${successCount} 部，跳过重复 ${skipCount} 部`,
      successCount,
      skipCount 
    });

  } catch (err) {
    console.error('Import Error:', err);
    res.status(500).json({ error: '导入过程中发生错误' });
  }
});

module.exports = router;