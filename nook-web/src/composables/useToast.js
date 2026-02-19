import { reactive } from 'vue';

// 全局响应式状态
export const globalToast = reactive({ 
  visible: false, 
  message: '', 
  type: 'success' 
});

// 全局呼出方法
export const showToast = (msg, type = 'success') => {
  globalToast.message = msg;
  globalToast.type = type;
  globalToast.visible = true;
  
  // 3秒后自动隐藏
  setTimeout(() => { 
    globalToast.visible = false; 
  }, 3000);
};