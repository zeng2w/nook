const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// 中间件
app.use(cors());
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

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port: ${PORT}`);
});