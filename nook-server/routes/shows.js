const express = require('express');
const router = express.Router();
const Show = require('../models/Show'); 
const axios = require('axios');

// TMDB API Key
const TMDB_API_KEY = 'b11ae0869390e856ba928a3d91813746'; 

// ==========================================
// 1. 获取用户的所有剧集
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
// 2. 添加新剧集
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
// 3. 更新剧集信息
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
// 5. 🔄 全局同步接口 (精准控制版)
// POST /api/shows/sync
// ==========================================
router.post('/sync', async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) return res.status(400).json({ error: 'UserId required' });

  try {
    // 1. 找出需要检查的剧集
    const activeShows = await Show.find({
      userId,
      status: { $ne: 'dropped' },
      updateFrequency: { $ne: 'ended' }
    });

    // 用于存储具体的更新日志，返回给前端展示
    const updateLogs = [];

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
        let needsSave = false; // 是否需要写数据库
        let isNewEpisode = false; // 是否是值得通知的新集数

        // --- A. 核心检查：是否有新集数 ---
        if (remoteData.last_episode_to_air) {
          const newEpisodeCount = remoteData.last_episode_to_air.episode_number;
          const newAirDate = remoteData.last_episode_to_air.air_date;
          
          // 【严格判断】只有当远程集数 > 本地集数时，才算更新
          if (newEpisodeCount > show.airedEpisodes) {
            // 记录日志对象
            updateLogs.push({
              id: show._id,
              title: show.title,
              posterUrl: show.posterUrl,
              oldEp: show.airedEpisodes,
              newEp: newEpisodeCount,
              date: newAirDate || new Date().toISOString().split('T')[0]
            });

            show.airedEpisodes = newEpisodeCount;
            if (newAirDate) show.lastAirDate = newAirDate;
            
            needsSave = true;
            isNewEpisode = true;
          }
        }
        
        // --- B. 辅助检查：总集数/完结/网络 (静默更新，不通知) ---
        // 虽然不通知用户，但数据库还是要更，保证数据准确性
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
          if (isNewEpisode) {
            console.log(`[Sync] 🔥 ${show.title} 更新至第 ${show.airedEpisodes} 集`);
          } else {
            console.log(`[Sync] 📝 ${show.title} 元数据静默更新`);
          }
        }

      } catch (err) {
        console.error(`[Sync] Fail: ${show.title}`, err.message);
        continue; 
      }
    }

    // 返回详细的 updateLogs 数组，而不仅仅是数字
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

module.exports = router;