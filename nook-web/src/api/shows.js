// src/api/shows.js
import axios from 'axios';

// 1. 获取剧集列表
export const fetchShowsApi = (userId) => {
  return axios.get(`/api/shows?userId=${userId}&t=${new Date().getTime()}`);
};

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
export const syncShowsApi = (userId) => {
  return axios.post('/api/shows/sync', { userId });
};

// 6. 导入数据
export const importShowsApi = (userId, shows) => {
  return axios.post('/api/shows/import', { userId, shows });
};

// 7. 记录观看历史 (TvLog 热力图使用)
export const addTvLogApi = (data) => {
  return axios.post('/api/tvlog', data);
};

// 8. 获取观看历史 (用于 Dashboard 热力图)
export const fetchTvLogApi = (userId) => {
  return axios.get(`/api/tvlog?userId=${userId}`);
};