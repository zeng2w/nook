import axios from 'axios';

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  response => response,
  error => {
    const isAuthRequest = /\/api\/auth\/(login|register)/.test(error.config?.url || '');

    if (error.response?.status === 401 && !isAuthRequest) {
      sessionStorage.removeItem('current_user');
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
