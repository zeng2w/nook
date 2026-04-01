// src/store.js
import { reactive } from 'vue';

export const store = reactive({
  themeColor: '#ffffff', // 默认白色
  isLightMode: true      // 默认浅色模式（亮底黑字）
});

// 更新颜色的辅助函数，采用 W3C 推荐的 YIQ 算法
export function updateTheme(color) {
  if (!color) {
    store.themeColor = '#ffffff';
    store.isLightMode = true;
    return;
  }
  
  store.themeColor = color;
  let c = color.toLowerCase().trim();

  // 1. 快捷处理极值
  if (c === 'white' || c === '#fff' || c === '#ffffff') {
    store.isLightMode = true;
    return;
  }
  if (c === 'black' || c === '#000' || c === '#000000') {
    store.isLightMode = false;
    return;
  }

  // 2. 兼容 rgba/rgb
  if (c.startsWith('rgb')) {
    const rgbValues = c.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      const r = parseInt(rgbValues[0], 10);
      const g = parseInt(rgbValues[1], 10);
      const b = parseInt(rgbValues[2], 10);
      store.isLightMode = ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128;
      return;
    }
  }

  // 3. 标准 HEX 格式处理
  let hex = c.startsWith('#') ? c.substring(1) : c;
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    store.isLightMode = true; 
    return;
  }

  // 亮度大于等于 128，认为是浅色背景，需要黑色字体
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  store.isLightMode = yiq >= 128;
}