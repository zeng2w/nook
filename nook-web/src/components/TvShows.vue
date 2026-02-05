<template>
  <div class="tv-container" ref="mainContainer">
    
    <transition name="toast-slide">
      <div v-if="toast.visible" class="toast-notification" :class="toast.type">
        <div class="toast-icon">{{ toast.type === 'success' ? '✅' : '⚠️' }}</div>
        <div class="toast-content">{{ toast.message }}</div>
      </div>
    </transition>

    <div class="sticky-header-wrapper" :class="{ 'header-hidden': !isHeaderVisible }">
      <div class="header">
        <div>
          <h2 class="page-title">追剧记录</h2>
          <p class="subtitle">管理您的影视作品观看进度</p>
        </div>
        <div class="header-actions">
          
          <div class="notification-wrapper" ref="notiContainer">
            <button class="icon-btn noti-btn" @click="toggleNotifications" :class="{ active: showNotiPanel }" title="消息通知">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              <span v-if="hasNewNotis" class="red-dot"></span>
            </button>

            <transition name="fade-slide">
              <div v-if="showNotiPanel" class="noti-dropdown">
                <div class="noti-header">
                  <span>消息通知</span>
                  <span class="noti-count" v-if="notifications.length">{{ notifications.length }}</span>
                </div>
                
                <div class="noti-list" v-if="notifications.length > 0">
                  <div v-for="(item, index) in notifications" :key="item.uniqueId" class="noti-item">
                    <div class="noti-poster-box">
                      <img v-if="item.posterUrl" :src="item.posterUrl" class="noti-img" loading="lazy" />
                      <div v-else class="noti-img-placeholder">{{ item.title.charAt(0) }}</div>
                    </div>
                    
                    <div class="noti-info">
                      <div class="noti-row-top">
                        <span class="noti-title">{{ item.title }}</span>
                      </div>
                      <div class="noti-desc">
                        已更新至 <span class="highlight">{{ item.newEp }}</span> 集
                        <span class="old-ep" v-if="item.oldEp">(原: {{ item.oldEp }})</span>
                      </div>
                      <div class="noti-date-bottom" style="font-size: 0.75rem; color: #9ca3af; margin-top: 4px;">
                        {{ formatDateSimple(item.updateDate) }}
                      </div>
                    </div>

                    <button class="noti-delete-btn" @click.stop="removeNotification(index)" title="删除这条记录">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                </div>
                
                <div v-else class="noti-empty">
                  <div class="empty-emoji">🔕</div>
                  <p>暂无新消息</p>
                </div>

                <div class="noti-footer" v-if="notifications.length > 0">
                  <button class="clear-all-btn" @click="clearNotifications">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    清空列表
                  </button>
                </div>
              </div>
            </transition>
          </div>

          <div class="divider-vertical"></div>

          <div class="view-toggle">
            <button class="toggle-btn" :class="{ active: viewMode === 'grid' }" @click="viewMode = 'grid'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg></button>
            <button class="toggle-btn" :class="{ active: viewMode === 'list' }" @click="viewMode = 'list'"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg></button>
          </div>
          
          <button class="add-btn" @click="openAddModal">
            <span class="plus-icon">+</span> 添加剧集
          </button>
        </div>
      </div>
      
      <div class="filters-container">
        <div class="filters-row">
          <span class="filter-label">分类</span>
          <button v-for="cat in categories" :key="cat.value" class="filter-chip" :class="{ active: currentCategory === cat.value }" @click="currentCategory = cat.value">{{ cat.label }}</button>
        </div>
        <div class="filters-row">
          <span class="filter-label">状态</span>
          <button v-for="st in statuses" :key="st.value" class="filter-chip status-chip" :class="{ active: currentStatus === st.value }" @click="currentStatus = st.value">{{ st.label }}</button>
        </div>
        <div class="filters-row" v-if="uniqueNetworks.length > 0">
          <span class="filter-label">平台</span>
          <button class="filter-chip" :class="{ active: currentNetwork === 'all' }" @click="currentNetwork = 'all'">全部</button>
          <button v-for="net in uniqueNetworks" :key="net.name" class="filter-chip network-chip" :class="{ active: currentNetwork === net.name, 'logo-mode': !!net.logo }" @click="currentNetwork = net.name" :title="net.name">
            <img v-if="net.logo" :src="net.logo" class="filter-logo-img" alt="logo" />
            <span v-else>{{ net.name }}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="content-body">
      <div v-if="viewMode === 'grid'" class="grid-layout">
        <div v-for="show in filteredShows" :key="show._id" class="show-card-wrapper">
          <div class="show-card" :class="{ 'blur-bg': pendingDeletes[show._id], 'dropped-card': show.status === 'dropped' }" @mouseleave="flippedCardId = null">
            <div class="flipper" :class="{ 'is-flipped': flippedCardId === show._id }">
              <div class="card-face front">
                <div class="top-actions" v-if="!pendingDeletes[show._id]">
                  <button class="action-circle-btn edit" @click.stop="openEditModal(show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                  <template v-if="show.status === 'dropped'"><button class="action-circle-btn restore" @click.stop="restoreShow(show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg></button><button class="action-circle-btn hard-delete" @click.stop="requestHardDelete(show._id)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></template>
                  <template v-else><button class="action-circle-btn soft-delete" @click.stop="dropShow(show)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></template>
                </div>
                <div class="card-header-grid">
                  <div class="poster-mini trigger-flip" :style="{ backgroundColor: getCategoryColor(show.category) }" @mouseenter="flippedCardId = show._id">
                    <img v-if="show.posterUrl" :src="show.posterUrl" class="mini-img" loading="lazy" /><span v-else>{{ show.title.charAt(0) }}</span><div class="flip-hint">↻</div>
                  </div>
                  <div class="header-info">
                    <h3>{{ show.title }}</h3>
                    <div class="tags-line">
                      <span class="tag-badge" :class="show.category">{{ getCategoryLabel(show.category) }}</span>
                      <span class="status-tag" :class="show.status">{{ getStatusLabel(show.status) }}</span>
                      <div v-if="show.networkLogo" class="network-tag-logo" :title="show.network"><img :src="show.networkLogo" alt="Network" /></div>
                      <span v-else-if="show.network" class="tag-badge network-text">{{ show.network }}</span>
                    </div>
                  </div>
                </div>
                <div class="ring-control-section">
                  <button class="ring-btn" :disabled="show.status === 'dropped'" @click.stop="updateProgress(show, -1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                  <div class="ring-wrapper"><FitnessRing :watched="show.watchedEpisodes" :aired="show.airedEpisodes" :total="show.totalEpisodes" :size="140"/></div>
                  <button class="ring-btn" :disabled="show.status === 'dropped'" @click.stop="updateProgress(show, 1)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></button>
                </div>
                <div class="stats-blocks">
                  <div class="stat-block purple"><span class="stat-label">更新</span><span class="stat-percent">{{ calcPercent(show.airedEpisodes, show.totalEpisodes) }}%</span><span class="stat-fraction">{{ show.airedEpisodes }}/{{ show.totalEpisodes || '?' }}</span></div>
                  <div class="stat-block blue"><span class="stat-label">观看</span><span class="stat-percent">{{ calcPercent(show.watchedEpisodes, show.totalEpisodes) }}%</span><span class="stat-fraction">{{ show.watchedEpisodes }}/{{ show.totalEpisodes || '?' }}</span></div>
                  <div class="stat-block green"><span class="stat-label">追剧</span><span class="stat-percent">{{ calcPercent(show.watchedEpisodes, show.airedEpisodes) }}%</span><span class="stat-fraction">{{ show.watchedEpisodes }}/{{ show.airedEpisodes || '?' }}</span></div>
                </div>
                <div class="detail-control-area"><div class="detail-numbers no-border"><div class="num-col"><span class="label">已看</span><span class="val blue-text">{{ show.watchedEpisodes }}</span></div><div class="num-col"><span class="label">更新</span><span class="val purple-text">{{ show.airedEpisodes }}</span></div><div class="num-col"><span class="label">总集</span><span class="val">{{ show.totalEpisodes || '-' }}</span></div></div></div>
                <div class="date-bar"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg><span>{{ getEstimatedDate(show) }}</span></div>
              </div>
              <div class="card-face back"><img v-if="show.posterUrl" :src="show.posterUrl" class="full-poster" loading="lazy" /><div v-else class="back-placeholder" :style="{ backgroundColor: getCategoryColor(show.category) }"><span>{{ show.title }}</span></div></div>
            </div>
          </div>
          <transition name="fade"><div v-if="pendingDeletes[show._id]" class="undo-overlay" @mouseenter="pauseDeleteTimer(show._id)" @mouseleave="resumeDeleteTimer(show._id)"><span class="undo-text">即将删除...</span><button class="undo-btn" @click="cancelDelete(show._id)">撤回</button></div></transition>
        </div>
        <div v-if="filteredShows.length === 0" class="empty-state">暂无相关剧集</div>
      </div>

      <div v-else class="list-layout-container">
        <div v-for="show in filteredShows" :key="show._id" class="list-card-wrapper">
          <div class="list-card full-height-poster" :class="{ 'blur-bg': pendingDeletes[show._id], 'dropped-card': show.status === 'dropped' }">
            <div class="list-poster-side" :style="{ backgroundColor: show.posterUrl ? 'transparent' : getCategoryColor(show.category) }"><img v-if="show.posterUrl" :src="show.posterUrl" alt="Poster" loading="lazy" /><span v-else>{{ show.title.charAt(0) }}</span></div>
            <div class="list-main-content">
              <div class="list-info-col">
                <h3>{{ show.title }}</h3>
                <div class="list-meta">
                  <span class="tag-badge" :class="show.category">{{ getCategoryLabel(show.category) }}</span>
                  <span class="status-tag" :class="show.status">{{ getStatusLabel(show.status) }}</span>
                  <div v-if="show.networkLogo" class="network-tag-logo list-mode" :title="show.network"><img :src="show.networkLogo" alt="Network" /></div>
                  <span v-else-if="show.network" class="tag-badge network-text">{{ show.network }}</span>
                  <span v-if="getEstimatedDate(show) !== '暂无数据'" class="meta-text">📅 {{ getEstimatedDate(show) }}</span>
                </div>
              </div>
              <div class="list-progress-col">
                <div class="progress-row"><div class="label-box"><span class="dot purple"></span> <span class="label">更新</span></div><div class="track"><div class="fill purple" :style="{ width: calcPercent(show.airedEpisodes, show.totalEpisodes) + '%' }"></div></div><span class="percent">{{ calcPercent(show.airedEpisodes, show.totalEpisodes) }}%</span></div>
                <div class="progress-row"><div class="label-box"><span class="dot blue"></span> <span class="label">观看</span></div><div class="track"><div class="fill blue" :style="{ width: calcPercent(show.watchedEpisodes, show.totalEpisodes) + '%' }"></div></div><span class="percent">{{ calcPercent(show.watchedEpisodes, show.totalEpisodes) }}%</span></div>
                <div class="progress-row"><div class="label-box"><span class="dot green"></span> <span class="label">追剧</span></div><div class="track"><div class="fill green" :style="{ width: calcPercent(show.watchedEpisodes, show.airedEpisodes) + '%' }"></div></div><span class="percent">{{ calcPercent(show.watchedEpisodes, show.airedEpisodes) }}%</span></div>
              </div>
              <div class="list-actions-col">
                <button class="ctrl-btn edit" @click="openEditModal(show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
                <template v-if="show.status === 'dropped'"><button class="ctrl-btn restore" @click="restoreShow(show)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7v6h6"></path><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"></path></svg></button><button class="ctrl-btn delete" @click="requestHardDelete(show._id)"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button></template>
                <template v-else><button class="ctrl-btn delete soft" @click="dropShow(show)"><svg width="16" height="16" viewBox="0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button><button class="ctrl-btn primary" @click="updateProgress(show, 1)">+1</button></template>
              </div>
            </div>
          </div>
          <transition name="fade"><div v-if="pendingDeletes[show._id]" class="undo-overlay list-mode" @mouseenter="pauseDeleteTimer(show._id)" @mouseleave="resumeDeleteTimer(show._id)"><span class="undo-text">即将彻底删除...</span><button class="undo-btn" @click="cancelDelete(show._id)">撤回</button></div></transition>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="isMenuOpen" class="fab-overlay" @click="toggleMenu"></div>
    </transition>
    <div v-if="showNotiPanel" class="transparent-overlay" @click="toggleNotifications"></div>

    <div class="fab-container">
      <input type="file" ref="fileInput" style="display: none" accept=".json" @change="handleFileUpload" />

      <transition-group name="fab-stagger" tag="div" class="fab-menu-items">
        <div v-if="isMenuOpen" key="sync" class="fab-item">
          <div class="fab-label">同步进度</div>
          <button class="fab-btn small" @click="syncData" :disabled="isSyncing">
            <span v-if="isSyncing" class="spinner">⟳</span>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
          </button>
        </div>
        <div v-if="isMenuOpen" key="export" class="fab-item">
          <div class="fab-label">备份数据</div>
          <button class="fab-btn small export-btn" @click="exportData">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          </button>
        </div>
        <div v-if="isMenuOpen" key="import" class="fab-item">
          <div class="fab-label">恢复备份</div>
          <button class="fab-btn small import-btn" @click="triggerImport">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
          </button>
        </div>
        <div v-if="isMenuOpen" key="calendar" class="fab-item">
          <div class="fab-label">追剧日历</div>
          <button class="fab-btn small" @click="openCalendar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </button>
        </div>
      </transition-group>

      <button class="fab-btn main" @click="toggleMenu" :class="{ 'is-active': isMenuOpen }">
        <span class="main-icon" v-if="!isMenuOpen"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg></span>
        <span class="close-icon" v-else><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></span>
      </button>
    </div>

    <Transition name="fade">
      <div v-if="showModal" class="modal-overlay" @click.self="showModal = false">
        <div class="modal-container modern-modal">
          <div class="modal-header"><h3>{{ isEditing ? '编辑剧集' : '添加新剧集' }}</h3></div>
          <div class="modal-body-scroll">
            <div v-if="!isEditing" class="tmdb-search-section">
              <div class="search-box-modern">
                <span class="search-icon">🔍</span>
                <input v-model="tmdbQuery" @keyup.enter="searchTMDB" placeholder="输入剧名搜索 (例如: 海贼王)" class="modern-input search-input" />
                <button class="btn-icon" @click="searchTMDB" :disabled="isSearching">{{ isSearching ? '...' : '→' }}</button>
              </div>
              <transition name="fade">
                <div v-if="tmdbResults.length > 0" class="tmdb-results-floating">
                  <div v-for="res in tmdbResults" :key="res.tmdbId" class="tmdb-item" @click="selectTMDBResult(res)">
                    <div class="tmdb-thumb-wrapper"><img v-if="res.posterUrl" :src="res.posterUrl" class="tmdb-thumb" /><div v-else class="tmdb-thumb-placeholder">{{ res.title.charAt(0) }}</div></div>
                    <div class="tmdb-info">
                      <div class="tmdb-title">{{ res.title }}</div>
                      <div class="tmdb-meta"><span class="meta-badge">{{ res.releaseDate ? res.releaseDate.substring(0,4) : 'N/A' }}</span><span class="meta-dot">•</span><span>{{ getCategoryLabel(res.category) }}</span></div>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
            <div class="form-group"><label>作品名称</label><input v-model="form.title" type="text" class="modern-input" placeholder="输入剧集名称" /></div>
            <div class="form-group"><label>播放平台 / 制作方</label><div class="network-input-group"><input v-model="form.network" type="text" class="modern-input" placeholder="例如: Netflix, Bilibili" /><div v-if="form.networkLogo" class="network-preview"><img :src="form.networkLogo" alt="Logo" /></div></div></div>
            <div v-if="!isEditing && availableSeasons.length > 0" class="form-group season-select-group"><label>检测到多季，是否仅添加特定一季？</label><select @change="onSeasonSelect" class="modern-input"><option value="">-- 添加整部剧 (默认) --</option><option v-for="s in availableSeasons" :key="s.seasonNumber" :value="s.seasonNumber">第 {{ s.seasonNumber }} 季 ({{ s.episodeCount }} 集)</option></select></div>
            <div class="row-group">
              <div class="form-group"><label>分类</label><select v-model="form.category" class="modern-input"><option value="tv">📺 电视剧</option><option value="anime">🎎 动漫</option><option value="movie">🎬 电影</option><option value="variety">🎤 综艺</option></select></div>
              <div class="form-group" v-if="isEditing"><label>状态</label><select v-model="form.status" class="modern-input"><option value="wish">想看</option><option value="watching">在追</option><option value="watched">已看</option><option value="dropped">弃剧</option></select></div>
            </div>
            <div class="form-section">
              <label class="section-title">更新频率</label>
              <div class="segmented-control"><div v-for="opt in freqOptions" :key="opt.val" class="segment-option" :class="{ active: form.updateFrequency === opt.val }" @click="form.updateFrequency = opt.val">{{ opt.label }}</div></div>
              <div v-if="form.updateFrequency === 'weekly'" class="week-selector-modern"><span class="sub-label">每周:</span><div class="days-row"><button v-for="(day, idx) in weekDays" :key="idx" class="day-chip" :class="{ active: form.updateDays.includes(idx) }" @click="toggleDay(idx)">{{ day }}</button></div></div>
              <div v-if="form.updateFrequency !== 'ended' && form.updateFrequency !== 'unknown'" class="update-count-row"><span class="sub-label">每次更新:</span><input v-model.number="form.updateCount" type="number" min="1" class="modern-input small-input" /><span class="sub-label">集</span></div>
            </div>
            <div class="form-section"><label class="section-title">当前进度</label><div class="stats-inputs-modern"><div class="stat-group"><label>已看</label><input v-model.number="form.watchedEpisodes" type="number" class="modern-input" /></div><div class="stat-group"><label>已更</label><input v-model.number="form.airedEpisodes" type="number" class="modern-input" /></div><div class="stat-group"><label>总集</label><input v-model.number="form.totalEpisodes" type="number" class="modern-input" /></div></div></div>
            <div class="form-group" v-if="form.updateFrequency !== 'ended' && form.updateFrequency !== 'unknown'"><label>最近更新日期</label><input v-model="form.lastAirDate" type="date" class="modern-input" /></div>
          </div>
          <div class="modal-footer"><button class="btn text-btn" @click="showModal = false">取消</button><button class="btn primary-btn" @click="saveShow">保存</button></div>
        </div>
      </div>
    </Transition>

    <Transition name="fade">
      <div v-if="showCalendar" class="modal-overlay glass-background" @click.self="showCalendar = false">
        <div class="glass-calendar-card">
          <div class="glass-header"><div class="header-left"><h3>追剧日历</h3><p>{{ getMonthTitle() }}</p></div><div class="header-right"><button class="nav-btn" @click="changeWeek(-1)">❮</button><button class="nav-btn" @click="changeWeek(1)">❯</button><button class="close-glass-btn" @click="showCalendar = false">✕</button></div></div>
          <div class="calendar-grid-view"><div v-for="(offset, idx) in 7" :key="idx" class="day-column" :class="{ 'is-today': isDateToday(getCalendarDate(idx)) }"><div class="day-header"><span class="day-name">{{ weekDaysAbbr[getCalendarDate(idx).getDay()] }}</span><div class="day-circle">{{ getCalendarDate(idx).getDate() }}</div></div><div class="day-body"><div v-for="(item, k) in getShowsForDate(getCalendarDate(idx))" :key="`${item.show._id}-${k}`" class="glass-item-card"><div class="item-poster"><img v-if="item.show.posterUrl" :src="item.show.posterUrl" loading="lazy"/><span v-else>{{ item.show.title.charAt(0) }}</span></div><div class="item-info"><span class="item-title" :title="item.show.title">{{ item.show.title }}</span><span class="item-ep">{{ item.episodeText }}</span></div></div><div v-if="getShowsForDate(getCalendarDate(idx)).length === 0" class="empty-dot">·</div></div></div></div>
        </div>
      </div>
    </Transition>

  </div>
</template>

<script setup>
// 【修改点 2：引入 onUnmounted】
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios';
import FitnessRing from './FitnessRing.vue';
import { updateTheme } from '../store';

const viewMode = ref('grid'); 
const currentCategory = ref('all');
const currentStatus = ref('all');
const currentNetwork = ref('all'); 
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const shows = ref([]);
const pendingDeletes = reactive({});
const availableSeasons = ref([]);
const flippedCardId = ref(null);
const isLoading = ref(false);
const isSyncing = ref(false);

// 菜单与通知状态
const isMenuOpen = ref(false);
const showNotiPanel = ref(false);
const notifications = ref([]);
const hasNewNotis = ref(false);
const fileInput = ref(null);

const tmdbQuery = ref('');
const tmdbResults = ref([]);
const isSearching = ref(false);

// --- 智能 Header 逻辑 (修正版) ---
const isHeaderVisible = ref(true);
const mainContainer = ref(null); // 对应 template 里的 ref
let lastScrollY = 0;

const handleScroll = () => {
  const container = mainContainer.value;
  if (!container) return;
  
  const currentScrollY = container.scrollTop;

  // 1. 如果在页面最顶部 (小于10px)，始终显示
  if (currentScrollY < 10) {
    isHeaderVisible.value = true;
    lastScrollY = currentScrollY;
    return;
  }

  // 2. 防抖：如果滚动幅度小于 10px，忽略它（防止手指按在屏幕上微动导致抖动）
  if (Math.abs(currentScrollY - lastScrollY) < 10) return;

  // 3. 判断滚动方向
  if (currentScrollY > lastScrollY) {
    // ---> 向下看内容：隐藏导航栏
    isHeaderVisible.value = false;
  } else {
    // ---> 向上往回翻：显示导航栏 (iPad 必须靠这个)
    // 逻辑优化：只有当“明显向上滑”超过 20px 时才显示
    if (lastScrollY - currentScrollY > 20) {
       isHeaderVisible.value = true; 
    }
  }
  
  lastScrollY = currentScrollY;
};

const handleMouseMove = (e) => {
  if (e.clientY < 50) {
    isHeaderVisible.value = true;
  }
};

onMounted(() => {
  fetchShows();
  updateTheme('#fcfcfc');
  const savedNotis = localStorage.getItem('tv_notifications');
  if (savedNotis) notifications.value = JSON.parse(savedNotis);
  
  // 关键修改：监听 mainContainer 的 scroll 事件，而不是 window
  if (mainContainer.value) {
    mainContainer.value.addEventListener('scroll', handleScroll);
  }
  window.addEventListener('mousemove', handleMouseMove);
});

onUnmounted(() => {
  // 记得解绑
  if (mainContainer.value) {
    mainContainer.value.removeEventListener('scroll', handleScroll);
  }
  window.removeEventListener('mousemove', handleMouseMove);
});
// --- 智能 Header 逻辑结束 ---

const toast = reactive({ visible: false, message: '', type: 'success' });
const showToast = (msg, type = 'success') => {
  toast.message = msg;
  toast.type = type;
  toast.visible = true;
  setTimeout(() => { toast.visible = false; }, 3000);
};

const initialForm = { title: '', category: 'tv', status: 'watching', updateFrequency: 'weekly', updateDays: [], updateCount: 1, watchedEpisodes: 0, airedEpisodes: 0, totalEpisodes: 0, lastAirDate: new Date().toISOString().split('T')[0], posterUrl: '', network: '', networkLogo: '', tmdbId: null };
const form = reactive({ ...initialForm });
const categories = [ { label: '全部', value: 'all' }, { label: '📺 电视剧', value: 'tv' }, { label: '🎎 动漫', value: 'anime' }, { label: '🎬 电影', value: 'movie' }, { label: '🎤 综艺', value: 'variety' } ];
const statuses = [ { label: '全部', value: 'all' }, { label: '想看', value: 'wish' }, { label: '在看', value: 'watching' }, { label: '已看', value: 'watched' }, { label: '弃剧', value: 'dropped' } ];
const freqOptions = [ { label: '周更', val: 'weekly' }, { label: '日更', val: 'daily' }, { label: '月更', val: 'monthly' }, { label: '完结', val: 'ended' } ];
const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
const weekDaysAbbr = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const showCalendar = ref(false);
const calendarStart = ref(new Date()); 
const openCalendar = () => { const d = new Date(); const day = d.getDay(); const diff = d.getDate() - day; const sunday = new Date(d.setDate(diff)); sunday.setHours(12,0,0,0); calendarStart.value = sunday; showCalendar.value = true; };
const changeWeek = (offset) => { const d = new Date(calendarStart.value); d.setDate(d.getDate() + (offset * 7)); calendarStart.value = d; };
const getMonthTitle = () => { const d = new Date(calendarStart.value); return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }); };
const getCalendarDate = (offsetIndex) => { const d = new Date(calendarStart.value); d.setDate(d.getDate() + offsetIndex); return d; };
const isDateToday = (dateObj) => { const today = new Date(); return dateObj.getDate() === today.getDate() && dateObj.getMonth() === today.getMonth() && dateObj.getFullYear() === today.getFullYear(); };
const getEpisodeTextForDate = (show, targetDate) => { if (!show.lastAirDate) return `更新至 ${show.airedEpisodes} 集`; const lastUpdate = new Date(show.lastAirDate); lastUpdate.setHours(12,0,0,0); const target = new Date(targetDate); target.setHours(12,0,0,0); const diffTime = target.getTime() - lastUpdate.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); let cycleOffset = 0; if (show.updateFrequency === 'daily') { cycleOffset = diffDays; } else if (show.updateFrequency === 'weekly') { cycleOffset = Math.floor(diffDays / 7); if (diffDays % 7 === 0) cycleOffset = diffDays / 7; } const updateCount = show.updateCount || 1; const endEpisode = show.airedEpisodes + (cycleOffset * updateCount); let startEpisode = endEpisode - updateCount + 1; if (endEpisode <= 0) return '尚未播出'; if (show.totalEpisodes && startEpisode > show.totalEpisodes) return '已完结'; if (startEpisode < 1) startEpisode = 1; const displayEnd = show.totalEpisodes ? Math.min(endEpisode, show.totalEpisodes) : endEpisode; if (updateCount === 1 || startEpisode === displayEnd) { return `第 ${displayEnd} 集`; } else { return `第 ${startEpisode}, ${displayEnd} 集`; } };
// const getShowsForDate = (dateObj) => { const dayIndex = dateObj.getDay(); const time = dateObj.getTime(); const results = []; shows.value.forEach(s => { if (s.status === 'dropped' || s.status === 'watched' || s.updateFrequency === 'ended') return; if (s.estimatedFinishDate) { const finish = new Date(s.estimatedFinishDate).getTime(); if (time > finish) return; } let isAirDay = false; if (s.updateFrequency === 'daily') isAirDay = true; else if (s.updateDays && s.updateDays.includes(dayIndex)) isAirDay = true; if (isAirDay) { const epText = getEpisodeTextForDate(s, dateObj); if (epText !== '尚未播出') { results.push({ show: s, episodeText: epText }); } } }); return results; };
const getShowsForDate = (dateObj) => {
  const dayIndex = dateObj.getDay();
  const time = dateObj.getTime();
  const results = [];
  
  shows.value.forEach(s => {
    // 基础过滤：弃剧、已看完、状态为“完结”的直接跳过
    if (s.status === 'dropped' || s.status === 'watched' || s.updateFrequency === 'ended') return;
    
    // 如果有预计完结日期，且当前日期已超过预计日期，也跳过
    if (s.estimatedFinishDate) {
      const finish = new Date(s.estimatedFinishDate).getTime();
      if (time > finish) return;
    }
    
    let isAirDay = false;
    if (s.updateFrequency === 'daily') isAirDay = true;
    else if (s.updateDays && s.updateDays.includes(dayIndex)) isAirDay = true;
    
    if (isAirDay) {
      const epText = getEpisodeTextForDate(s, dateObj);
      
      // 【关键修改在这里】
      // 只有当显示的文字不是 '尚未播出' 且不是 '已完结' 时，才添加到日历中
      if (epText !== '尚未播出' && epText !== '已完结') {
        results.push({ show: s, episodeText: epText });
      }
    }
  });
  
  return results;
};

const uniqueNetworks = computed(() => { const nets = new Map(); shows.value.forEach(s => { if (s.network && !nets.has(s.network)) { nets.set(s.network, { name: s.network, logo: s.networkLogo }); } }); return Array.from(nets.values()).sort((a, b) => a.name.localeCompare(b.name)); });
const filteredShows = computed(() => { let result = shows.value.filter(s => { const catMatch = currentCategory.value === 'all' || s.category === currentCategory.value; const statusMatch = currentStatus.value === 'all' || s.status === currentStatus.value; const netMatch = currentNetwork.value === 'all' || s.network === currentNetwork.value; return catMatch && statusMatch && netMatch; }); return result.sort((a, b) => { if (a.status === 'dropped' && b.status !== 'dropped') return 1; if (a.status !== 'dropped' && b.status === 'dropped') return -1; const dateA = a.lastAirDate ? new Date(a.lastAirDate).getTime() : 0; const dateB = b.lastAirDate ? new Date(b.lastAirDate).getTime() : 0; if (dateA === 0 && dateB !== 0) return 1; if (dateB === 0 && dateA !== 0) return -1; return dateB - dateA; }); });
const getCurrentUserId = () => { const userStr = sessionStorage.getItem('current_user'); return userStr ? JSON.parse(userStr).id : null; };

onMounted(() => {
  fetchShows();
  updateTheme('#fcfcfc');
  const savedNotis = localStorage.getItem('tv_notifications');
  if (savedNotis) {
    notifications.value = JSON.parse(savedNotis);
  }
  
  // 【修改点 3：添加滚动和鼠标监听】
  window.addEventListener('scroll', handleScroll);
  window.addEventListener('mousemove', handleMouseMove);
});

// 【修改点 4：销毁时移除监听】
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('mousemove', handleMouseMove);
});

watch(notifications, (newVal) => {
  localStorage.setItem('tv_notifications', JSON.stringify(newVal));
}, { deep: true });

const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value; };
const closeAllOverlays = () => { isMenuOpen.value = false; showNotiPanel.value = false; };

const toggleNotifications = () => {
  showNotiPanel.value = !showNotiPanel.value;
  if (showNotiPanel.value) { hasNewNotis.value = false; }
};

const clearNotifications = () => { notifications.value = []; };
const removeNotification = (index) => { notifications.value.splice(index, 1); };

// 日期格式化：使用 UTC 时间获取年月日
const formatDateSimple = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const triggerImport = () => { fileInput.value.click(); };
const exportData = () => { const userId = getCurrentUserId(); if (!userId) return; const url = `/api/shows/export?userId=${userId}`; window.open(url, '_blank'); showToast("数据备份下载中...", "success"); };
const handleFileUpload = (event) => { const file = event.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = async (e) => { try { const jsonContent = e.target.result; const parsedData = JSON.parse(jsonContent); if (!Array.isArray(parsedData)) { return showToast("文件格式错误", "error"); } const userId = getCurrentUserId(); showToast("正在导入数据...", "success"); const res = await axios.post('/api/shows/import', { userId, shows: parsedData }); if (res.data.success) { showToast(res.data.message, "success"); await fetchShows(); } } catch (err) { console.error(err); showToast("导入失败", "error"); } finally { event.target.value = ''; } }; reader.readAsText(file); };

const syncData = async () => {
  const userId = getCurrentUserId();
  if (!userId) return;
  isSyncing.value = true;
  showToast("正在同步最新数据...", "success");
  
  try {
    const res = await axios.post('/api/shows/sync', { userId });
    await fetchShows(); 

    if (res.data.updatedCount > 0) {
      if (res.data.logs && res.data.logs.length > 0) {
        // --- 核心修复：去重逻辑 ---
        // 1. 给现有的通知建立指纹 (剧名-集数-日期)
        const existingSignatures = new Set(
          notifications.value.map(n => `${n.title}|${n.newEp}|${n.updateDate}`)
        );

        // 2. 过滤掉已存在的，只保留真正的新消息
        const uniqueNewItems = res.data.logs.filter(log => {
          const signature = `${log.title}|${log.newEp}|${log.date}`;
          return !existingSignatures.has(signature);
        }).map(log => ({
          ...log,
          updateDate: log.date, 
          uniqueId: Date.now() + Math.random() // 这里的随机ID只用于Vue渲染，不影响数据逻辑
        }));

        // 3. 只有当确实有新数据时才添加
        if (uniqueNewItems.length > 0) {
          notifications.value = [...uniqueNewItems, ...notifications.value];
          hasNewNotis.value = true;
        }
        // -----------------------
      }
      showToast(`同步完成！更新了 ${res.data.updatedCount} 部剧集`, "success");
    } else {
      showToast('暂无新内容，已经是最新了', "success");
    }
  } catch (err) {
    console.error('Sync failed', err);
    showToast('同步失败，请检查网络连接', "error");
  } finally {
    isSyncing.value = false;
  }
};

const fetchShows = async () => { const userId = getCurrentUserId(); if (!userId) return; isLoading.value = true; try { const res = await axios.get(`/api/shows?userId=${userId}&t=${new Date().getTime()}`); shows.value = res.data; } catch (err) { console.error(err); } finally { setTimeout(() => { isLoading.value = false; }, 300); } };

const searchTMDB = async () => { if (!tmdbQuery.value) return; isSearching.value = true; tmdbResults.value = []; try { const res = await axios.get(`/api/tmdb/search?query=${tmdbQuery.value}`); tmdbResults.value = res.data; } catch (err) { console.error(err); } finally { isSearching.value = false; } };
const selectTMDBResult = async (item) => { form.tmdbId = item.tmdbId; form.title = item.title; form.category = item.category; form.posterUrl = item.posterUrl; availableSeasons.value = []; try { const type = item.category; const res = await axios.get(`/api/tmdb/details/${type}/${item.tmdbId}`); const details = res.data; form.totalEpisodes = details.totalEpisodes || 0; form.airedEpisodes = details.airedEpisodes || 0; if (details.networks && details.networks.length > 0) { const mainNet = details.networks[0]; form.network = mainNet.name; if (mainNet.logo_path) { form.networkLogo = `https://image.tmdb.org/t/p/h60${mainNet.logo_path}`; } else { form.networkLogo = ''; } } else { form.network = ''; form.networkLogo = ''; } if (details.updateFrequency === 'ended') form.updateFrequency = 'ended'; if (details.lastAirDate) { form.lastAirDate = new Date(details.lastAirDate).toISOString().split('T')[0]; const [y, m, d] = form.lastAirDate.split('-').map(Number); const dayIndex = new Date(y, m - 1, d).getDay(); form.updateDays = [dayIndex]; } if (details.seasons && details.seasons.length > 0) availableSeasons.value = details.seasons; tmdbResults.value = []; tmdbQuery.value = ''; } catch (err) { console.error(err); } };
const onSeasonSelect = (event) => { const seasonNum = parseInt(event.target.value); if (!seasonNum) return; const targetSeason = availableSeasons.value.find(s => s.seasonNumber === seasonNum); if (targetSeason) { const baseTitle = form.title.replace(/\s\(Season \d+\)$/, ''); form.title = `${baseTitle} (Season ${targetSeason.seasonNumber})`; form.totalEpisodes = targetSeason.episodeCount; form.airedEpisodes = targetSeason.episodeCount; form.updateFrequency = 'ended'; } };
const getEstimatedDate = (show) => { if (!show.totalEpisodes || !show.airedEpisodes || show.airedEpisodes >= show.totalEpisodes) { return show.status === 'watched' ? '已完结' : (show.status === 'dropped' ? '已弃剧' : '暂无数据'); } if (!show.lastAirDate || show.updateFrequency === 'unknown' || show.updateFrequency === 'ended') return '待计算'; const remaining = show.totalEpisodes - show.airedEpisodes; const epPerUpdate = show.updateCount || 1; const lastDate = new Date(show.lastAirDate); if (isNaN(lastDate.getTime())) return '日期无效'; lastDate.setHours(lastDate.getHours() + 12); if (show.updateFrequency === 'daily') { lastDate.setDate(lastDate.getDate() + Math.ceil(remaining / epPerUpdate)); } else if (show.updateFrequency === 'weekly') { if (!show.updateDays || show.updateDays.length === 0) { lastDate.setDate(lastDate.getDate() + (Math.ceil(remaining / epPerUpdate) * 7)); } else { let tempRemaining = remaining; let safe = 3650; while (tempRemaining > 0 && safe > 0) { lastDate.setDate(lastDate.getDate() + 1); if (show.updateDays.includes(lastDate.getDay())) tempRemaining -= epPerUpdate; safe--; } } } else if (show.updateFrequency === 'monthly') { lastDate.setMonth(lastDate.getMonth() + Math.ceil(remaining / epPerUpdate)); } return `预计完结：${lastDate.toLocaleDateString()}`; };
const calcStatus = (watched, aired, total) => { if (watched === 0) return 'wish'; const target = (total > 0) ? total : aired; if (target > 0 && watched >= target) return 'watched'; return 'watching'; };
const openEditModal = (show) => { isEditing.value = true; editingId.value = show._id; tmdbResults.value = []; tmdbQuery.value = ''; availableSeasons.value = []; Object.assign(form, { title: show.title, category: show.category, status: show.status, posterUrl: show.posterUrl, updateFrequency: show.updateFrequency, updateDays: show.updateDays || [], updateCount: show.updateCount || 1, watchedEpisodes: show.watchedEpisodes, airedEpisodes: show.airedEpisodes, totalEpisodes: show.totalEpisodes, lastAirDate: show.lastAirDate ? new Date(show.lastAirDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0], network: show.network || '', networkLogo: show.networkLogo || '', tmdbId: show.tmdbId }); showModal.value = true; };
const openAddModal = () => { isEditing.value = false; editingId.value = null; tmdbResults.value = []; tmdbQuery.value = ''; availableSeasons.value = []; Object.assign(form, initialForm); form.updateDays = []; showModal.value = true; };
const toggleDay = (idx) => { const i = form.updateDays.indexOf(idx); if (i > -1) form.updateDays.splice(i, 1); else form.updateDays.push(idx); form.updateDays.sort(); };
const saveShow = async () => { const userId = getCurrentUserId(); if (!userId || !form.title) return showToast("请输入作品名称", "error"); try { let res; if (isEditing.value) { res = await axios.put(`/api/shows/${editingId.value}`, form); const index = shows.value.findIndex(s => s._id === editingId.value); if (index !== -1) shows.value[index] = res.data; showToast("编辑成功", "success"); } else { const initialStatus = calcStatus(form.watchedEpisodes, form.airedEpisodes, form.totalEpisodes); res = await axios.post('/api/shows', { userId, ...form, status: initialStatus }); shows.value.unshift(res.data); showToast("添加成功", "success"); } showModal.value = false; } catch (err) { if (err.response && err.response.data && err.response.data.error) { showToast(err.response.data.error, "error"); } else { console.error(err); showToast("保存失败，请稍后重试", "error"); } } };
const updateProgress = async (show, delta) => { if (show.status === 'dropped') return; const newVal = Math.max(0, show.watchedEpisodes + delta); show.watchedEpisodes = newVal; const newStatus = calcStatus(newVal, show.airedEpisodes, show.totalEpisodes); if (newStatus !== show.status) show.status = newStatus; try { await axios.put(`/api/shows/${show._id}`, { watchedEpisodes: newVal, status: newStatus }); } catch(e){} };
const dropShow = async (show) => { show.status = 'dropped'; try { await axios.put(`/api/shows/${show._id}`, { status: 'dropped' }); } catch(e){} };
const restoreShow = async (show) => { const correctStatus = calcStatus(show.watchedEpisodes, show.airedEpisodes, show.totalEpisodes); show.status = correctStatus; try { await axios.put(`/api/shows/${show._id}`, { status: correctStatus }); } catch(e){} };
const requestHardDelete = (id) => { pendingDeletes[id] = setTimeout(() => { confirmDelete(id); }, 3000); };
const cancelDelete = (id) => { if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } };
const pauseDeleteTimer = (id) => { if (pendingDeletes[id]) clearTimeout(pendingDeletes[id]); };
const resumeDeleteTimer = (id) => { pendingDeletes[id] = setTimeout(() => { confirmDelete(id); }, 3000); };
const confirmDelete = async (id) => { if (pendingDeletes[id]) { clearTimeout(pendingDeletes[id]); delete pendingDeletes[id]; } const backup = shows.value.find(s => s._id === id); shows.value = shows.value.filter(s => s._id !== id); try { await axios.delete(`/api/shows/${id}`); showToast("删除成功", "success"); } catch (err) { console.error(err); if(backup) shows.value.push(backup); showToast("删除失败", "error"); } };
const getCategoryColor = (cat) => ({ tv: '#e5e7eb', anime: '#f3e8ff', movie: '#e0f2fe', variety: '#ffedd5' }[cat] || '#eee');
const getCategoryLabel = (cat) => ({ tv: '电视剧', anime: '动漫', movie: '电影', variety: '综艺' }[cat] || cat);
const getStatusLabel = (st) => ({ wish: '想看', watching: '在看', watched: '已看', dropped: '弃剧' }[st] || st);
const calcPercent = (n, d) => (!d || d === 0) ? 0 : Math.round((n / d) * 100);

onMounted(() => { fetchShows(); updateTheme('#fcfcfc'); });
</script>

<style scoped>
/* --- 透明遮罩层 (用于关闭通知面板，解决白屏问题) --- */
.transparent-overlay {
  position: fixed; inset: 0; 
  background: transparent; /* 关键：完全透明，不遮挡视觉 */
  z-index: 90; /* 层级低于通知面板 (100)，高于普通内容 */
}

/* --- 通知中心样式 --- */
.notification-wrapper { position: relative; display: flex; align-items: center; }
.noti-btn { position: relative; color: #555; transition: color 0.2s; }
.noti-btn:hover, .noti-btn.active { color: #000; background: #f3f4f6; }
.red-dot { position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; background: #ef4444; border-radius: 50%; border: 1px solid white; }

.noti-dropdown {
  position: absolute; top: 120%; right: 0; width: 340px;
  background: white; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.12);
  border: 1px solid #f0f0f0; 
  z-index: 100; /* 高于透明遮罩 */
  display: flex; flex-direction: column; overflow: hidden;
  max-height: 80vh; 
}

.noti-header {
  padding: 12px 16px; border-bottom: 1px solid #f0f0f0;
  display: flex; justify-content: space-between; align-items: center;
  font-weight: 600; color: #333; font-size: 0.95rem;
  background: #fafafa;
}
.noti-count { background: #3b82f6; color: white; padding: 1px 6px; border-radius: 10px; font-size: 0.75rem; }

.noti-list { overflow-y: auto; max-height: 400px; padding-bottom: 10px; }
.noti-item {
  display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid #f5f5f5;
  transition: background 0.2s; position: relative;
}
.noti-item:hover { background: #f9fafb; }
.noti-item:last-child { border-bottom: none; }

.noti-poster-box {
  width: 40px; height: 56px; border-radius: 4px; overflow: hidden; background: #eee; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.noti-img { width: 100%; height: 100%; object-fit: cover; }
.noti-img-placeholder { font-weight: bold; color: #999; font-size: 1rem; }

.noti-info { flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 2px; }
.noti-row-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
.noti-title { font-size: 0.9rem; font-weight: 600; color: #111; line-height: 1.3; }
.noti-desc { font-size: 0.8rem; color: #666; }
.highlight { color: #2563eb; font-weight: 700; }
.old-ep { color: #9ca3af; font-size: 0.75rem; margin-left: 4px; }

.noti-delete-btn {
  background: none; border: none; padding: 4px; color: #ccc; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: color 0.2s;
  align-self: center; /* 垂直居中 */
}
.noti-delete-btn:hover { color: #ef4444; background: #fff5f5; border-radius: 4px; }

.noti-empty { padding: 40px 20px; text-align: center; color: #999; }
.empty-emoji { font-size: 2rem; margin-bottom: 8px; }

.noti-footer {
  padding: 10px 16px; border-top: 1px solid #f0f0f0; background: #fff;
  display: flex; justify-content: flex-start;
}
.clear-all-btn {
  display: flex; align-items: center; gap: 4px; border: none; background: none;
  font-size: 0.85rem; color: #666; cursor: pointer; padding: 6px 10px; border-radius: 6px;
  transition: all 0.2s;
}
.clear-all-btn:hover { color: #ef4444; background: #fef2f2; }

/* 动画 */
.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.2s ease; }
.fade-slide-enter-from, .fade-slide-leave-to { opacity: 0; transform: translateY(10px); }

/* --- FAB 菜单样式 (核心部分) --- */
.fab-container { position: fixed; bottom: 30px; right: 30px; z-index: 1000; display: flex; flex-direction: column-reverse; align-items: center; gap: 16px; }
/* FAB 的遮罩层依然保留白色背景 (突出操作) */
.fab-overlay { position: fixed; inset: 0; background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(2px); z-index: 999; }
.fab-btn { border: none; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1); color: #333; position: relative; }
.fab-btn.main { width: 64px; height: 64px; border-radius: 50%; background: #3B82F6; color: white; font-size: 1.5rem; z-index: 2; box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
.fab-btn.main:hover { transform: scale(1.05); }
.fab-btn.main.is-active { background: #3B82F6; } 
.fab-btn.main.is-active .main-icon, .fab-btn.main.is-active .close-icon { transform: rotate(90deg); transition: transform 0.3s; }
.fab-item { position: relative; display: flex; align-items: center; justify-content: center; }
.fab-btn.small { width: 48px; height: 48px; border-radius: 50%; background: white; color: #374151; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border: 1px solid #f3f4f6; }
.fab-btn.small:hover { transform: scale(1.1); background: #f9fafb; }
.fab-label { position: absolute; right: 60px; top: 50%; transform: translateY(-50%); background: rgba(0,0,0,0.8); color: white; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; white-space: nowrap; pointer-events: none; opacity: 0; visibility: hidden; transition: all 0.2s ease; }
.fab-item:hover .fab-label { opacity: 1; visibility: visible; right: 65px; }
.fab-stagger-enter-active, .fab-stagger-leave-active { transition: all 0.3s ease; }
.fab-stagger-enter-from, .fab-stagger-leave-to { opacity: 0; transform: translateY(20px) scale(0.5); }

/* --- 之前的样式 (Header & Toast 等) --- */
.divider-vertical { width: 1px; height: 24px; background: #e5e7eb; margin: 0 8px; }
.icon-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #eee; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #666; transition: all 0.2s; }
.icon-btn:hover { background: #f9fafb; color: #333; }
.toast-notification { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 2000; display: flex; align-items: center; gap: 12px; background: white; padding: 12px 20px; border-radius: 50px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); min-width: 300px; max-width: 90%; }
.toast-notification.success { border-left: 4px solid #10b981; }
.toast-notification.error { border-left: 4px solid #ef4444; }
.toast-icon { font-size: 1.2rem; }
.toast-content { font-size: 0.95rem; font-weight: 500; color: #333; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translate(-50%, -20px); }

/* (其余通用样式保持不变...) */
.tags-line, .list-meta { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.tag-badge, .status-tag, .network-tag-logo, .network-text { height: 20px; display: inline-flex; align-items: center; justify-content: center; line-height: 1; box-sizing: border-box; border-radius: 4px; font-size: 0.7rem; font-weight: 600; vertical-align: middle; }
.tag-badge, .status-tag, .network-text { padding: 0 6px; }
.network-tag-logo { padding: 0 4px; background: #fff; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
.network-tag-logo img { height: 12px; width: auto; object-fit: contain; display: block; }
.tag-badge.tv { background: #dbeafe; color: #1e40af; }
.tag-badge.anime { background: #f3e8ff; color: #6b21a8; }
.tag-badge.movie { background: #e0e7ff; color: #3730a3; }
.tag-badge.variety { background: #ffedd5; color: #9a3412; }
.status-tag.wish { background: #fef3c7; color: #d97706; }
.status-tag.watching { background: #d1fae5; color: #059669; }
.status-tag.watched { background: #e0e7ff; color: #4338ca; }
.status-tag.dropped { background: #f3f4f6; color: #9ca3af; text-decoration: line-through; }
.network-text { background: #f3f4f6; color: #4b5563; border: 1px solid #e5e7eb; }
.network-logo-badge.list-mode { height: 20px; }
.network-chip { padding: 4px 12px; height: 32px; display: inline-flex; align-items: center; justify-content: center; background: white; border: 1px solid #eee; color: #555; }
.filter-logo-img { height: 18px; width: auto; object-fit: contain; display: block; }
.network-chip.active { background: #fff; border: 2px solid #374151; box-shadow: 0 4px 10px rgba(55, 65, 81, 0.15); color: #374151; font-weight: 600; }
.network-chip.logo-mode { padding: 4px 10px; }
.network-input-group { display: flex; gap: 10px; align-items: center; }
.network-preview { height: 38px; padding: 2px 8px; flex-shrink: 0; background: white; border: 1px solid #eee; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.network-preview img { height: 100%; width: auto; object-fit: contain; }
.tv-container { padding: 0; height: 100%; overflow-y: auto; background-color: transparent; color: #333; }

/* 【修改点 5：添加动画和隐藏样式】 */
.sticky-header-wrapper {
  position: sticky;
  top: 0;
  z-index: 99;
  background-color: rgba(252, 252, 252, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(0,0,0,0.03);
  padding-bottom: 10px;
  
  /* 新增过渡动画 */
  transition: transform 0.3s ease-in-out;
  transform: translateY(0);
}

/* 隐藏时向上移动 100% */
.sticky-header-wrapper.header-hidden {
  transform: translateY(-80%);
}

.header { display: flex; justify-content: space-between; align-items: center; padding: 30px 40px 10px 40px; }
.page-title { margin: 0; font-size: 1.8rem; font-weight: 800; letter-spacing: -0.5px; }
.subtitle { color: #666; margin-top: 5px; font-size: 0.95rem; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.view-toggle { background: #fff; border: 1px solid #eee; border-radius: 8px; padding: 4px; display: flex; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
.toggle-btn { background: none; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #999; display: flex; align-items: center; transition: all 0.2s; }
.toggle-btn:hover { color: #333; }
.toggle-btn.active { background: #f3f4f6; color: #111; }
.add-btn { background: #000; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: transform 0.1s; }
.add-btn:active { transform: scale(0.98); }
.add-btn.outline-btn { background: white; border: 1px solid #e5e7eb; color: #333; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.add-btn.outline-btn:hover { background: #f9fafb; border-color: #d1d5db; }
.filters-container { padding: 0 40px; display: flex; flex-direction: column; gap: 12px; margin-top: 5px; }
.filters-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-label { font-size: 0.85rem; color: #999; font-weight: 500; margin-right: 5px; }
.filter-chip { padding: 6px 16px; border-radius: 20px; border: 1px solid #eee; background: #fff; cursor: pointer; font-size: 0.85rem; font-weight: 500; color: #555; transition: all 0.2s; }
.filter-chip:hover { border-color: #ccc; }
.filter-chip.active { background: #2563eb; color: #fff; border-color: #2563eb; box-shadow: 0 4px 10px rgba(37, 99, 235, 0.2); }
.filter-chip.status-chip.active { background: #10b981; border-color: #10b981; box-shadow: 0 4px 10px rgba(16, 185, 129, 0.2); }
.content-body { padding: 20px 40px 40px 40px; }
.grid-layout { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 20px; padding-bottom: 60px; }
.show-card-wrapper { position: relative; perspective: 1000px; }
.show-card { width: 100%; height: 100%; position: relative; background: transparent; }
.show-card.blur-bg { filter: grayscale(100%); opacity: 0.5; }
.flipper { position: relative; width: 100%; height: 100%; transition: transform 0.6s; transform-style: preserve-3d; background: #fff; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); }
.flipper.is-flipped { transform: rotateY(180deg); }
.show-card.dropped-card .flipper { filter: grayscale(100%); opacity: 0.6; background-color: #f3f4f6; }
.card-face { position: relative; top: 0; left: 0; width: 100%; height: 100%; border-radius: 16px; backface-visibility: hidden; overflow: hidden; display: flex; flex-direction: column; }
.front { z-index: 2; transform: rotateY(0deg); padding: 16px; background: inherit; gap: 12px; }
.back { position: absolute; top: 0; left: 0; z-index: 1; transform: rotateY(180deg); background: #000; display: flex; align-items: center; justify-content: center; }
.full-poster { width: 100%; height: 100%; object-fit: cover; }
.back-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; font-weight: 700; padding: 20px; text-align: center; }
.top-actions { position: absolute; top: 15px; right: 15px; display: flex; gap: 8px; z-index: 5; }
.action-circle-btn { background: white; border-radius: 50%; border: 1px solid #f3f4f6; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
.action-circle-btn:hover { transform: scale(1.1); }
.card-header-grid { display: flex; align-items: center; gap: 10px; padding-right: 70px; }
.poster-mini { width: 80px; height: 120px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; background: #f3f4f6; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 2px 5px rgba(0,0,0,0.05); }
.poster-mini .mini-img { width: 100%; height: 100%; object-fit: cover; }
.flip-hint { position: absolute; inset: 0; background: rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; opacity: 0; transition: opacity 0.2s; }
.poster-mini:hover .flip-hint { opacity: 1; }
.header-info h3 { margin: 0 0 2px 0; font-size: 1rem; font-weight: 700; color: #1f2937; }
.ring-control-section { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 5px 0; transform: scale(0.95); }
.ring-wrapper { transform: scale(0.9); }
.ring-btn { width: 32px; height: 32px; border-radius: 50%; border: 1px solid #e5e7eb; background: #f3f4f6; color: #374151; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
.ring-btn:hover:not(:disabled) { background: #e5e7eb; color: #111; border-color: #d1d5db; transform: scale(1.1); }
.ring-btn:disabled { opacity: 0.5; cursor: not-allowed; background: #f9fafb; color: #9ca3af; }
.stats-blocks { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.stat-block { border-radius: 10px; padding: 8px 4px; display: flex; flex-direction: column; align-items: center; gap: 2px; }
.stat-block.purple { background: #f3e8ff; color: #9333ea; }
.stat-block.blue { background: #e0f2fe; color: #0284c7; }
.stat-block.green { background: #dcfce7; color: #16a34a; }
.stat-label { font-size: 0.65rem; font-weight: 600; opacity: 0.8; }
.stat-percent { font-size: 1rem; font-weight: 800; line-height: 1; }
.stat-fraction { font-size: 0.7rem; opacity: 0.8; }
.detail-control-area { background: #f9fafb; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.detail-numbers { display: flex; justify-content: space-around; border-bottom: 1px solid #eee; padding-bottom: 10px; }
.detail-numbers.no-border { border-bottom: none; padding-bottom: 0; }
.num-col { display: flex; flex-direction: column; align-items: center; gap: 0px; }
.num-col .label { font-size: 0.7rem; color: #9ca3af; }
.num-col .val { font-size: 1rem; font-weight: 700; color: #374151; }
.num-col .val.blue-text { color: #3b82f6; }
.num-col .val.purple-text { color: #a855f7; }
.date-bar { background: #f9fafb; color: #9ca3af; font-size: 0.75rem; padding: 8px; border-radius: 8px; display: flex; align-items: center; gap: 6px; justify-content: center; }
.list-layout-container { display: flex; flex-direction: column; gap: 15px; }
.list-card-wrapper { position: relative; }
.list-card.full-height-poster { background: white; border-radius: 12px; padding: 0; display: flex; align-items: stretch; border: 1px solid #f0f0f0; transition: all 0.3s; overflow: hidden; height: 140px; }
.list-card.dropped-card, .list-card.blur-bg { filter: grayscale(100%); opacity: 0.6; background-color: #f9fafb; }
.list-card.blur-bg { pointer-events: none; opacity: 0.5; }
.list-poster-side { width: 100px; height: 100%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #f3f4f6; overflow: hidden; }
.list-poster-side img { width: 100%; height: 100%; object-fit: cover; }
.list-main-content { flex: 1; display: flex; align-items: center; padding: 0 20px; gap: 20px; }
.list-info-col { flex: 1.2; display: flex; flex-direction: column; justify-content: center; }
.list-info-col h3 { margin: 0 0 6px 0; font-size: 1.1rem; font-weight: 700; color: #1f2937; }
.list-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.meta-text { font-size: 0.8rem; color: #888; }
.list-progress-col { flex: 1.5; display: flex; flex-direction: column; gap: 6px; justify-content: center; }
.progress-row { display: flex; align-items: center; gap: 10px; font-size: 0.8rem; }
.label-box { width: 60px; display: flex; align-items: center; gap: 6px; color: #666; font-weight: 500; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.purple { background: #9c27b0; } .dot.blue { background: #2979ff; } .dot.green { background: #4caf50; }
.track { flex: 1; height: 6px; background: #f3f4f6; border-radius: 3px; overflow: hidden; }
.fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
.fill.purple { background: #a855f7; } .fill.blue { background: #3b82f6; } .fill.green { background: #22c55e; }
.percent { width: 40px; text-align: right; color: #444; font-weight: 600; }
.list-actions-col { display: flex; gap: 10px; align-items: center; padding-right: 10px; }
.ctrl-btn { width: 36px; height: 36px; border-radius: 8px; border: 1px solid #eee; background: white; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.ctrl-btn.primary { background: #2563eb; color: white; border: none; }
.ctrl-btn.edit { color: #666; border-color: transparent; }
.ctrl-btn.edit:hover { background: #f3f4f6; color: #333; }
.ctrl-btn.delete { color: #ff5252; border-color: transparent; }
.ctrl-btn.delete:hover { background: #fff5f5; }
.ctrl-btn.delete.soft { color: #9ca3af; }
.ctrl-btn.delete.soft:hover { color: #ef4444; }
.ctrl-btn.restore { color: #16a34a; border-color: transparent; }
.ctrl-btn.restore:hover { background: #f0fdf4; }
.empty-state { padding: 50px; text-align: center; color: #999; grid-column: 1 / -1; }
.undo-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 15px; z-index: 10; background: rgba(255,255,255,0.6); backdrop-filter: blur(4px); border-radius: 16px; }
.undo-overlay.list-mode { flex-direction: row; gap: 20px; background: rgba(255,255,255,0.7); }
.undo-text { font-weight: 600; color: #333; font-size: 1.1rem; }
.undo-btn { display: flex; align-items: center; gap: 6px; background: #000; color: white; border: none; padding: 10px 20px; border-radius: 30px; font-weight: 600; cursor: pointer; box-shadow: 0 5px 15px rgba(0,0,0,0.2); transition: transform 0.2s; }
.undo-btn:hover { transform: scale(1.05); }
.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; z-index: 1000; backdrop-filter: blur(8px); }
.modal-container.modern-modal { background: #fff; width: 460px; border-radius: 24px; box-shadow: 0 25px 60px rgba(0,0,0,0.2); display: flex; flex-direction: column; overflow: hidden; max-height: 85vh; }
.modal-header { padding: 24px 28px 10px; }
.modal-header h3 { font-size: 1.5rem; font-weight: 800; margin: 0; color: #1d1d1f; }
.modal-body-scroll { padding: 10px 28px 24px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 20px; }
.form-group label, .section-title { font-size: 0.85rem; font-weight: 600; color: #86868b; margin-bottom: 6px; display: block; }
.modern-input { width: 100%; padding: 12px 16px; border-radius: 12px; border: none; background: #f5f5f7; font-size: 1rem; color: #1d1d1f; transition: all 0.2s; }
.modern-input:focus { background: #fff; box-shadow: 0 0 0 2px #007aff; outline: none; }
.row-group { display: flex; gap: 16px; } .row-group .form-group { flex: 1; }
.segmented-control { display: flex; background: #f5f5f7; padding: 4px; border-radius: 10px; margin-bottom: 12px; }
.segment-option { flex: 1; text-align: center; padding: 6px 0; font-size: 0.9rem; font-weight: 500; color: #666; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
.segment-option.active { background: #fff; color: #000; box-shadow: 0 2px 5px rgba(0,0,0,0.05); font-weight: 600; }
.week-selector-modern { margin-bottom: 12px; }
.days-row { display: flex; justify-content: space-between; gap: 6px; margin-top: 6px; }
.day-chip { width: 36px; height: 36px; border-radius: 50%; border: 1px solid #eee; background: #fff; color: #666; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; cursor: pointer; transition: all 0.2s; }
.day-chip.active { background: #007aff; color: white; border-color: #007aff; }
.stats-inputs-modern { display: flex; gap: 12px; }
.stat-group { flex: 1; text-align: center; }
.stat-group label { font-size: 0.75rem; margin-bottom: 4px; }
.stat-group input { text-align: center; font-weight: 600; }
.modal-footer { padding: 16px 28px 24px; border-top: 1px solid #f0f0f0; display: flex; justify-content: flex-end; gap: 12px; }
.btn { padding: 10px 20px; border-radius: 12px; font-weight: 600; cursor: pointer; border: none; font-size: 0.95rem; }
.text-btn { background: transparent; color: #666; }
.text-btn:hover { background: #f5f5f7; color: #333; }
.primary-btn { background: #1d1d1f; color: white; }
.primary-btn:hover { background: #000; transform: scale(1.02); }
.tmdb-search-section { position: relative; }
.search-box-modern { display: flex; align-items: center; position: relative; margin-bottom: 5px; }
.search-icon { position: absolute; left: 12px; color: #999; }
.search-input { padding-left: 36px; padding-right: 40px; }
.btn-icon { position: absolute; right: 8px; background: #e0e0e0; border: none; width: 28px; height: 28px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }
.tmdb-results-floating { position: absolute; width: 100%; top: 100%; left: 0; z-index: 100; background: white; border-radius: 16px; box-shadow: 0 15px 40px rgba(0,0,0,0.15); max-height: 280px; overflow-y: auto; padding: 8px; border: 1px solid #eee; margin-top: 6px; }
.tmdb-item { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
.tmdb-item:hover { background: #f5f5f7; }
.tmdb-thumb-wrapper { width: 48px; height: 72px; flex-shrink: 0; border-radius: 6px; overflow: hidden; background: #eee; display: flex; align-items: center; justify-content: center; }
.tmdb-thumb { width: 100%; height: 100%; object-fit: cover; }
.tmdb-thumb-placeholder { font-weight: bold; color: #999; }
.tmdb-info { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.tmdb-title { font-weight: 600; font-size: 0.95rem; color: #1d1d1f; margin-bottom: 2px; }
.tmdb-meta { font-size: 0.8rem; color: #86868b; display: flex; align-items: center; gap: 6px; }
.meta-badge { background: #f0f0f2; padding: 2px 6px; border-radius: 4px; font-weight: 500; }
.meta-dot { font-weight: 800; color: #d1d1d6; }
.modal-overlay.glass-background { background: rgba(0, 0, 0, 0.2); }
.glass-calendar-card { background: rgba(255, 255, 255, 0.95); backdrop-filter: blur(20px) saturate(180%); width: 95vw; max-width: 1600px; height: 85vh; border-radius: 24px; box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37); border: 1px solid rgba(255, 255, 255, 0.3); display: flex; flex-direction: column; overflow: hidden; padding: 0; color: #1d1d1f; }
.glass-header { padding: 20px 30px; border-bottom: 1px solid rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.3); }
.header-left h3 { margin: 0; font-size: 1.6rem; font-weight: 800; letter-spacing: -0.5px; }
.header-left p { margin: 0; color: #666; font-size: 0.9rem; margin-top: 2px; }
.header-right { display: flex; gap: 10px; }
.nav-btn { background: rgba(255,255,255,0.5); border: none; width: 32px; height: 32px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; font-size: 0.9rem; }
.nav-btn:hover { background: rgba(255,255,255,0.8); }
.close-glass-btn { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #666; margin-left: 10px; }
.close-glass-btn:hover { color: #000; }
.calendar-grid-view { display: grid; grid-template-columns: repeat(7, 1fr); flex: 1; overflow: hidden; }
.day-column { border-right: 1px solid rgba(0,0,0,0.05); display: flex; flex-direction: column; }
.day-column:last-child { border-right: none; }
.day-column.is-today { background: rgba(255,255,255,0.4); }
.day-header { padding: 15px; text-align: center; border-bottom: 1px solid rgba(0,0,0,0.03); display: flex; flex-direction: column; align-items: center; gap: 5px; }
.day-name { font-size: 0.75rem; font-weight: 600; color: #86868b; text-transform: uppercase; }
.day-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; font-weight: 600; color: #1d1d1f; }
.is-today .day-circle { background: #007aff; color: white; box-shadow: 0 4px 10px rgba(0,122,255,0.3); }
.is-today .day-name { color: #007aff; }
.day-body { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.glass-item-card { display: flex; gap: 12px; padding: 10px; border-radius: 12px; background: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.3); transition: all 0.2s; cursor: pointer; }
.glass-item-card:hover { transform: translateY(-2px); background: rgba(255,255,255,0.8); box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
.item-poster { width: 40px; height: 60px; border-radius: 6px; overflow: hidden; background: #eee; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.item-poster img { width: 100%; height: 100%; object-fit: cover; }
.item-info { display: flex; flex-direction: column; justify-content: center; overflow: hidden; }
.item-title { font-size: 0.85rem; font-weight: 700; color: #1d1d1f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.item-ep { font-size: 0.75rem; color: #86868b; margin-top: 2px; font-weight: 500; }
.empty-dot { text-align: center; color: #ccc; margin-top: 20px; font-size: 1.5rem; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
.spin { animation: spin 1s linear infinite; display: inline-block; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* ==================================================
   📱 Mobile Responsive Styles (移动端适配)
   ================================================== */
@media (max-width: 768px) {
  .header { padding: 15px 20px; flex-direction: column; align-items: flex-start; gap: 15px; }
  .content-body { padding: 15px; }
  .header-actions { width: 100%; justify-content: space-between; }
  .page-title { font-size: 1.5rem; }
  .subtitle { display: none; }
  .add-btn { padding: 8px 14px; font-size: 0.85rem; }
  .filters-container { padding: 0 20px; margin-top: 0; }
  .filters-row { flex-wrap: nowrap; overflow-x: auto; padding-bottom: 10px; -webkit-overflow-scrolling: touch; gap: 8px; }
  .filters-row::-webkit-scrollbar { display: none; }
  .filter-chip { flex-shrink: 0; white-space: nowrap; }
  .grid-layout { grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 100px; }
  .card-header-grid { flex-direction: row; padding-right: 30px; }
  .poster-mini { width: 50px; height: 75px; display: flex; }
  .header-info h3 { font-size: 0.9rem; line-height: 1.3; max-height: 2.6em; overflow: hidden; }
  .stats-blocks { gap: 4px; }
  .stat-block { padding: 6px 2px; }
  .stat-label { font-size: 0.6rem; }
  .stat-percent { font-size: 0.9rem; }
  .ring-wrapper { transform: scale(0.7); margin: -10px 0; }
  .list-card.full-height-poster { height: auto; min-height: 110px; }
  .list-poster-side { width: 80px; }
  .list-main-content { padding: 10px 15px; flex-direction: column; align-items: flex-start; gap: 10px; }
  .list-info-col, .list-progress-col, .list-actions-col { width: 100%; flex: auto; }
  .list-actions-col { justify-content: flex-end; padding-top: 5px; border-top: 1px solid #f5f5f5; }
  .modal-container.modern-modal { width: 90%; max-height: 85vh; }
  .row-group { flex-direction: column; gap: 10px; }
  .fab-container { bottom: 20px; right: 20px; }
  /* 移动端通知面板样式 */
  .noti-dropdown { width: 85vw; right: -20px; top: 120%; }
}
</style>