const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 50
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now // 默认记录注册时间
  }
});

UserSchema.index(
  { email: 1 },
  {
    name: 'email_unique_case_insensitive',
    unique: true,
    collation: { locale: 'en', strength: 2 }
  }
);

module.exports = mongoose.model('User', UserSchema);
