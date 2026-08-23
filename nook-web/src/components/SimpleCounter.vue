<template>
  <div 
    class="fullscreen-counter" 
    :class="{ 'light-theme': isLightMode }"
    :style="{ backgroundColor: settings.bgColor }"
    @click="handleScreenClick"
  >
    
    <div class="top-bar">
      <button class="icon-btn" aria-label="打开计数器设置" @click.stop="showModal = true">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5C13.933 15.5 15.5 13.933 15.5 12C15.5 10.067 13.933 8.5 12 8.5C10.067 8.5 8.5 10.067 8.5 12C8.5 13.933 10.067 15.5 12 15.5Z"/><path d="M19.4386 15.0232C19.5593 14.8698 20.3957 15.5034 20.7388 15.2287C21.4326 14.6734 22.0289 13.9961 22.4921 13.2263C22.716 12.8541 22.6599 12.3853 22.3533 12.0725C21.7248 11.4313 21.7248 10.4072 22.3533 9.76601C22.6599 9.45325 22.716 8.98444 22.4921 8.6122C22.0289 7.84239 21.4326 7.16515 20.7388 6.60982C20.3957 6.33512 19.5593 6.96875 19.4386 6.81529C18.6013 5.75169 18.2917 4.31464 18.6189 2.99262C18.7302 2.54287 18.4905 2.08051 18.0645 1.88476C17.2025 1.48865 16.2797 1.22904 15.3195 1.11956C14.845 1.06545 14.4078 1.3323 14.2376 1.77665C13.8927 2.67727 13.0185 3.27273 12 3.27273C10.9815 3.27273 10.1073 2.67727 9.76239 1.77665C9.59218 1.3323 9.15504 1.06545 8.6805 1.11956C7.72027 1.22904 6.79753 1.48865 5.93554 1.88476C5.50948 2.08051 5.26978 2.54287 5.38114 2.99262C5.70831 4.31464 5.39867 5.75169 4.56138 6.81529C4.44066 6.96875 3.60427 6.33512 3.26117 6.60982C2.56736 7.16515 1.97108 7.84239 1.50791 8.6122C1.28399 8.98444 1.34005 9.45325 1.6467 9.76601C2.27517 10.4072 2.27517 11.4313 1.6467 12.0725C1.34005 12.3853 1.28399 12.8541 1.50791 13.2263C1.97108 13.9961 2.56736 14.6734 3.26117 15.2287C3.60427 15.5034 4.44066 14.8698 4.56138 15.0232C5.39867 16.0868 5.70831 17.5239 5.38114 18.8459C5.26978 19.2957 5.50948 19.758 5.93554 19.9538C6.79753 20.3499 7.72027 20.6095 8.6805 20.719C9.15504 20.7731 9.59218 20.5062 9.76239 20.0619C10.1073 19.1613 10.9815 18.5658 12 18.5658C13.0185 18.5658 13.8927 19.1613 14.2376 20.0619C14.4078 20.5062 14.845 20.7731 15.3195 20.719C16.2797 20.6095 17.2025 20.3499 18.0645 19.9538C18.4905 19.758 18.7302 19.2957 18.6189 18.8459C18.2917 17.5239 18.6013 16.0868 19.4386 15.0232Z" stroke="none" /></svg>
      </button>
      <button class="icon-btn" aria-label="查看历史记录" @click.stop="openHistory">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
      </button>
      <button class="icon-btn" aria-label="保存并重置" @click.stop="triggerReset">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
      </button>
    </div>

    <button class="side-btn left-btn" aria-label="计数减一" @click.stop="decrement">
      <svg width="30" height="4" viewBox="0 0 30 4" fill="currentColor"><rect width="30" height="4" rx="2"/></svg>
    </button>
    <button class="side-btn right-btn" aria-label="计数加一" @click.stop="increment">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="currentColor"><path d="M13 17V29H17V17H29V13H17V1H13V13H1V17H13Z"/></svg>
    </button>

    <div class="center-display">
      <div class="counter-num">{{ settings.count }}</div>
    </div>
    <div v-if="settings.limitsEnabled" class="bottom-info">
      <div class="limit-val">{{ availableCount }}</div>
      <div class="limit-label">AVAILABLE</div>
    </div>

    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-container" :class="{ 'light-theme-modal': isLightMode }" :style="{ backgroundColor: settings.bgColor }">
          <div class="setting-card">
            <span class="label">Set count =</span>
            <input type="number" v-model.number="settings.count" class="num-input" min="0" />
          </div>
          <div class="setting-card column-layout">
            <div class="row-between">
              <span class="label">Limits <span :class="{ 'text-underline': !settings.limitsEnabled }">Off</span> / <span :class="{ 'text-underline': settings.limitsEnabled }">On</span></span>
              <label class="toggle-switch">
                <input type="checkbox" v-model="settings.limitsEnabled">
                <span class="slider"></span>
              </label>
            </div>
            <div v-if="settings.limitsEnabled" class="row-between mt-3">
              <span class="label">Maximum =</span>
              <input type="number" v-model.number="settings.maxValue" class="num-input" min="0" />
            </div>
          </div>
          
          <div class="setting-card">
            <div class="color-grid">
              <div 
                v-for="color in colorPalette" 
                :key="color" 
                class="color-item" 
                :style="{ backgroundColor: color }" 
                :class="{ active: settings.bgColor.toLowerCase() === color }" 
                @click="settings.bgColor = color"
              ></div>
              
              <div 
                class="color-item custom-color-picker" 
                :class="{ active: isCustomColor }"
                title="Custom Color"
              >
                <input type="color" v-model="settings.bgColor" class="hidden-color-input" />
              </div>

            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showResetModal" class="reset-overlay" :class="{ 'light-theme-text': isLightMode }" :style="{ backgroundColor: settings.bgColor }" @click.self="showResetModal = false">
        <button class="close-icon-btn" aria-label="关闭重置窗口" @click="showResetModal = false">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
        <div class="reset-content">
          <h2 class="reset-title">Save & Reset?</h2>
          
          <div class="time-input-row">
            <div class="time-group">
              <input type="number" v-model.number="resetInputs.hr" class="reset-time-input" placeholder="0" min="0" autofocus />
              <span class="time-unit-label">HR</span>
            </div>
            <span class="time-separator">:</span>
            <div class="time-group">
              <input type="number" v-model.number="resetInputs.min" class="reset-time-input" placeholder="0" min="0" />
              <span class="time-unit-label">MIN</span>
            </div>
            <span class="time-separator">:</span>
            <div class="time-group">
              <input type="number" v-model.number="resetInputs.sec" class="reset-time-input" placeholder="0" min="0" />
              <span class="time-unit-label">SEC</span>
            </div>
          </div>

          <div class="reset-actions">
            <button class="reset-option-btn" @click="confirmSaveAndReset">Save</button>
            <button class="reset-option-btn" @click="justReset">Discard</button>
          </div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showHistory" class="modal-overlay" @click.self="closeHistory">
        
        <div class="modal-container history-modal" :class="{ 'light-theme-modal': isLightMode }" :style="{ backgroundColor: settings.bgColor }">
          
          <div v-if="!isHistoryEditing" style="flex: 1; display:flex; flex-direction:column; min-height: 0;">
            <div class="history-header">
              <button class="header-text-btn clear-btn" :class="{ 'active': selectedIds.size > 0 }" @click="handleClear">
                {{ selectedIds.size > 0 ? `Clear (${selectedIds.size})` : 'Clear All' }}
              </button>
              <h3 class="history-title">History</h3>
              <button class="add-history-btn" @click="openHistoryForm()">+</button>
            </div>

            <div class="stats-overview">
              <span class="stats-title">PAST 30 DAYS</span>
              <div class="stats-main-val">
                <span class="stats-num">{{ last30DaysStats.avgEfficiency }}</span>
                <span class="stats-unit">m/ea</span>
              </div>
              <div class="stats-sub-vals">
                <span>Count: {{ last30DaysStats.totalCount }}</span>
                <span class="separator">|</span>
                <span>Time: {{ formatDuration(last30DaysStats.totalDuration) }}</span>
              </div>
            </div>

            <div class="history-list">
              <div v-if="historyError" class="empty-history history-error">
                {{ historyError }}
                <button class="history-retry-btn" @click="fetchHistory(true)">Retry</button>
              </div>
              <div v-else-if="history.length === 0" class="empty-history">No records yet.</div>
              <div v-for="item in history" :key="item._id" class="history-item">
                <button type="button" class="checkbox-wrapper" :aria-label="`选择 ${formatDate(item.createdAt)} 的记录`" :aria-pressed="selectedIds.has(item._id)" @click="toggleSelection(item._id)">
                  <div class="custom-checkbox" :class="{ checked: selectedIds.has(item._id) }">
                    <svg v-if="selectedIds.has(item._id)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </button>
                <div class="history-content">
                  <div class="history-row-top">
                    <span class="history-date">{{ formatDate(item.createdAt) }}</span>
                    <div class="item-actions">
                      <button class="mini-btn" @click.stop="openHistoryForm(item)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                      </button>
                      <button class="mini-btn delete" @click.stop="deleteHistory(item._id)">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                      </button>
                    </div>
                  </div>
                  <div class="history-row-btm">
                    <span class="history-time">{{ formatDuration(item.data.duration) }}</span>
                    <div class="history-stats">
                      <span class="history-count">Count: {{ item.data.count }}</span>
                      <span class="history-avg" v-if="item.data.count > 0">
                        {{ (item.data.duration / item.data.count).toFixed(2) }} m/ea
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                v-if="historyPagination.hasMore"
                class="history-load-more"
                :disabled="isHistoryLoading"
                @click="fetchHistory(false)"
              >
                {{ isHistoryLoading ? 'Loading...' : `Load more (${history.length}/${historyPagination.total})` }}
              </button>
            </div>

            <Transition name="slide-up">
              <div v-if="selectedIds.size > 0" class="selection-stats">
                <div class="stat-col"><span class="stat-label">Total Time</span><span class="stat-val">{{ formatDuration(selectedStats.totalDuration) }}</span></div>
                <div class="stat-col"><span class="stat-label">Total Count</span><span class="stat-val">{{ selectedStats.totalCount }}</span></div>
                <div class="stat-col highlight"><span class="stat-label">Avg Time</span><span class="stat-val">{{ selectedStats.avgEfficiency }} m/ea</span></div>
              </div>
            </Transition>

            <Transition name="slide-up">
              <div 
                v-if="showUndoToast" 
                class="undo-toast"
                :class="{ 'has-selection': selectedIds.size > 0 }"
                @mouseenter="pauseUndoTimer" 
                @mouseleave="resumeUndoTimer"
              >
                <span class="undo-text">Record deleted</span>
                <button class="undo-btn" @click="handleUndo">UNDO</button>
              </div>
            </Transition>
            
          </div>

          <div v-else class="history-form">
            <h3 class="history-title">{{ formMode === 'add' ? 'Add Record' : 'Edit Record' }}</h3>
            
            <div class="form-group">
              <label>Date</label>
              <input type="datetime-local" v-model="formData.date" class="dark-input" />
            </div>
            
            <div class="form-group">
              <label>Count</label>
              <input type="number" v-model.number="formData.count" class="dark-input" min="0"/>
            </div>
            
            <div class="form-group">
              <label>Duration</label>
              <div class="time-input-row compact">
                <div class="time-group">
                  <input type="number" v-model.number="formData.hr" class="reset-time-input small" placeholder="0" min="0"/>
                  <span class="time-unit-label">HR</span>
                </div>
                <span class="time-separator">:</span>
                <div class="time-group">
                  <input type="number" v-model.number="formData.min" class="reset-time-input small" placeholder="0" min="0"/>
                  <span class="time-unit-label">MIN</span>
                </div>
                <span class="time-separator">:</span>
                <div class="time-group">
                  <input type="number" v-model.number="formData.sec" class="reset-time-input small" placeholder="0" min="0"/>
                  <span class="time-unit-label">SEC</span>
                </div>
              </div>
            </div>

            <div class="form-actions">
              <button class="reset-option-btn" @click="saveHistoryForm">Save</button>
              <button class="reset-option-btn cancel-btn" @click="isHistoryEditing = false">Cancel</button>
            </div>
          </div>

        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="feedback.visible" class="counter-feedback" :class="feedback.type" role="status" aria-live="polite">
        {{ feedback.message }}
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="confirmDialog.visible" class="modal-overlay confirm-overlay" role="dialog" aria-modal="true" aria-labelledby="counter-confirm-title">
        <div class="confirm-card" :class="{ 'light-theme-modal': isLightMode }" :style="{ backgroundColor: settings.bgColor }">
          <h3 id="counter-confirm-title">请确认</h3>
          <p>{{ confirmDialog.message }}</p>
          <div class="confirm-actions">
            <button class="reset-option-btn" @click="resolveConfirmation(false)">取消</button>
            <button class="reset-option-btn danger-action" @click="resolveConfirmation(true)">确认</button>
          </div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch, onBeforeUnmount } from 'vue';
import axios from 'axios';
import { updateTheme } from '../store'; 
import { getApiErrorMessage } from '@/api/errors';
import { authUser } from '@/auth';
import { readJsonStorage, writeJsonStorage } from '@/utils/storage';

const showModal = ref(false);
const showResetModal = ref(false);
const showHistory = ref(false);

const resetInputs = reactive({ hr: '', min: '', sec: '' });

const isHistoryEditing = ref(false);
const formMode = ref('add'); 
const editingId = ref(null); 
const formData = reactive({ date: '', count: 0, hr: '', min: '', sec: '' });
const selectedIds = ref(new Set()); 
const feedback = reactive({ visible: false, message: '', type: 'info' });
const confirmDialog = reactive({ visible: false, message: '' });
let feedbackTimer = null;
let confirmResolver = null;

const showUndoToast = ref(false);
const undoItem = ref(null); 
let undoTimer = null; 
let pendingDeleteId = null; 

const defaultSettings = {
  count: 0,
  bgColor: '#ffffff',
  limitsEnabled: false,
  maxValue: 10
};

const settings = reactive({ ...defaultSettings });
const history = ref([]);
const historyError = ref('');
const isHistoryLoading = ref(false);
const historyPagination = reactive({ page: 0, limit: 50, total: 0, hasMore: false });
const historyStats = reactive({ totalDuration: 0, totalCount: 0, avgEfficiency: 0 });
const currentUser = authUser;

const notify = (message, type = 'error') => {
  clearTimeout(feedbackTimer);
  Object.assign(feedback, { visible: true, message, type });
  feedbackTimer = setTimeout(() => { feedback.visible = false; }, 3500);
};

const askForConfirmation = (message) => new Promise(resolve => {
  confirmResolver?.(false);
  confirmResolver = resolve;
  Object.assign(confirmDialog, { visible: true, message });
});

const resolveConfirmation = (accepted) => {
  confirmDialog.visible = false;
  confirmResolver?.(accepted);
  confirmResolver = null;
};

// 保留常用的预设颜色（去除了几个相近的颜色，腾出一个格子给取色器）
const colorPalette = [
  '#000000', '#ffffff', '#f5f5f5', '#e91e63', 
  '#9c27b0', '#673ab7', '#00bcd4', '#009688',
  '#4caf50', '#ff9800', '#2196f3'
];

// 【新增】计算属性：判断当前颜色是否属于“自定义颜色”（即不在预设数组中）
const isCustomColor = computed(() => {
  return !colorPalette.includes(settings.bgColor.toLowerCase());
});

const isLightMode = computed(() => {
  let color = settings.bgColor;
  if (!color) return true;

  color = color.toLowerCase().trim();
  
  if (color === 'white' || color === '#fff' || color === '#ffffff') return true;
  if (color === 'black' || color === '#000' || color === '#000000') return false;

  if (color.startsWith('rgb')) {
    const rgbValues = color.match(/\d+/g);
    if (rgbValues && rgbValues.length >= 3) {
      const r = parseInt(rgbValues[0], 10);
      const g = parseInt(rgbValues[1], 10);
      const b = parseInt(rgbValues[2], 10);
      return ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128;
    }
  }

  let hex = color.startsWith('#') ? color.substring(1) : color;
  if (hex.length === 3) {
    hex = hex.split('').map(x => x + x).join('');
  }

  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    return true; 
  }

  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return yiq >= 128;
});

const availableCount = computed(() => settings.maxValue - settings.count);

const last30DaysStats = computed(() => ({
  totalDuration: historyStats.totalDuration,
  totalCount: historyStats.totalCount,
  avgEfficiency: Number(historyStats.avgEfficiency || 0).toFixed(2)
}));

const selectedStats = computed(() => {
  let totalDuration = 0, totalCount = 0;
  history.value.forEach(item => {
    if (selectedIds.value.has(item._id)) {
      totalDuration += (item.data.duration || 0);
      totalCount += (item.data.count || 0);
    }
  });
  const avgEfficiency = totalCount > 0 ? (totalDuration / totalCount).toFixed(2) : '0.00';
  return { totalDuration, totalCount, avgEfficiency };
});

const increment = () => { 
  if (settings.limitsEnabled && settings.count >= settings.maxValue) return;
  settings.count++; 
};

const decrement = () => { 
  if (settings.count > 0) settings.count--; 
};

const triggerReset = () => { 
  resetInputs.hr = ''; resetInputs.min = ''; resetInputs.sec = '';
  showResetModal.value = true; 
};

const fetchHistory = async (reset = true) => {
  if (!currentUser.value) return;
  historyError.value = '';
  isHistoryLoading.value = true;
  try {
    const page = reset ? 1 : historyPagination.page + 1;
    const res = await axios.get('/api/history', { params: { page, limit: historyPagination.limit } });
    const mapped = res.data.items.map(item => ({
      _id: item._id,
      createdAt: item.date, 
      data: {
        count: item.count,
        duration: item.duration
      }
    }));
    if (reset) {
      history.value = mapped;
    } else {
      const merged = new Map(history.value.map(item => [item._id, item]));
      mapped.forEach(item => merged.set(item._id, item));
      history.value = Array.from(merged.values());
    }
    Object.assign(historyPagination, res.data.pagination);
  } catch (err) {
    console.error("Failed to fetch history:", err);
    historyError.value = getApiErrorMessage(err, 'Failed to load history');
  } finally {
    isHistoryLoading.value = false;
  }
};

const fetchHistoryStats = async () => {
  if (!currentUser.value) return;
  try {
    const res = await axios.get('/api/history/stats', { params: { days: 30 } });
    Object.assign(historyStats, res.data);
  } catch (err) {
    console.error('Failed to fetch history stats:', err);
  }
};

const confirmSaveAndReset = async () => {
  const h = Math.max(0, Number(resetInputs.hr) || 0);
  const m = Math.max(0, Number(resetInputs.min) || 0);
  const s = Math.max(0, Number(resetInputs.sec) || 0);

  if (settings.count === 0 && h === 0 && m === 0 && s === 0) {
    showResetModal.value = false;
    return;
  }

  const totalMinutes = h * 60 + m + (s / 60);

  if (!currentUser.value) {
    notify('请先登录后再保存历史记录');
    return; 
  }

  try {
    const res = await axios.post('/api/history', {
      count: settings.count,
      duration: totalMinutes,
      date: new Date().toISOString()
    });
    
    const newRecord = {
      _id: res.data._id,
      createdAt: res.data.date,
      data: {
        count: res.data.count,
        duration: res.data.duration
      }
    };
    history.value.unshift(newRecord);
    historyPagination.total += 1;
    fetchHistoryStats();

    settings.count = 0;
    resetInputs.hr = ''; resetInputs.min = ''; resetInputs.sec = '';
    showResetModal.value = false;
  } catch (err) {
    console.error("Save failed:", err);
    notify(getApiErrorMessage(err, '保存失败，请稍后重试'));
  }
};

const justReset = async () => {
  if (await askForConfirmation('确定放弃当前计数并重置吗？')) {
    settings.count = 0;
    showResetModal.value = false;
  }
};

const openHistory = () => {
  showHistory.value = true;
  isHistoryEditing.value = false;
  selectedIds.value.clear(); 
  showUndoToast.value = false; 
  undoItem.value = null;
  fetchHistory(true);
};

const closeHistory = () => {
  if (pendingDeleteId) {
    executeRealDelete(pendingDeleteId);
  }
  showHistory.value = false;
};

const handleClear = async () => {
  if (pendingDeleteId) {
    executeRealDelete(pendingDeleteId);
    pendingDeleteId = null;
    showUndoToast.value = false;
    pauseUndoTimer();
  }

  let idsToDelete = [];
  let deleteAll = false;
  if (selectedIds.value.size > 0) {
    if (await askForConfirmation(`确定删除选中的 ${selectedIds.value.size} 条记录吗？`)) {
      idsToDelete = Array.from(selectedIds.value);
    }
  } else {
    if (history.value.length === 0) return;
    if (await askForConfirmation('确定删除全部历史记录吗？此操作无法撤销。')) {
      deleteAll = true;
    }
  }

  if (!deleteAll && idsToDelete.length === 0) return;

  try {
    await axios.post('/api/history/batch-delete', deleteAll ? { all: true } : { ids: idsToDelete });
    if (deleteAll) {
      history.value = [];
      Object.assign(historyPagination, { page: 0, total: 0, hasMore: false });
      fetchHistoryStats();
      return;
    }
    const idsSet = new Set(idsToDelete);
    history.value = history.value.filter(item => !idsSet.has(item._id));
    historyPagination.total = Math.max(0, historyPagination.total - idsToDelete.length);
    selectedIds.value.clear();
    fetchHistoryStats();
  } catch (e) {
    console.error("Batch delete failed:", e);
    notify(getApiErrorMessage(e, '删除失败，请稍后重试'));
  }
};

const saveHistoryForm = async () => {
  if (!formData.date) {
    notify('请选择有效日期');
    return;
  }
  
  const dateObj = new Date(formData.date);
  if (isNaN(dateObj.getTime())) {
    notify('日期格式无效');
    return;
  }
  
  const isoDate = dateObj.toISOString();

  const h = Math.max(0, Number(formData.hr) || 0);
  const m = Math.max(0, Number(formData.min) || 0);
  const s = Math.max(0, Number(formData.sec) || 0);
  const totalMinutes = (h * 60) + m + (s / 60);

  if (!currentUser.value) return;

  try {
    if (formMode.value === 'add') {
      const res = await axios.post('/api/history', {
        count: Math.max(0, formData.count),
        duration: totalMinutes,
        date: isoDate
      });
      const newRecord = {
        _id: res.data._id,
        createdAt: res.data.date,
        data: { count: res.data.count, duration: res.data.duration }
      };
      history.value.unshift(newRecord);
      historyPagination.total += 1;
      history.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else {
      const res = await axios.put(`/api/history/${editingId.value}`, {
        count: Math.max(0, formData.count),
        duration: totalMinutes,
        date: isoDate
      });
      const index = history.value.findIndex(item => item._id === editingId.value);
      if (index !== -1) {
        history.value[index].createdAt = res.data.date;
        history.value[index].data.count = res.data.count;
        history.value[index].data.duration = res.data.duration;
        history.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      }
    }
    isHistoryEditing.value = false;
    fetchHistoryStats();
  } catch (err) {
    console.error("Save failed:", err);
    notify(getApiErrorMessage(err, '操作失败，请稍后重试'));
  }
};

const executeRealDelete = async (id) => {
  try {
    await axios.delete(`/api/history/${id}`);
    fetchHistoryStats();
  } catch (err) {
    console.error("Delayed delete failed on backend", err);
    notify(getApiErrorMessage(err, '删除记录失败'));
  }
};

const pauseUndoTimer = () => {
  if (undoTimer) clearTimeout(undoTimer);
};

const resumeUndoTimer = () => {
  if (undoTimer) clearTimeout(undoTimer);
  undoTimer = setTimeout(() => {
    if (pendingDeleteId) {
      executeRealDelete(pendingDeleteId);
    }
    showUndoToast.value = false;
    undoItem.value = null; 
    pendingDeleteId = null;
  }, 3500);
};

const deleteHistory = (id) => {
  if (pendingDeleteId && pendingDeleteId !== id) {
    executeRealDelete(pendingDeleteId);
  }

  const index = history.value.findIndex(item => item._id === id);
  if (index === -1) return;

  const itemToDelete = history.value[index];
  const wasSelected = selectedIds.value.has(id);
  
  undoItem.value = { ...itemToDelete, _wasSelected: wasSelected };
  pendingDeleteId = id;
  
  if (wasSelected) {
    selectedIds.value.delete(id);
  }
  history.value.splice(index, 1);
  historyPagination.total = Math.max(0, historyPagination.total - 1);
  showUndoToast.value = true;
  
  resumeUndoTimer();
};

const handleUndo = () => {
  if (!undoItem.value) return;

  history.value.unshift(undoItem.value);
  historyPagination.total += 1;
  history.value.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (undoItem.value._wasSelected) {
    selectedIds.value.add(undoItem.value._id);
  }

  showUndoToast.value = false;
  pauseUndoTimer();
  undoItem.value = null;
  pendingDeleteId = null;
};

const toggleSelection = (id) => {
  if (selectedIds.value.has(id)) {
    selectedIds.value.delete(id);
  } else {
    selectedIds.value.add(id);
  }
};

const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatDuration = (totalMinutes) => {
  if (!totalMinutes) return '0s';
  const totalSeconds = Math.round(totalMinutes * 60);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  let parts = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (s > 0) parts.push(`${s}s`);
  return parts.length > 0 ? parts.join(' ') : '0s';
};

const openHistoryForm = (item = null) => {
  isHistoryEditing.value = true;
  if (item) {
    formMode.value = 'edit';
    editingId.value = item._id;
    const d = new Date(item.createdAt);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    formData.date = d.toISOString().slice(0, 16);
    formData.count = item.data.count;
    const totalSec = Math.round(item.data.duration * 60);
    formData.hr = Math.floor(totalSec / 3600);
    formData.min = Math.floor((totalSec % 3600) / 60);
    formData.sec = totalSec % 60;
  } else {
    formMode.value = 'add';
    editingId.value = null;
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    formData.date = now.toISOString().slice(0, 16);
    formData.count = 0;
    formData.hr = ''; formData.min = ''; formData.sec = '';
  }
};

const handleScreenClick = (e) => {
  if (e.target.closest('button') || e.target.closest('.modal-container') || e.target.closest('.reset-content') || e.target.closest('.history-form')) return;
};

onBeforeUnmount(() => {
  clearTimeout(feedbackTimer);
  resolveConfirmation(false);
  if (pendingDeleteId) {
    executeRealDelete(pendingDeleteId);
    clearTimeout(undoTimer);
  }
});

onMounted(() => {
  if (currentUser.value) {
    const userKey = `nook-settings-${currentUser.value.id}`;
    const savedSettings = readJsonStorage(
      localStorage,
      userKey,
      defaultSettings,
      value => value !== null && typeof value === 'object' && !Array.isArray(value)
    );
    Object.assign(settings, defaultSettings, savedSettings);
  }

  updateTheme(settings.bgColor);
  fetchHistory(true);
  fetchHistoryStats();
});

// v-model 会实时更新 settings.bgColor，watch 监听到后全局同步
watch(settings, (val) => {
  if (currentUser.value) {
    const userKey = `nook-settings-${currentUser.value.id}`;
    writeJsonStorage(localStorage, userKey, val);
  }
  updateTheme(val.bgColor);
}, { deep: true });

watch(showHistory, (newVal) => {
  if (!newVal && pendingDeleteId) {
    executeRealDelete(pendingDeleteId);
    pendingDeleteId = null;
    undoItem.value = null;
    showUndoToast.value = false;
    pauseUndoTimer();
  }
});
</script>

<style scoped>
/* ================= 基础样式 ================= */
.fullscreen-counter {
  position: relative; 
  height: 100%; width: 100%; display: flex; justify-content: center; align-items: center;
  color: white; transition: background-color 0.1s ease; overflow: hidden; cursor: pointer;
}
.fullscreen-counter.light-theme { color: black !important; }
.fullscreen-counter.light-theme .side-btn { border-color: rgba(0, 0, 0, 0.2); color: black; }
.fullscreen-counter.light-theme .icon-btn { color: rgba(0, 0, 0, 0.8); }

/* --- 弹窗定位 --- */
.modal-overlay {
  position: absolute; inset: 0; 
  background: rgba(0,0,0,0.5); 
  display: flex; justify-content: center; align-items: center; z-index: 100;
}
.reset-overlay {
  position: absolute; inset: 0; z-index: 200;
  display: flex; justify-content: center; align-items: center;
  color: white; transition: background-color 0.3s ease;
}

/* --- 其他样式 --- */
.top-bar { position: absolute; top: 25px; display: flex; gap: 25px; z-index: 10; }
.icon-btn { background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; padding: 5px; }
.icon-btn:hover { opacity: 0.7; }
.side-btn {
  position: absolute; top: 50%; transform: translateY(-50%); width: 60px; height: 60px;
  border-radius: 50%; border: 1px solid rgba(255,255,255,0.4); background: transparent;
  color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;
  transition: all 0.2s; z-index: 5;
}
.side-btn:active { transform: translateY(-50%) scale(0.95); }
.left-btn { left: 40px; }
.right-btn { right: 40px; }
.center-display { text-align: center; }
.counter-num { font-size: 30vw; line-height: 1; font-weight: 300; }
@media (min-width: 1000px) { .counter-num { font-size: 350px; } }
.bottom-info {
  position: absolute; bottom: 50px; left: 0; width: 100%;
  text-align: center; display: flex; flex-direction: column; align-items: center; z-index: 5; pointer-events: none;
}
.limit-val { font-size: 4rem; font-weight: 600; line-height: 1; }
.limit-label { font-size: 1rem; letter-spacing: 2px; opacity: 0.7; margin-top: 5px; font-weight: 500; }

.modal-container {
  display: flex; flex-direction: column; gap: 15px; width: 280px; padding: 25px; border-radius: 24px;
  color: white; box-shadow: 0 20px 60px rgba(0,0,0,0.5); border: 1px solid rgba(255,255,255,0.15);
  opacity: 0.95; backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); transition: all 0.3s ease;
  position: relative; 
}
.setting-card {
  background: transparent; border: 1px solid rgba(255,255,255,0.3); 
  border-radius: 14px; padding: 18px; display: flex; align-items: center; justify-content: space-between;
  font-size: 1.2rem; font-weight: 500;
}
.num-input, .dark-input {
  background: white; color: black; border: none; border-radius: 8px; padding: 8px 12px; width: 80px; 
  font-size: 1.1rem; font-weight: bold; text-align: left; outline: none;
}
.dark-input { width: 100%; box-sizing: border-box; }
.text-underline { text-decoration: underline; text-underline-offset: 4px; }

/* --- 浅色模式弹窗适配 --- */
.modal-container.light-theme-modal {
  color: black !important; border-color: rgba(0,0,0,0.1); box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.modal-container.light-theme-modal .setting-card, .modal-container.light-theme-modal .history-item { border-color: rgba(0,0,0,0.2); }
.modal-container.light-theme-modal .color-item { border-color: rgba(0,0,0,0.1); }
.modal-container.light-theme-modal .color-item.active { border-color: black !important; }
.modal-container.light-theme-modal .slider { background-color: #e0e0e0; border-color: #ccc; }
.modal-container.light-theme-modal .selection-stats, .modal-container.light-theme-modal .stats-overview { background: rgba(0,0,0,0.05); border-top-color: rgba(0,0,0,0.1); }
.modal-container.light-theme-modal .custom-checkbox { border-color: rgba(0,0,0,0.3); }

/* === Selection Stats & Undo Toast === */
.selection-stats {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: rgba(255,255,255,0.1); border-top: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  padding: 15px 25px; box-sizing: border-box;
  display: flex; justify-content: space-between; align-items: center;
  border-radius: 0 0 24px 24px; 
  z-index: 20; 
}
.stat-col { display: flex; flex-direction: column; align-items: center; font-size: 0.8rem; }
.stat-label { opacity: 0.6; font-size: 0.7rem; text-transform: uppercase; margin-bottom: 2px; }
.stat-val { font-weight: bold; }
.highlight .stat-val { color: #69f0ae; }

.undo-toast {
  position: absolute; bottom: 0; left: 0; width: 100%;
  background: rgba(255,255,255,0.1); border-top: 1px solid rgba(255,255,255,0.2);
  backdrop-filter: blur(10px);
  padding: 15px 25px; box-sizing: border-box;
  display: flex; justify-content: space-between; align-items: center;
  border-radius: 0 0 24px 24px; 
  z-index: 21; 
  font-size: 1rem; font-weight: 500; color: inherit;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.undo-toast.has-selection {
  bottom: 65px; 
  width: calc(100% - 30px);
  left: 15px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.85);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  border-top: none;
}

.undo-text { opacity: 0.9; display: flex; align-items: center; gap: 8px; }
.undo-text::before { content: "🗑"; font-size: 1.1rem; }
.undo-btn { 
  background: transparent; color: inherit; 
  border: 1px solid rgba(255,255,255,0.3); padding: 6px 16px; 
  border-radius: 20px; font-weight: 600; font-size: 0.85rem; cursor: pointer; transition: all 0.2s;
}
.undo-btn:hover { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.8); }

.modal-container.light-theme-modal .selection-stats,
.modal-container.light-theme-modal .undo-toast { 
  background: rgba(0,0,0,0.05); border-top-color: rgba(0,0,0,0.1); 
}
.modal-container.light-theme-modal .undo-toast.has-selection {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border: 1px solid rgba(0,0,0,0.1);
}
.modal-container.light-theme-modal .undo-btn { border-color: rgba(0,0,0,0.2); }
.modal-container.light-theme-modal .undo-btn:hover { background: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.6); }

/* === 表单与网格样式 === */
.column-layout { flex-direction: column; align-items: stretch; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.mt-3 { margin-top: 15px; }
.toggle-switch { position: relative; width: 54px; height: 30px; }
.toggle-switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; inset: 0; background-color: #333; border-radius: 34px; transition: .3s; border: 1px solid #555; }
.slider:before { position: absolute; content: ""; height: 24px; width: 24px; left: 2px; bottom: 2px; background-color: white; border-radius: 50%; transition: .3s; box-shadow: 0 2px 5px rgba(0,0,0,0.3); }
input:checked + .slider { background-color: #2196f3; border-color: #2196f3; }
input:checked + .slider:before { transform: translateX(24px); }

/* == 调色板网格及新增取色器样式 == */
.color-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; width: 100%; }
.color-item { aspect-ratio: 1; border-radius: 8px; cursor: pointer; border: 2px solid rgba(255,255,255,0.1); }
.color-item.active { border-color: white !important; box-shadow: 0 0 10px rgba(255,255,255,0.5); }

/* 【新增】自定义颜色选取器圆圈样式：彩虹背景 */
.custom-color-picker {
  position: relative;
  overflow: hidden;
  /* 用锥形渐变画一个彩虹色轮，让用户一眼看出这是调色盘 */
  background: conic-gradient(from 90deg, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000);
}
/* 隐藏原生 input 默认的外观，但保持它占满整个圆圈以接受点击 */
.hidden-color-input {
  position: absolute;
  top: -10px; left: -10px; width: 150%; height: 150%;
  opacity: 0;
  cursor: pointer;
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.reset-overlay.light-theme-text { color: black !important; }
.reset-overlay.light-theme-text .close-icon-btn { color: black; }
.reset-overlay.light-theme-text .reset-time-input { color: black; border-bottom-color: black; }
.reset-overlay.light-theme-text .reset-time-input::placeholder { color: rgba(0,0,0,0.3); }
.reset-overlay.light-theme-text .reset-option-btn:hover { border-color: black; background-color: rgba(0,0,0,0.05); }

.close-icon-btn { position: absolute; top: 25px; right: 25px; background: none; border: none; color: white; cursor: pointer; opacity: 0.8; }
.close-icon-btn:hover { opacity: 1; transform: scale(1.1); transition: transform 0.2s; }
.reset-content { display: flex; flex-direction: column; align-items: center; gap: 30px; width: 100%; max-width: 320px; }
.reset-title { font-size: 2.2rem; font-weight: 400; margin: 0; }

.time-input-row { display: flex; align-items: flex-end; justify-content: center; gap: 10px; width: 100%; }
.time-input-row.compact { gap: 5px; } 
.time-group { display: flex; flex-direction: column; align-items: center; width: 60px; }
.time-separator { font-size: 2rem; padding-bottom: 25px; opacity: 0.5; }
.reset-time-input {
  background: transparent; border: none; border-bottom: 2px solid rgba(255,255,255,0.5);
  color: white; font-size: 2rem; text-align: center; width: 100%; outline: none; padding-bottom: 5px; font-weight: 300;
}
.reset-time-input.small { font-size: 1.5rem; border-bottom-width: 1px; } 
.reset-time-input:focus { border-bottom-color: white; }
.reset-time-input::placeholder { color: rgba(255,255,255,0.2); }
.time-unit-label { font-size: 0.7rem; letter-spacing: 1px; margin-top: 5px; opacity: 0.6; }

.reset-actions, .form-actions { display: flex; flex-direction: column; gap: 15px; width: 100%; align-items: center; margin-top: 10px; }
.reset-option-btn {
  background: transparent; border: 1px solid transparent; 
  color: inherit; padding: 12px 0; font-size: 1.3rem; border-radius: 12px;
  cursor: pointer; transition: all 0.2s; width: 100%;
}
.reset-option-btn:hover, .reset-option-btn:active { border-color: currentColor; background-color: rgba(255,255,255,0.1); }
.cancel-btn { opacity: 0.7; font-size: 1rem; padding: 8px 0; }

/* ================= 历史记录列表 ================= */
.history-modal { max-height: 70vh; width: 340px; display: flex; flex-direction: column; overflow: hidden; }
.history-header { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin-bottom: 10px; }
.history-title { margin: 0; font-size: 1.5rem; font-weight: 500; text-align: center; }
.header-text-btn { background: none; border: none; color: inherit; cursor: pointer; font-size: 0.9rem; opacity: 0.6; padding: 5px 0; text-align: left; }
.header-text-btn:hover { opacity: 1; text-decoration: underline; }
.header-text-btn.active { color: #ff5252; opacity: 1; font-weight: bold; } 
.add-history-btn { background: none; border: 1px solid rgba(255,255,255,0.5); border-radius: 50%; width: 30px; height: 30px; color: inherit; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; justify-content: center; justify-self: end; }
.add-history-btn:hover { background: rgba(255,255,255,0.1); }

.stats-overview {
  background: rgba(255,255,255,0.1); border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: center; border: 1px solid rgba(255,255,255,0.1);
}
.stats-title { font-size: 0.7rem; opacity: 0.7; letter-spacing: 1px; display: block; margin-bottom: 5px; }
.stats-main-val { display: flex; justify-content: center; align-items: baseline; gap: 5px; margin-bottom: 8px; }
.stats-num { font-size: 2rem; font-weight: 600; line-height: 1; }
.stats-unit { font-size: 0.9rem; opacity: 0.8; color: #69f0ae; }
.stats-sub-vals { font-size: 0.8rem; opacity: 0.7; display: flex; justify-content: center; gap: 10px; }
.separator { opacity: 0.3; }

.history-list { overflow-y: auto; flex: 1; padding-right: 2px; max-height: 400px; padding-bottom: 80px; min-height: 0; }
.empty-history { text-align: center; opacity: 0.5; padding: 20px; }
.history-error { display: flex; flex-direction: column; align-items: center; gap: 10px; }
.history-retry-btn, .history-load-more { border: 1px solid currentColor; border-radius: 8px; padding: 7px 14px; background: transparent; color: inherit; cursor: pointer; }
.history-load-more { display: block; margin: 16px auto 0; }
.history-load-more:disabled { opacity: 0.5; cursor: wait; }
.history-item { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1); }
.checkbox-wrapper { cursor: pointer; padding: 5px; border: 0; background: transparent; }
.custom-checkbox { width: 18px; height: 18px; border: 2px solid rgba(255,255,255,0.5); border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.custom-checkbox.checked { background: #2196f3; border-color: #2196f3; }
.custom-checkbox svg { width: 14px; height: 14px; color: white; }
.history-content { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.history-row-top { display: flex; justify-content: space-between; align-items: center; }
.history-date { font-size: 0.95rem; font-weight: 600; opacity: 0.9; }
.item-actions { display: flex; gap: 10px; opacity: 0.6; }
.mini-btn { background: none; border: none; color: inherit; cursor: pointer; padding: 0; }
.mini-btn:hover { color: white; opacity: 1; }
.mini-btn.delete:hover { color: #ff5252; }
.history-row-btm { display: flex; justify-content: space-between; align-items: flex-end; }
.history-time { font-size: 0.85rem; opacity: 0.7; font-family: monospace; }
.history-stats { text-align: right; font-size: 0.8rem; }
.history-count { display: block; font-weight: bold; }
.history-avg { color: #69f0ae; opacity: 0.8; }

.history-form { display: flex; flex-direction: column; gap: 15px; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 0.8rem; opacity: 0.7; text-transform: uppercase; }

.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); opacity: 0; }

.counter-feedback { position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%); z-index: 2200; max-width: min(420px, 90vw); padding: 12px 18px; border-radius: 12px; color: #fff; background: rgba(15, 23, 42, 0.92); box-shadow: 0 10px 30px rgba(0,0,0,0.2); text-align: center; }
.counter-feedback.success { background: rgba(5, 150, 105, 0.94); }
.confirm-overlay { z-index: 2100; }
.confirm-card { width: min(360px, 86vw); padding: 28px; border-radius: 18px; color: inherit; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.3); }
.confirm-card h3 { margin: 0 0 12px; }
.confirm-card p { margin: 0 0 24px; line-height: 1.6; }
.confirm-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.danger-action { color: #ff5252; border-color: rgba(255,82,82,0.5); }
</style>
