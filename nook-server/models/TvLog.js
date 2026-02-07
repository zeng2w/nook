// models/TvLog.js
const mongoose = require('mongoose');

const TvLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // 关联具体的剧集 (可选，方便未来统计某部剧看了多少次)
  showId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Show',
    required: false
  },
  // 剧集名称 (可选，方便直接查看日志)
  showTitle: {
    type: String,
    required: false
  },
  // 变动集数 (例如 +1 或 -1)
  count: {
    type: Number,
    required: true
  },
  // 记录日期
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('TvLog', TvLogSchema);