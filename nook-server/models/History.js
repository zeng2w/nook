const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // 这是一个特殊的 ID 类型
    ref: 'User', // 关联到 User 模型
    required: true
  },
  count: {
    type: Number,
    required: true
  },
  duration: {
    type: Number, // 单位：分钟
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('History', HistorySchema);