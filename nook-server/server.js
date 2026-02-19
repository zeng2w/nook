const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const tmdbRoutes = require('./routes/tmdb');

// 中间件
app.use(cors({
  origin: '*', // 允许所有域名访问 (最简单，适合个人项目)
  credentials: true
}));
app.use(express.json());

// === 核心修改：Serverless 环境下的数据库连接逻辑 ===
const uri = process.env.MONGO_URI;

// 用一个变量来记录数据库连接状态 (0: disconnected, 1: connected, 2: connecting, 3: disconnecting)
let isConnected = 0;

const connectDB = async () => {
  // 如果已经连接上，就直接返回，不再重复连接
  if (isConnected === 1) {
    return;
  }
  
  // 如果没有连接，则发起连接
  try {
    const db = await mongoose.connect(uri);
    isConnected = db.connections[0].readyState; // 更新状态为已连接
    console.log("✅ MongoDB database connection established successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
};

// 增加一个全局中间件：确保任何请求进来之前，数据库都是连接状态
app.use(async (req, res, next) => {
  await connectDB();
  next();
});
// =================================================

// === 路由 ===
// 凡是访问 /api/auth/... 的请求，都交给 routes/auth.js 处理
app.use('/api/auth', require('./routes/auth')); 
app.use('/api/history', require('./routes/history'));
app.use('/api/shows', require('./routes/shows'));
app.use('/api/tmdb', tmdbRoutes);
app.use('/api/tvlog', require('./routes/tvlog'));

// 只有在本地开发时才启动监听
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
}

// 关键：导出 app 供 Vercel 使用
module.exports = app;