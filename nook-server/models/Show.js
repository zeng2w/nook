const mongoose = require('mongoose');

const EpisodeUpdateSchema = new mongoose.Schema({
  date: { type: Date, required: true },
  kind: { type: String, enum: ['broadcast', 'snapshot'], default: 'broadcast' },
  confirmedAt: { type: Date, default: null },
  startEpisode: { type: Number, required: true, min: 1, validate: Number.isInteger },
  endEpisode: { type: Number, required: true, min: 1, validate: Number.isInteger },
  source: { type: String, enum: ['tmdb', 'manual'], default: 'tmdb' }
}, { _id: false });

const ShowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  category: { type: String, enum: ['tv', 'anime', 'movie', 'variety'], required: true },
  status: { type: String, enum: ['wish', 'watching', 'watched', 'dropped'], default: 'watching' },
  
  trackingStarted: { type: Boolean, default: false },
  personalRating: { type: Number, default: null, min: 0, max: 10, validate: value => value == null || Number.isInteger(value) },
  completedAt: { type: Date, default: null },
  premiereReminder: { type: Boolean, default: false },
  releaseDate: { type: Date, default: null },

  // 进度数据
  totalEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  airedEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  watchedEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  episodeProgressConfirmedAt: { type: Date, default: null, select: false },
  episodeUpdateHistory: { type: [EpisodeUpdateSchema], default: [], select: false },
  
  // 更新规则
  updateFrequency: { 
    type: String, 
    enum: ['weekly', 'daily', 'monthly', 'ended', 'unknown'], 
    default: 'unknown' 
  },
  updateDays: {
    type: [Number],
    default: [],
    validate: {
      validator: days => days.every(day => Number.isInteger(day) && day >= 0 && day <= 6),
      message: 'Update days must be integers from 0 to 6'
    }
  },
  updateCount: { type: Number, default: 1, min: 1 },
  totalEpisodesLocked: { type: Boolean, default: false },
  scheduleLocked: { type: Boolean, default: false },
  
  lastAirDate: { type: Date, default: null },
  nextAirDate: { type: Date, default: null },
  estimatedFinishDate: { type: Date },
  
  // 媒体信息
  posterUrl: {
    type: String,
    default: '',
    maxlength: 2048,
    validate: {
      validator: value => !value || /^https?:\/\//i.test(value),
      message: 'Poster URL must use HTTP or HTTPS'
    }
  },
  
  playUrl: {
    type: String, default: '', trim: true, maxlength: 2048,
    validate: {
      validator: value => {
        if (!value) return true;
        try { return ['https:', 'http:'].includes(new URL(value).protocol); } catch { return false; }
      },
      message: 'Playback URL must be a valid HTTP or HTTPS URL'
    }
  },

  // 播放平台信息
  network: { type: String, default: '', trim: true, maxlength: 100 },
  networkLogo: {
    type: String,
    default: '',
    maxlength: 2048,
    validate: {
      validator: value => !value || /^https?:\/\//i.test(value),
      message: 'Network logo URL must use HTTP or HTTPS'
    }
  },

  // 【新增】喜爱置顶标记
  isFavorite: { type: Boolean, default: false },

  tmdbId: { type: Number, min: 1 },
  seriesTitle: { type: String, trim: true, maxlength: 200 },
  seasonNumber: {
    type: Number,
    default: null,
    min: 1,
    validate: {
      validator: value => value === null || value === undefined || Number.isInteger(value),
      message: 'Season number must be a positive whole number when provided'
    }
  },
  seasonName: { type: String, trim: true, maxlength: 200 },
  lastTmdbCheckedAt: { type: Date, default: null, select: false },
  lastTmdbSyncStatus: {
    type: String,
    enum: ['success', 'error'],
    default: null,
    select: false
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ShowSchema.index({ userId: 1, updatedAt: -1 });
ShowSchema.index(
  { userId: 1, tmdbId: 1, seasonNumber: 1 },
  {
    unique: true,
    name: 'uniq_user_tmdb_season',
    partialFilterExpression: { tmdbId: { $type: 'number' } }
  }
);
ShowSchema.index({ userId: 1, status: 1, category: 1, lastAirDate: -1 });

ShowSchema.pre('validate', function validateEpisodeTotals() {
  if (this.totalEpisodes > 0 && this.airedEpisodes > this.totalEpisodes) {
    this.invalidate('airedEpisodes', 'Aired episodes cannot exceed total episodes');
  }
  if (this.totalEpisodes > 0 && this.watchedEpisodes > this.totalEpisodes) {
    this.invalidate('watchedEpisodes', 'Watched episodes cannot exceed total episodes');
  }
});

module.exports = mongoose.model('Show', ShowSchema);
