const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';
const tmdbRoutes = require('./routes/tmdb');
const { requireAuth, validateSessionConfiguration } = require('./middleware/auth');
const logger = require('./utils/logger');

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
app.use((req, res, next) => {
  const startedAt = Date.now();
  const requestId = randomUUID();
  res.setHeader('X-Request-Id', requestId);
  res.on('finish', () => {
    logger.info('http_request', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    });
  });
  next();
});

// === 核心修改：Serverless 环境下的数据库连接逻辑 ===
const uri = process.env.MONGO_URI;

let connectPromise = null;

const connectDB = async () => {
  if (!uri) throw new Error('MONGO_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectPromise) {
    connectPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
      .then(connection => {
        logger.info('database_connected', { database: connection.connection.name });
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
    logger.error('database_connection_failed', { error: err });
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
app.get('/api/health', async (req, res) => {
  try {
    const connection = await connectDB();
    await connection.connection.db.admin().ping();
    res.json({
      status: 'ok',
      database: 'connected',
      tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('health_check_failed', { error: err });
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/tmdb', requireAuth, tmdbRoutes);
app.use('/api/auth', authDatabaseRequired, require('./routes/auth'));
app.use('/api/history', requireAuth, databaseRequired, require('./routes/history'));
app.use('/api/shows', requireAuth, databaseRequired, require('./routes/shows'));
app.use('/api/tvlog', requireAuth, databaseRequired, require('./routes/tvlog'));

// 只有在本地开发时才启动监听
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, HOST, error => {
    if (error) {
      logger.error('server_start_failed', { host: HOST, port: Number(PORT), error });
      process.exitCode = 1;
      return;
    }
    logger.info('server_started', { host: HOST, port: Number(PORT) });
  });
}

// 关键：导出 app 供 Vercel 使用
module.exports = app;
