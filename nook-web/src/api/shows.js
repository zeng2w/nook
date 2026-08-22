// src/api/shows.js
import axios from 'axios';

// 1. 获取剧集列表
export const fetchShowsApi = (params = {}) => {
  return axios.get('/api/shows', { params: { page: 1, limit: 24, ...params } });
};

export const fetchShowStatsApi = () => axios.get('/api/shows/stats');
export const fetchCalendarShowsApi = () => axios.get('/api/shows/calendar');

// 2. 添加新剧集
export const addShowApi = (data) => {
  return axios.post('/api/shows', data);
};

// 3. 更新剧集 (编辑内容 / 改状态 / 更新进度等都用这个)
export const updateShowApi = (id, data) => {
  return axios.put(`/api/shows/${id}`, data);
};

// 4. 删除剧集
export const deleteShowApi = (id) => {
  return axios.delete(`/api/shows/${id}`);
};

// 5. 同步数据
export const syncShowsApi = () => {
  return axios.post('/api/shows/sync');
};

// 6. 导入数据
export const importShowsApi = (shows) => {
  return axios.post('/api/shows/import', { shows });
};

// 7. 记录观看历史 (TvLog 热力图使用)
export const addTvLogApi = (data) => {
  return axios.post('/api/tvlog', data);
};

// 8. 获取观看历史 (用于 Dashboard 热力图)
export const fetchTvActivityApi = () => axios.get('/api/tvlog/activity');
