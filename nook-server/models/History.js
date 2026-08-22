const mongoose = require('mongoose');

const HistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId, // 这是一个特殊的 ID 类型
    ref: 'User', // 关联到 User 模型
    required: true
  },
  count: {
    type: Number,
    required: true,
    min: 0,
    validate: Number.isInteger
  },
  duration: {
    type: Number, // 单位：分钟
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  }
});

HistorySchema.index({ userId: 1, date: -1 });

module.exports = mongoose.model('History', HistorySchema);
