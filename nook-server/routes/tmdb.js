const express = require('express');
const router = express.Router();
const axios = require('axios');

// 【重要】请将此处替换为你申请到的 TMDB API Key
const TMDB_API_KEY = 'b11ae0869390e856ba928a3d91813746'; 

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // w500 代表海报宽度

// 辅助函数：拼接完整的海报 URL
const getPosterUrl = (path) => path ? `${IMAGE_BASE_URL}${path}` : '';

// ==========================================
// 1. 搜索接口
// GET /api/tmdb/search?query=海贼王
// ==========================================
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ msg: 'Query is required' });

    // 使用 multi search 同时搜索 剧集(tv) 和 电影(movie)
    const response = await axios.get(`${BASE_URL}/search/multi`, {
      params: {
        api_key: TMDB_API_KEY,
        language: 'zh-CN', // 优先返回中文结果
        query: query,
        include_adult: false
      }
    });

    // 数据清洗：只保留需要的字段
    const results = response.data.results
      .filter(item => item.media_type === 'tv' || item.media_type === 'movie')
      .map(item => ({
        tmdbId: item.id,
        // 电影用 title, 剧集用 name
        title: item.title || item.name, 
        // 简单判断分类：如果是 TV 且产地包含日本，标记为 anime，否则为 tv
        category: item.media_type === 'tv' ? (item.origin_country?.includes('JP') ? 'anime' : 'tv') : 'movie',
        posterUrl: getPosterUrl(item.poster_path),
        // 发行年份 (用于前端显示)
        releaseDate: item.release_date || item.first_air_date,
        overview: item.overview
      }));

    res.json(results);
  } catch (err) {
    console.error('TMDB Search Error:', err.message);
    res.status(500).send('TMDB API Error');
  }
});

// ==========================================
// 2. 详情接口 (智能提取核心数据)
// GET /api/tmdb/details/:type/:id
// ==========================================
router.get('/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params; 
    
    // TMDB API 只有 'tv' 和 'movie' 两个端点
    // 如果前端传的是 'anime'，我们需要把它转回 'tv' 来查询
    const queryType = type === 'anime' ? 'tv' : type;

    const response = await axios.get(`${BASE_URL}/${queryType}/${id}`, {
      params: { api_key: TMDB_API_KEY, language: 'zh-CN' }
    });

    const data = response.data;
    
    // --- A. 智能推断：集数与时间 ---
    let currentAired = 0;
    let lastAirDate = null;

    // 如果有“最后一集”信息 (通常用于连载中的剧集)
    if (data.last_episode_to_air) {
      currentAired = data.last_episode_to_air.episode_number; // 当前已播出到第几集
      lastAirDate = data.last_episode_to_air.air_date;        // 这一集的播出时间
    } else {
      // 如果是电影，或者数据缺失的老剧
      currentAired = data.number_of_episodes || 1;
      lastAirDate = data.release_date || data.first_air_date;
    }

    // --- B. 处理分季信息 (Seasons) ---
    // 过滤掉 season 0 (通常是特别篇/花絮)，只保留正片季
    const validSeasons = (data.seasons || [])
      .filter(s => s.season_number > 0)
      .map(s => ({
        seasonNumber: s.season_number,
        name: s.name,
        episodeCount: s.episode_count,
        airDate: s.air_date
      }));

    // --- C. 构造返回给前端的最终对象 ---
    const details = {
      tmdbId: data.id,
      title: data.title || data.name,
      
      // 总集数：电影默认为1，剧集取 TMDB 数据
      totalEpisodes: queryType === 'movie' ? 1 : data.number_of_episodes,
      
      // 智能提取的“已更新集数”
      airedEpisodes: currentAired,
      
      // 智能提取的“最近更新时间”
      lastAirDate: lastAirDate,
      
      // 原始状态 (Returning Series / Ended / Canceled)
      status: data.status, 
      
      posterUrl: getPosterUrl(data.poster_path),
      
      // 分季列表 (供前端“选择特定一季”使用)
      seasons: validSeasons
    };

    // --- D. 推断更新频率 ---
    // 如果状态是完结或被砍，频率设为 ended
    if (data.status === 'Ended' || data.status === 'Canceled') {
      details.updateFrequency = 'ended';
    } 
    // 如果还在连载，默认设为周更 (这是最常见的情况，方便用户)
    else if (data.status === 'Returning Series') {
      details.updateFrequency = 'weekly'; 
    }

    res.json(details);
  } catch (err) {
    console.error('TMDB Details Error:', err.message);
    res.status(500).send('TMDB Details Error');
  }
});

module.exports = router;