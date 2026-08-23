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

export const updateShowProgressApi = (id, data) => {
  return axios.patch(`/api/shows/${id}/progress`, data);
};

// 4. 删除剧集
export const deleteShowApi = (id) => {
  return axios.delete(`/api/shows/${id}`);
};

// 5. 同步数据。自动同步传 force: false，手动按钮传 force: true。
export const syncShowsApi = ({ force = true, timeZone } = {}) => {
  return axios.post('/api/shows/sync', { force, timeZone });
};

// 6. 导入数据
export const importShowsApi = (shows) => {
  return axios.post('/api/shows/import', { shows });
};

// 7. 获取观看历史 (用于 Dashboard 热力图)
export const fetchTvActivityApi = (timeZone) => axios.get('/api/tvlog/activity', {
  params: timeZone ? { timeZone } : undefined
});
