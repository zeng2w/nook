const mongoose = require('mongoose');

const ShowSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  category: { type: String, enum: ['tv', 'anime', 'movie', 'variety'], required: true },
  status: { type: String, enum: ['wish', 'watching', 'watched', 'dropped'], default: 'watching' },
  
  // 进度数据
  totalEpisodes: { type: Number, default: 0 },
  airedEpisodes: { type: Number, default: 0 },
  watchedEpisodes: { type: Number, default: 0 },
  
  // --- 核心升级：灵活的更新规则 ---
  updateFrequency: { 
    type: String, 
    enum: ['weekly', 'daily', 'monthly', 'ended', 'unknown'], 
    default: 'unknown' 
  },
  // 每周哪些天更新 (0=周日, 1=周一 ... 6=周六)
  updateDays: { 
    type: [Number], 
    default: [] 
  }, 
  // 每次更新几集
  updateCount: { 
    type: Number, 
    default: 1 
  },
  
  lastAirDate: { type: Date, default: Date.now },
  estimatedFinishDate: { type: Date },
  
  posterUrl: { type: String, default: '' },
  tmdbId: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Show', ShowSchema);