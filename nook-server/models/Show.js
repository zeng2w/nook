const mongoose = require('mongoose');

const ShowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true, trim: true, minlength: 1, maxlength: 200 },
  category: { type: String, enum: ['tv', 'anime', 'movie', 'variety'], required: true },
  status: { type: String, enum: ['wish', 'watching', 'watched', 'dropped'], default: 'watching' },
  
  // 进度数据
  totalEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  airedEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  watchedEpisodes: { type: Number, default: 0, min: 0, validate: Number.isInteger },
  
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
  
  lastAirDate: { type: Date, default: null },
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ShowSchema.index({ userId: 1, updatedAt: -1 });
ShowSchema.index({ userId: 1, tmdbId: 1 });

ShowSchema.pre('validate', function validateEpisodeTotals() {
  if (this.totalEpisodes > 0 && this.airedEpisodes > this.totalEpisodes) {
    this.invalidate('airedEpisodes', 'Aired episodes cannot exceed total episodes');
  }
  if (this.totalEpisodes > 0 && this.watchedEpisodes > this.totalEpisodes) {
    this.invalidate('watchedEpisodes', 'Watched episodes cannot exceed total episodes');
  }
});

module.exports = mongoose.model('Show', ShowSchema);
