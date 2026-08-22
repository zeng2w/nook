const axios = require('axios');

const DEFAULT_TIMEOUT_MS = 12000;
const MAX_TIMEOUT_MS = 60000;

const getTimeout = () => {
  const configured = Number.parseInt(process.env.TMDB_TIMEOUT_MS, 10);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(configured, MAX_TIMEOUT_MS);
};

const tmdbClient = axios.create({
  baseURL: 'https://api.themoviedb.org/3',
  timeout: getTimeout()
});

const tmdbGet = (path, config = {}) => {
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) {
    const error = new Error('TMDB_API_KEY is not configured');
    error.code = 'TMDB_NOT_CONFIGURED';
    return Promise.reject(error);
  }

  return tmdbClient.get(path, {
    ...config,
    params: {
      ...(config.params || {}),
      api_key: apiKey
    }
  });
};

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
  console.error(`[TMDB:${operation}] ${details.code}: ${error.message}`);

  if (details.retryAfter) res.setHeader('Retry-After', details.retryAfter);
  return res.status(details.status).json({
    code: details.code,
    error: details.message
  });
};

module.exports = {
  classifyTmdbError,
  getTimeout,
  sendTmdbError,
  tmdbGet
};
