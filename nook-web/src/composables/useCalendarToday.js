import { onMounted, onBeforeUnmount, ref } from 'vue';
import { isSameCalendarDay, toLocalCalendarDate } from '@/utils/dateUtils';

// 只更新本地日期，不发起网络请求。恢复窗口时也处理休眠错过的午夜。
export const useCalendarToday = () => {
  const today = ref(toLocalCalendarDate(new Date()));
  let timer;
  const refresh = () => {
    clearTimeout(timer);
    const now = new Date();
    if (!isSameCalendarDay(now, today.value)) today.value = toLocalCalendarDate(now);
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 100);
  };
  onMounted(() => {
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
  });
  onBeforeUnmount(() => {
    clearTimeout(timer);
    window.removeEventListener('focus', refresh);
    document.removeEventListener('visibilitychange', refresh);
  });
  return today;
};
