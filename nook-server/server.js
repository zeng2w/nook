const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const tmdbRoutes = require('./routes/tmdb');

// 中间件
// app.use(cors());
app.use(cors({
  origin: '*', // 允许所有域名访问 (最简单，适合个人项目)
  credentials: true
}));
app.use(express.json());

// 连接数据库
const uri = process.env.MONGO_URI;
mongoose.connect(uri)
  .then(() => console.log("✅ MongoDB database connection established successfully"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// === 路由 (新增部分) ===
// 凡是访问 /api/auth/... 的请求，都交给 routes/auth.js 处理
app.use('/api/auth', require('./routes/auth')); 
app.use('/api/history', require('./routes/history'));
app.use('/api/shows', require('./routes/shows'));
app.use('/api/tmdb', tmdbRoutes);

// 只有在本地开发时才启动监听
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
}

// 关键：导出 app 供 Vercel 使用
module.exports = app;