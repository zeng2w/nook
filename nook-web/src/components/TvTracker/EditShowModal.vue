<template>
  <Transition name="fade">
    <div v-if="visible" class="modal-overlay" @click.self="close">
      <div class="modal-container modern-modal" role="dialog" aria-modal="true" aria-labelledby="show-modal-title">
        
        <div class="modal-header"><h3 id="show-modal-title">{{ isEditing ? '编辑剧集' : '添加新剧集' }}</h3></div>
        
        <div v-if="!isEditing" class="search-fixed-area">
          <div class="tmdb-search-section">
            <div class="search-box-modern compact">
              <span class="search-icon">🔍</span>
              <input id="tmdb-query" v-model="tmdbQuery" aria-label="搜索 TMDB 剧名" @keyup.enter="searchTMDB" placeholder="搜索剧名 (例如: 仙逆)" class="modern-input search-input" />
              <button type="button" class="btn-icon" aria-label="搜索 TMDB" @click="searchTMDB" :disabled="isSearching">{{ isSearching ? '...' : '→' }}</button>
            </div>
            <p v-if="searchError" class="search-error">{{ searchError }}</p>
            
            <transition name="fade">
              <div v-if="tmdbResults.length > 0" class="tmdb-results-floating">
                <button v-for="res in tmdbResults" :key="res.tmdbId" type="button" class="tmdb-item" @click="selectTMDBResult(res)">
                  <div class="tmdb-thumb-wrapper">
                    <img v-if="res.posterUrl" :src="res.posterUrl" :alt="res.title" class="tmdb-thumb" loading="lazy" decoding="async" />
                    <div v-else class="tmdb-thumb-placeholder">{{ res.title.charAt(0) }}</div>
                  </div>
                  <div class="tmdb-info">
                    <div class="tmdb-title">{{ res.title }}</div>
                    <div class="tmdb-meta">
                      <span class="meta-badge">{{ res.releaseDate ? res.releaseDate.substring(0,4) : 'N/A' }}</span>
                      <span class="meta-dot">•</span>
                      <span>{{ getCategoryLabel(res.category) }}</span>
                    </div>
                  </div>
                </button>
              </div>
            </transition>
          </div>
        </div>

        <div class="modal-body-scroll compact-mode">
          
          <div class="form-grid-row main-info">
            <div class="form-group title-group">
              <label for="show-title">作品名称</label>
              <input id="show-title" v-model="form.title" type="text" class="modern-input" placeholder="输入名称" />
            </div>
            <div class="form-group category-group">
              <label for="show-category">分类</label>
              <select id="show-category" v-model="form.category" class="modern-input">
                <option value="tv">📺 电视剧</option>
                <option value="anime">🎎 动漫</option>
                <option value="movie">🎬 电影</option>
                <option value="variety">🎤 综艺</option>
              </select>
            </div>
          </div>

          <div class="form-grid-row" :class="{ 'single-col': !isEditing }">
            <div class="form-group">
              <label for="show-network">播放平台</label>
              <div class="network-input-compact">
                <input id="show-network" v-model="form.network" type="text" class="modern-input" placeholder="如: Netflix" />
                <div v-if="form.networkLogo" class="network-logo-mini">
                  <img :src="form.networkLogo" alt="Logo" loading="lazy" decoding="async" />
                </div>
              </div>
            </div>
            <div class="form-group" v-if="isEditing">
              <label for="show-status">状态</label>
              <select id="show-status" v-model="form.status" class="modern-input">
                <option value="wish">想看</option>
                <option value="watching">在追</option>
                <option value="watched">已看</option>
                <option value="dropped">弃剧</option>
              </select>
            </div>
          </div>

          <div v-if="!isEditing && availableSeasons.length > 0" class="form-group compact-group">
            <select @change="onSeasonSelect" class="modern-input">
              <option value="">-- 添加整部剧 (默认) --</option>
              <option v-for="s in availableSeasons" :key="s.seasonNumber" :value="s.seasonNumber">第 {{ s.seasonNumber }} 季 ({{ s.episodeCount }} 集)</option>
            </select>
          </div>

          <div class="form-section-compact">
            <div class="compact-header">
              <label>更新频率</label>
              <div class="segmented-control mini">
                <button v-for="opt in freqOptions" :key="opt.val" type="button" class="segment-option" :class="{ active: form.updateFrequency === opt.val }" :aria-pressed="form.updateFrequency === opt.val" @click="form.updateFrequency = opt.val">{{ opt.label }}</button>
              </div>
            </div>
            
            <div v-if="form.updateFrequency === 'weekly'" class="week-selector-mini">
              <button v-for="(day, idx) in weekDays" :key="idx" type="button" class="day-chip mini" :class="{ active: form.updateDays.includes(idx) }" :aria-pressed="form.updateDays.includes(idx)" @click="toggleDay(idx)">{{ day }}</button>
            </div>
            
            <div v-if="form.updateFrequency !== 'ended' && form.updateFrequency !== 'unknown'" class="inline-row">
              <span class="sub-label">每次更新:</span>
              <input v-model.number="form.updateCount" type="number" min="1" class="modern-input inline-input" />
              <span class="unit">集</span>
              <span class="spacer">|</span>
              <span class="sub-label">最近:</span>
              <input v-model="form.lastAirDate" type="date" class="modern-input inline-date" />
            </div>
          </div>

          <div class="form-section-compact">
            <label>当前进度</label>
            <div class="stats-row-compact">
              <div class="stat-input-wrap"><span>已看</span><input v-model.number="form.watchedEpisodes" type="number" min="0" :max="form.totalEpisodes || undefined" class="modern-input" /></div>
              <div class="stat-input-wrap"><span>已更</span><input v-model.number="form.airedEpisodes" type="number" min="0" :max="form.totalEpisodes || undefined" class="modern-input" /></div>
              <div class="stat-input-wrap"><span>总集</span><input v-model.number="form.totalEpisodes" type="number" min="0" class="modern-input" /></div>
            </div>
          </div>

        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn text-btn" @click="close">取消</button>
          <button type="button" class="btn primary-btn" @click="save">保存</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { ref, reactive, watch, computed } from 'vue';
import axios from 'axios';
import { getApiErrorMessage } from '@/api/errors';
import { toCalendarDateInput } from '@/utils/dateUtils';

const props = defineProps({
  visible: Boolean,
  editData: Object
});

const emit = defineEmits(['update:visible', 'save']);

const isEditing = computed(() => !!props.editData);
const tmdbQuery = ref('');
const tmdbResults = ref([]);
const isSearching = ref(false);
const availableSeasons = ref([]);
const searchError = ref('');

const initialForm = { title: '', category: 'tv', status: 'watching', updateFrequency: 'weekly', updateDays: [], updateCount: 1, watchedEpisodes: 0, airedEpisodes: 0, totalEpisodes: 0, lastAirDate: toCalendarDateInput(new Date()), posterUrl: '', network: '', networkLogo: '', tmdbId: null };
const form = reactive({ ...initialForm });

const freqOptions = [ { label: '周更', val: 'weekly' }, { label: '日更', val: 'daily' }, { label: '月更', val: 'monthly' }, { label: '完结', val: 'ended' } ];
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

watch(
  [() => props.visible, () => props.editData], 
  ([isOpen, newData]) => {
    if (isOpen) {
      if (newData) {
        // --- 编辑模式：填充数据 ---
        Object.assign(form, newData);
        // 特殊处理日期格式
        if (newData.lastAirDate) {
          form.lastAirDate = toCalendarDateInput(newData.lastAirDate);
        }
      } else {
        // --- 添加模式：彻底重置表单 ---
        // 1. 重置基础字段
        Object.assign(form, { ...initialForm, lastAirDate: toCalendarDateInput(new Date()) });
        // 2. 重置引用类型字段 (确保数组清空)
        form.updateDays = [];
        // 3. 重置搜索状态
        tmdbQuery.value = '';
        tmdbResults.value = [];
        availableSeasons.value = [];
        searchError.value = '';
      }
    }
  }
);

const close = () => emit('update:visible', false);
const save = () => emit('save', { ...form });

const toggleDay = (idx) => {
  const i = form.updateDays.indexOf(idx);
  if (i > -1) form.updateDays.splice(i, 1);
  else form.updateDays.push(idx);
  form.updateDays.sort();
};

const getCategoryLabel = (cat) => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[cat] || cat);

// --- 搜索逻辑修复 ---
const searchTMDB = async () => {
  if (!tmdbQuery.value) return;
  
  isSearching.value = true;
  tmdbResults.value = [];
  searchError.value = '';

  try {
    const res = await axios.get('/api/tmdb/search', { params: { query: tmdbQuery.value } });

    // ★ 关键修复：兼容直接返回数组或 { results: [] } 的情况
    if (Array.isArray(res.data)) {
      tmdbResults.value = res.data;
    } else if (res.data && Array.isArray(res.data.results)) {
      tmdbResults.value = res.data.results;
    } else {
      tmdbResults.value = [];
    }
  } catch (err) {
    console.error("❌ 搜索失败:", err);
    searchError.value = getApiErrorMessage(err, 'TMDB 搜索失败');
  } finally {
    isSearching.value = false;
  }
};

const selectTMDBResult = async (item) => {
  searchError.value = '';
  form.tmdbId = item.tmdbId;
  form.title = item.title;
  form.category = item.category;
  form.posterUrl = item.posterUrl;
  availableSeasons.value = [];
  
  try {
    const type = item.category;
    const res = await axios.get(`/api/tmdb/details/${type}/${item.tmdbId}`);
    const details = res.data;
    
    // 填充详情
    form.totalEpisodes = details.totalEpisodes || 0;
    form.airedEpisodes = details.airedEpisodes || 0;
    
    if (details.networks && details.networks.length > 0) {
      const mainNet = details.networks[0];
      form.network = mainNet.name;
      if (mainNet.logo_path) form.networkLogo = `https://image.tmdb.org/t/p/h60${mainNet.logo_path}`;
      else form.networkLogo = '';
    } else {
      form.network = ''; form.networkLogo = '';
    }
    
    if (details.updateFrequency === 'ended') form.updateFrequency = 'ended';
    if (details.lastAirDate) {
      form.lastAirDate = toCalendarDateInput(details.lastAirDate);
      const [y, m, d] = form.lastAirDate.split('-').map(Number);
      form.updateDays = [new Date(y, m - 1, d).getDay()];
    }
    
    if (details.seasons && details.seasons.length > 0) availableSeasons.value = details.seasons;
    
    // 清空搜索状态
    tmdbResults.value = [];
    tmdbQuery.value = '';
    
  } catch (err) {
    console.error("❌ 获取详情失败:", err);
    searchError.value = getApiErrorMessage(err, 'TMDB 详情获取失败，可以手动填写');
  }
};

const onSeasonSelect = (event) => {
  const seasonNum = parseInt(event.target.value);
  if (!seasonNum) return;
  const targetSeason = availableSeasons.value.find(s => s.seasonNumber === seasonNum);
  if (targetSeason) {
    const baseTitle = form.title.replace(/\s\(Season \d+\)$/, '');
    form.title = `${baseTitle} (Season ${targetSeason.seasonNumber})`;
    form.totalEpisodes = targetSeason.episodeCount;
    form.airedEpisodes = targetSeason.episodeCount;
    form.updateFrequency = 'ended';
  }
};
</script>

<style scoped>
/* 遮罩层 */
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(8px); }
.modal-container.modern-modal { background: #fff; width: 460px; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; max-height: 85vh; }

/* 头部与固定搜索区 */
.modal-header { padding: 24px 28px 10px; }
.modal-header h3 { font-size: 1.5rem; font-weight: 800; margin: 0; color: #1d1d1f; }

/* ★ 关键样式：固定搜索区域，确保 z-index 高于内容区 */
.search-fixed-area { padding: 0 24px 10px 24px; background: #fff; position: relative; z-index: 50; }
.search-error { color: #dc2626; font-size: 0.78rem; margin: 6px 2px 0; }

/* 主体滚动区 */
.modal-body-scroll.compact-mode { padding: 5px 24px 15px; gap: 12px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; }

/* 布局：名称+分类 */
.form-grid-row.main-info { display: grid; grid-template-columns: 1fr 110px; gap: 12px; align-items: start; }
.form-grid-row { display: flex; gap: 12px; align-items: flex-end; }
.form-grid-row.single-col .form-group { width: 100%; }

/* 表单元素 */
.form-group { display: flex; flex-direction: column; width: 100%; margin-bottom: 0; }
.form-group label { font-size: 0.75rem; margin-bottom: 6px; color: #86868b; height: 14px; line-height: 14px; white-space: nowrap; }
.modern-input { padding: 8px 12px; font-size: 0.95rem; border-radius: 8px; border: none; background: #f2f2f7; height: 38px; width: 100%; box-sizing: border-box; }
.modern-input:focus { background: #fff; box-shadow: 0 0 0 2px #007aff; outline: none; }
.category-group select.modern-input { appearance: none; -webkit-appearance: none; background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e"); background-repeat: no-repeat; background-position: right 8px center; background-size: 14px; padding-right: 24px; }

/* 平台 Input */
.network-input-compact { position: relative; display: flex; align-items: center; width: 100%; }
.network-input-compact input { padding-right: 40px; }
.network-logo-mini { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 28px; height: 28px; background: white; border-radius: 6px; padding: 2px; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); pointer-events: none; }
.network-logo-mini img { width: 100%; height: 100%; object-fit: contain; }

/* 频率/进度 区块 */
.form-section-compact { background: #f9f9fb; border-radius: 10px; padding: 10px 12px; border: 1px solid #f0f0f0; }
.compact-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.compact-header label { margin: 0; }
.segmented-control.mini { margin: 0; padding: 2px; background: #e5e5ea; height: 28px; display: flex; border-radius: 8px; }
.segmented-control.mini .segment-option { padding: 0 10px; font-size: 0.8rem; line-height: 24px; flex: 1; text-align: center; cursor: pointer; border: 0; background: transparent; border-radius: 6px; transition: all 0.2s; }
.segment-option.active { background: #fff; color: #000; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-weight: 600; }
.week-selector-mini { display: flex; justify-content: space-between; margin-bottom: 8px; }
.day-chip.mini { width: 30px; height: 30px; font-size: 0.75rem; margin: 0; border-radius: 50%; border: 1px solid #eee; background: #fff; color: #666; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.day-chip.active { background: #007aff; color: white; border-color: #007aff; }
.inline-row { display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #666; }
.modern-input.inline-input { width: 50px; text-align: center; padding: 4px; height: 30px; }
.modern-input.inline-date { width: 130px; padding: 4px 8px; height: 30px; font-size: 0.8rem; }
.spacer { color: #ddd; margin: 0 4px; }
.stats-row-compact { display: flex; gap: 10px; }
.stat-input-wrap { flex: 1; display: flex; align-items: center; background: white; border: 1px solid #e5e5e5; border-radius: 8px; overflow: hidden; height: 36px; }
.stat-input-wrap span { font-size: 0.75rem; color: #999; background: #fcfcfc; padding: 0 8px; border-right: 1px solid #f0f0f0; height: 100%; display: flex; align-items: center; }
.stat-input-wrap input { border: none; background: transparent; box-shadow: none; text-align: center; padding: 0; height: 100%; font-weight: 600; width: 100%; }
.stat-input-wrap input:focus { box-shadow: none; background: #fff; }

/* 底部按钮 */
.modal-footer { padding: 16px 28px 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px; }
.btn { padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; }
.text-btn { background: transparent; color: #666; }
.text-btn:hover { background: #f5f5f7; color: #333; }
.primary-btn { background: #1d1d1f; color: white; }
.primary-btn:hover { background: #000; transform: scale(1.02); }

/* 搜索框 (紧凑模式) */
.search-box-modern.compact { margin-bottom: 0; height: 40px; display: flex; align-items: center; position: relative; }
.search-box-modern.compact .search-input { height: 40px; padding: 0 36px; }
.search-box-modern.compact .search-icon { position: absolute; top: 50%; transform: translateY(-50%); left: 10px; color: #999; }
.search-box-modern.compact .btn-icon { position: absolute; width: 24px; height: 24px; top: 50%; transform: translateY(-50%); right: 8px; background: #e0e0e0; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; }

/* ★ 关键样式：搜索结果下拉，绝对定位，高层级 */
.tmdb-results-floating { position: absolute; width: calc(100% - 48px); left: 24px; top: 100%; z-index: 1000; background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.25); max-height: 280px; overflow-y: auto; padding: 8px; border: 1px solid #eee; margin-top: 6px; }
.tmdb-item { width: 100%; border: 0; background: #fff; text-align: left; display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
.tmdb-item:hover { background: #f5f5f7; }
.tmdb-thumb-wrapper { width: 48px; height: 72px; flex-shrink: 0; border-radius: 6px; overflow: hidden; background: #eee; display: flex; align-items: center; justify-content: center; }
.tmdb-thumb { width: 100%; height: 100%; object-fit: cover; }
.tmdb-thumb-placeholder { font-weight: bold; color: #999; }
.tmdb-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.tmdb-title { font-weight: 600; font-size: 0.95rem; color: #1d1d1f; margin-bottom: 2px; }
.tmdb-meta { font-size: 0.8rem; color: #86868b; display: flex; align-items: center; gap: 6px; }
.meta-badge { background: #f0f0f2; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
.meta-dot { font-weight: 800; color: #d1d1d6; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

@media (max-width: 768px) {
  .modal-container.modern-modal { width: 90%; max-height: 85vh; }
}
</style>
