import request from './request'; // 👈 引入带有拦截器的实例

export const fetchShowsApi = (userId) => {
  return request.get(`/api/shows?userId=${userId}`);
};

export const addShowApi = (data) => {
  return request.post('/api/shows', data);
};

export const updateShowApi = (id, data) => {
  return request.put(`/api/shows/${id}`, data);
};

export const deleteShowApi = (id) => {
  return request.delete(`/api/shows/${id}`);
};

export const syncShowsApi = (userId) => {
  return request.post('/api/shows/sync', { userId });
};

export const importShowsApi = (userId, shows) => {
  return request.post('/api/shows/import', { userId, shows });
};

export const addTvLogApi = (data) => {
  return request.post('/api/tvlog', data);
};

export const fetchTvLogApi = (userId) => {
  return request.get(`/api/tvlog?userId=${userId}`);
};