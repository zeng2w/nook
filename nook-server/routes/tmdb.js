const express = require('express');
const { getMediaPresentation } = require('../utils/mediaPresentation');
const router = express.Router();
const {
  classifyTmdbCategory,
  getAiredEpisodeCount,
  getTmdbMediaType,
  getRecommendedSeasonNumber,
  getTmdbSchedule,
  getTmdbSeasonProgress
} = require('../utils/tmdb');
const { getCacheTtl, sendTmdbError, tmdbGet } = require('../utils/tmdbClient');

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w342';

// 辅助函数：拼接完整的海报 URL
const getPosterUrl = (path) => path ? `${IMAGE_BASE_URL}${path}` : '';

// ==========================================
// 1. 搜索接口
// GET /api/tmdb/search?query=海贼王
// ==========================================
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ code: 'INVALID_QUERY', error: 'Query is required' });

    // 使用 multi search 同时搜索 剧集(tv) 和 电影(movie)
    const response = await tmdbGet('/search/multi', {
      cacheTtlMs: Math.min(getCacheTtl(), 60 * 1000),
      params: {
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
        // 使用 TMDB genre 区分动漫、综艺和普通电视剧，避免把日本真人剧误判为动漫。
        category: classifyTmdbCategory(item),
        tmdbType: item.media_type,
        posterUrl: getPosterUrl(item.poster_path),
        // 发行年份 (用于前端显示)
        releaseDate: item.release_date || item.first_air_date,
        overview: item.overview
        // 注意：搜索接口通常不返回 networks 数据，所以这里没有添加
      }));

    res.json(results);
  } catch (err) {
    return sendTmdbError(res, err, 'search');
  }
});

// ==========================================
// 2. 详情接口 (智能提取核心数据 + 平台信息)
// GET /api/tmdb/details/:type/:id
// ==========================================
router.get('/details/:type/:id', async (req, res) => {
  try {
    const { type, id } = req.params; 
    
    // TMDB API 只有 'tv' 和 'movie' 两个端点，动漫和综艺都查询 TV。
    const queryType = getTmdbMediaType(type);
    if (!['tv', 'movie'].includes(queryType) || !/^\d+$/.test(id)) {
      return res.status(400).json({ code: 'INVALID_TMDB_ID', error: 'Invalid TMDB type or id' });
    }

    const response = await tmdbGet(`/${queryType}/${id}`, {
      cacheTtlMs: getCacheTtl(),
      params: { language: 'zh-CN', append_to_response: queryType === 'tv' ? 'aggregate_credits' : 'credits' }
    });

    const data = response.data;
    
    // --- A. 智能推断：集数与时间 ---
    let currentAired = 0;
    let lastAirDate = null;

    // 如果有“最后一集”信息 (通常用于连载中的剧集)
    if (data.last_episode_to_air) {
      currentAired = getAiredEpisodeCount(data);
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

    // --- 【关键修改】C. 提取播放平台 (Networks/Production Companies) ---
    // 电视剧使用 networks，电影使用 production_companies
    const networksData = data.networks || data.production_companies || [];

    // --- D. 构造返回给前端的最终对象 ---
    const schedule = queryType === 'movie'
      ? { updateFrequency: 'ended', updateDays: [], nextAirDate: null }
      : getTmdbSchedule(data);
    const details = {
      ...getMediaPresentation(data),
      tmdbId: data.id,
      title: data.title || data.name,
      
      // 总集数：电影默认为1，剧集取 TMDB 数据
      totalEpisodes: queryType === 'movie' ? 1 : data.number_of_episodes,
      
      // 智能提取的“已更新集数”
      airedEpisodes: currentAired,
      
      // 智能提取的“最近更新时间”
      lastAirDate: lastAirDate,
      
      // 原始状态
      status: data.status, 
      
      posterUrl: getPosterUrl(data.poster_path),
      
      // 【新增】将提取到的平台数据传回前端
      networks: networksData,
      
      // 分季列表
      seasons: validSeasons,

      // 添加时优先追踪正在更新或最近更新的季度。
      recommendedSeasonNumber: queryType === 'tv'
        ? getRecommendedSeasonNumber(data)
        : null,

      // 电影没有季度或后续集数；剧集则只在 TMDB 提供下一集日期时推断周更。
      ...schedule
    };

    res.json(details);
  } catch (err) {
    return sendTmdbError(res, err, 'details');
  }
});

// 查询单季的已播集数、下一集日期和完结状态。
router.get('/season/:id/:seasonNumber', async (req, res) => {
  const { id, seasonNumber } = req.params;
  if (!/^\d+$/.test(id) || !/^\d+$/.test(seasonNumber) || Number(seasonNumber) < 1) {
    return res.status(400).json({ code: 'INVALID_TMDB_SEASON', error: 'Invalid TMDB show or season id' });
  }

  try {
    const [seriesResponse, seasonResponse] = await Promise.all([
      tmdbGet(`/tv/${id}`, {
        cacheTtlMs: getCacheTtl(),
        params: { language: 'zh-CN' }
      }),
      tmdbGet(`/tv/${id}/season/${seasonNumber}`, {
        cacheTtlMs: getCacheTtl(),
        params: { language: 'zh-CN', append_to_response: 'aggregate_credits' }
      })
    ]);
    const progress = getTmdbSeasonProgress(seasonResponse.data, seriesResponse.data, {
      seasonNumber: Number(seasonNumber)
    });

    res.json({
      ...progress,
      ...getMediaPresentation(seasonResponse.data, seriesResponse.data),
      posterUrl: getPosterUrl(seasonResponse.data.poster_path || seriesResponse.data.poster_path)
    });
  } catch (err) {
    return sendTmdbError(res, err, 'season-details');
  }
});

// 3. 获取热门剧集排行榜 (Top 10)
router.get('/trending', async (req, res) => {
  try {
    const response = await tmdbGet('/tv/popular', {
      cacheTtlMs: getCacheTtl(),
      params: { language: 'zh-CN', page: 1 }
    });
    // 只取前 10 条数据减轻前端渲染压力
    const popularShows = response.data.results.slice(0, 10);
    res.json(popularShows);
  } catch (err) {
    return sendTmdbError(res, err, 'trending');
  }
});

// 4. 获取最新开播剧集
router.get('/new-releases', async (req, res) => {
  try {
    const response = await tmdbGet('/tv/on_the_air', {
      cacheTtlMs: getCacheTtl(),
      params: { language: 'zh-CN', page: 1 }
    });
    const newShows = response.data.results.slice(0, 10);
    res.json(newShows);
  } catch (err) {
    return sendTmdbError(res, err, 'new-releases');
  }
});

module.exports = router;
