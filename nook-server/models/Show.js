const mongoose = require('mongoose');

const ShowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['tv', 'anime', 'movie', 'variety'], required: true },
  status: { type: String, enum: ['wish', 'watching', 'watched', 'dropped'], default: 'watching' },
  
  // 进度数据
  totalEpisodes: { type: Number, default: 0, min: 0 },
  airedEpisodes: { type: Number, default: 0, min: 0 },
  watchedEpisodes: { type: Number, default: 0, min: 0 },
  
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
  posterUrl: { type: String, default: '' },
  
  // 播放平台信息
  network: { type: String, default: '' },      
  networkLogo: { type: String, default: '' },  

  // 【新增】喜爱置顶标记
  isFavorite: { type: Boolean, default: false },

  tmdbId: { type: Number, min: 1 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ShowSchema.index({ userId: 1, updatedAt: -1 });
ShowSchema.index({ userId: 1, tmdbId: 1 });

module.exports = mongoose.model('Show', ShowSchema);
