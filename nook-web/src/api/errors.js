export const getApiErrorMessage = (error, fallback = '操作失败，请稍后重试') => {
  const payload = error?.response?.data;
  if (typeof payload === 'string' && payload.trim()) return payload;
  if (payload?.error) return payload.error;
  if (payload?.msg) return payload.msg;
  if (!error?.response) return '无法连接服务器，请确认后端正在运行并检查网络连接';
  return fallback;
};
