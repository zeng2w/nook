// src/composables/useGlobalShows.js
import { ref } from 'vue';
import { fetchShowsApi } from '@/api/shows';

// ★ 关键：把变量定义在函数外部！这样所有引入这个文件的组件共享同一份数据
const globalShows = ref([]);
const isShowsLoaded = ref(false); // 是否已经成功加载过
const isShowsLoading = ref(false); // 是否正在加载中

export function useGlobalShows() {
  
  // 获取剧集的方法 (带缓存逻辑)
  const fetchGlobalShows = async (userId, forceRefresh = false) => {
    if (!userId) return;
    
    // 如果已经加载过数据，且不是强制刷新，就直接 return，不再发请求！
    if (isShowsLoaded.value && !forceRefresh) return;

    isShowsLoading.value = true;
    try {
      const res = await fetchShowsApi(userId);
      globalShows.value = res.data;
      isShowsLoaded.value = true;
    } catch (err) {
      console.error('获取全局剧集失败:', err);
    } finally {
      // 加个极短的延迟让动画更平滑
      setTimeout(() => { isShowsLoading.value = false; }, 300);
    }
  };

  return {
    shows: globalShows,
    isLoading: isShowsLoading,
    isLoaded: isShowsLoaded,
    fetchGlobalShows
  };
}