// src/store.js
import { reactive } from 'vue';

export const store = reactive({
  themeColor: '#000000', // 默认黑色
  isLightMode: false     // 是否是浅色模式
});

// 更新颜色的辅助函数
export function updateTheme(color) {
  store.themeColor = color;
  // 简单的逻辑：只有纯白背景时，才算浅色模式（字体变黑）
  // 其他颜色（黑、蓝、紫等）都算深色模式（字体变白）
  store.isLightMode = color.toLowerCase() === '#ffffff';
}