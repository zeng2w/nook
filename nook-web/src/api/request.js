import axios from 'axios';
import { showToast } from '@/composables/useToast';

// 创建 axios 实例
const service = axios.create({
  timeout: 15000, // 15秒超时时间
});

// 响应拦截器 (核心)
service.interceptors.response.use(
  (response) => {
    // 请求成功，直接把数据原样返回给组件
    return response;
  },
  (error) => {
    // 请求失败，统一拦截处理
    console.error('API 请求报错:', error);
    
    // 尝试获取后端返回的具体错误信息，如果没有则用默认提示
    const errorMsg = error.response?.data?.message || error.message || '网络或服务器开小差了，请稍后再试';
    
    // 全局自动弹出报错 Toast
    showToast(errorMsg, 'error');
    
    // 将错误继续向下抛出，以便组件内部的 catch(e) 可以执行特有的回滚逻辑（如进度回滚）
    return Promise.reject(error);
  }
);

export default service;