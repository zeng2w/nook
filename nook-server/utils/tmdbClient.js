const axios = require('axios');
const logger = require('./logger');

const DEFAULT_TIMEOUT_MS = 12000;
const MAX_TIMEOUT_MS = 60000;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

const getTimeout = () => {
  const configured = Number.parseInt(process.env.TMDB_TIMEOUT_MS, 10);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(configured, MAX_TIMEOUT_MS);
};

const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: getTimeout()
});

const getCacheTtl = () => {
  const configured = Number.parseInt(process.env.TMDB_CACHE_TTL_MS, 10);
  if (!Number.isFinite(configured) || configured < 0) return DEFAULT_CACHE_TTL_MS;
  return Math.min(configured, MAX_CACHE_TTL_MS);
};

const createTmdbGet = (client, options = {}) => {
  const cache = new Map();
  const inFlight = new Map();
  const now = options.now || Date.now;
  const maxEntries = options.maxEntries || MAX_CACHE_ENTRIES;

  const getCacheKey = (path, params) => JSON.stringify([
    path,
    Object.entries(params || {}).sort(([left], [right]) => left.localeCompare(right))
  ]);

  const pruneCache = () => {
    const currentTime = now();
    for (const [key, entry] of cache) {
      if (entry.expiresAt <= currentTime) cache.delete(key);
    }
    while (cache.size >= maxEntries) cache.delete(cache.keys().next().value);
  };

  const get = async (path, config = {}) => {
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      const error = new Error('TMDB_API_KEY is not configured');
      error.code = 'TMDB_NOT_CONFIGURED';
      throw error;
    }

    const { cacheTtlMs = 0, ...requestConfig } = config;
    const params = requestConfig.params || {};
    const cacheKey = cacheTtlMs > 0 ? getCacheKey(path, params) : null;
    const cached = cacheKey ? cache.get(cacheKey) : null;

    if (cached && cached.expiresAt > now()) return cached.response;
    if (cacheKey && inFlight.has(cacheKey)) return inFlight.get(cacheKey);

    const request = client.get(path, {
      ...requestConfig,
      params: { ...params, api_key: apiKey }
    }).then(response => {
      if (cacheKey) {
        pruneCache();
        cache.set(cacheKey, {
          expiresAt: now() + cacheTtlMs,
          response: {
            data: response.data,
            status: response.status,
            headers: response.headers
          }
        });
      }
      return response;
    }).finally(() => {
      if (cacheKey) inFlight.delete(cacheKey);
    });

    if (cacheKey) inFlight.set(cacheKey, request);
    return request;
  };

  get.clearCache = () => {
    cache.clear();
    inFlight.clear();
  };

  return get;
};

const tmdbGet = createTmdbGet(tmdbClient);

const classifyTmdbError = (error) => {
  const upstreamStatus = error.response?.status;

  if (error.code === 'TMDB_NOT_CONFIGURED' || upstreamStatus === 401) {
    return {
      status: 502,
      code: 'TMDB_CONFIGURATION_ERROR',
      message: 'TMDB 服务配置无效，请检查 API Key。'
    };
  }

  if (upstreamStatus === 429) {
    return {
      status: 503,
      code: 'TMDB_RATE_LIMITED',
      message: 'TMDB 请求过于频繁，请稍后重试。',
      retryAfter: error.response?.headers?.['retry-after']
    };
  }

  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return {
      status: 504,
      code: 'TMDB_TIMEOUT',
      message: 'TMDB 请求超时，请检查网络或代理设置。'
    };
  }

  return {
    status: 502,
    code: 'TMDB_UNAVAILABLE',
    message: 'TMDB 服务暂时不可用，请稍后重试。'
  };
};

const sendTmdbError = (res, error, operation) => {
  const details = classifyTmdbError(error);
  logger.warn('tmdb_request_failed', {
    operation,
    code: details.code,
    upstreamStatus: error.response?.status,
    error
  });

  if (details.retryAfter) res.setHeader('Retry-After', details.retryAfter);
  return res.status(details.status).json({
    code: details.code,
    error: details.message
  });
};

module.exports = {
  classifyTmdbError,
  createTmdbGet,
  getCacheTtl,
  getTimeout,
  sendTmdbError,
  tmdbGet
};
