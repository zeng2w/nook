const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const tmdbRoutes = require('./routes/tmdb');
const { requireAuth, validateSessionConfiguration } = require('./middleware/auth');

validateSessionConfiguration();

// 中间件
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

if (allowedOrigins.length > 0) {
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
    credentials: true
  }));
}

app.use(express.json({ limit: '1mb' }));

// === 核心修改：Serverless 环境下的数据库连接逻辑 ===
const uri = process.env.MONGO_URI;

let connectPromise = null;

const connectDB = async () => {
  if (!uri) throw new Error('MONGO_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectPromise) {
    connectPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then(connection => {
        console.log('✅ MongoDB database connection established successfully');
        return connection;
      })
      .catch(err => {
        connectPromise = null;
        throw err;
      });
  }

  return connectPromise;
};

const databaseRequired = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      msg: 'Database is unavailable. Check the server database connection and try again.'
    });
  }
};

const authDatabaseRequired = (req, res, next) => {
  if (req.path === '/logout') return next();
  if (req.path === '/me') {
    return requireAuth(req, res, () => databaseRequired(req, res, next));
  }
  return databaseRequired(req, res, next);
};
// =================================================

// === 路由 ===
app.use('/api/tmdb', requireAuth, tmdbRoutes);
app.use('/api/auth', authDatabaseRequired, require('./routes/auth'));
app.use('/api/history', requireAuth, databaseRequired, require('./routes/history'));
app.use('/api/shows', requireAuth, databaseRequired, require('./routes/shows'));
app.use('/api/tvlog', requireAuth, databaseRequired, require('./routes/tvlog'));

// 只有在本地开发时才启动监听
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`🚀 Server started on port ${PORT}`));
}

// 关键：导出 app 供 Vercel 使用
module.exports = app;
