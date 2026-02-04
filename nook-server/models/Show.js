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
  
  // 更新规则
  updateFrequency: { 
    type: String, 
    enum: ['weekly', 'daily', 'monthly', 'ended', 'unknown'], 
    default: 'unknown' 
  },
  updateDays: { type: [Number], default: [] }, 
  updateCount: { type: Number, default: 1 },
  
  lastAirDate: { type: Date, default: Date.now },
  estimatedFinishDate: { type: Date },
  
  // 媒体信息
  posterUrl: { type: String, default: '' },
  
  // 【新增】播放平台信息
  network: { type: String, default: '' },      // 例如: "Netflix", "Bilibili"
  networkLogo: { type: String, default: '' },  // 例如: "https://image.tmdb.org/.../logo.png"

  tmdbId: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Show', ShowSchema);