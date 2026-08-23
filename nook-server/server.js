const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { randomUUID } = require('node:crypto');
require('dotenv').config({ quiet: true });

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '127.0.0.1';
const tmdbRoutes = require('./routes/tmdb');
const {
  isSessionConfigurationValid,
  requireAuth,
  requireSessionConfiguration
} = require('./middleware/auth');
const logger = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/error');
const { createRateLimit } = require('./middleware/rateLimit');
const { isRegistrationAllowed } = require('./utils/runtimeConfig');

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
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

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

const configuredPoolSize = Number.parseInt(process.env.MONGO_MAX_POOL_SIZE || '5', 10);
const maxPoolSize = Number.isInteger(configuredPoolSize) && configuredPoolSize > 0
  ? Math.min(configuredPoolSize, 20)
  : 5;

const connectDB = async () => {
  if (!uri) throw new Error('MONGO_URI is not configured');
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connectPromise) {
    connectPromise = mongoose.connect(uri, { serverSelectionTimeoutMS: 8000, maxPoolSize })
      .then(connection => {
        logger.info('database_connected', { database: connection.connection.name });
        return connection;
      });
  }

  try {
    return await connectPromise;
  } finally {
    // 只在实际连接中的请求之间共享 Promise。连接成功后依赖 readyState，
    // 完全断线时则允许热实例重新调用 mongoose.connect()。
    connectPromise = null;
  }
};

const databaseRequired = async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    logger.error('database_connection_failed', { error: err });
    res.status(503).json({
      code: 'DATABASE_UNAVAILABLE',
      error: 'Database is unavailable. Check the server database connection and try again.'
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

const authSessionConfigurationRequired = (req, res, next) => {
  // 即使生产环境配置不完整，也允许用户清除旧 Cookie。
  if (req.path === '/logout') return next();
  return requireSessionConfiguration(req, res, next);
};
// =================================================

const loginRateLimit = createRateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
const registrationRateLimit = createRateLimit({ windowMs: 60 * 60 * 1000, max: 5 });
const tmdbRateLimit = createRateLimit({ windowMs: 60 * 1000, max: 120 });

// === 路由 ===
app.get('/api/config', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ registrationEnabled: isRegistrationAllowed() });
});

app.get('/api/health', async (req, res) => {
  const sessionConfigured = isSessionConfigurationValid();
  try {
    const connection = await connectDB();
    await connection.connection.db.admin().ping();
    const payload = {
      status: sessionConfigured ? 'ok' : 'degraded',
      database: 'connected',
      session: sessionConfigured ? 'configured' : 'misconfigured',
      tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
    res.status(sessionConfigured ? 200 : 503).json(payload);
  } catch (err) {
    logger.error('health_check_failed', { error: err });
    res.status(503).json({
      status: 'degraded',
      database: 'unavailable',
      session: sessionConfigured ? 'configured' : 'misconfigured',
      tmdbConfigured: Boolean(process.env.TMDB_API_KEY),
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/tmdb', tmdbRateLimit, requireSessionConfiguration, requireAuth, tmdbRoutes);
app.use('/api/auth/login', loginRateLimit);
app.use('/api/auth/register', registrationRateLimit);
app.use('/api/auth', authSessionConfigurationRequired, authDatabaseRequired, require('./routes/auth'));
app.use('/api/history', requireSessionConfiguration, requireAuth, databaseRequired, require('./routes/history'));
app.use('/api/shows', requireSessionConfiguration, requireAuth, databaseRequired, require('./routes/shows'));
app.use('/api/tvlog', requireSessionConfiguration, requireAuth, databaseRequired, require('./routes/tvlog'));
app.use('/api', notFoundHandler);
app.use(errorHandler);

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
