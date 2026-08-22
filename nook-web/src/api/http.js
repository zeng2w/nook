import axios from 'axios';
import { clearAuthUser } from '@/auth';

axios.defaults.withCredentials = true;

axios.interceptors.response.use(
  response => response,
  error => {
    const isAuthRequest = /\/api\/auth\/(login|register|me)/.test(error.config?.url || '');

    if (error.response?.status === 401 && !isAuthRequest) {
      clearAuthUser();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export default axios;
