const logger = require('../utils/logger');

const notFoundHandler = (req, res) => {
  res.status(404).json({ code: 'NOT_FOUND', error: 'API route not found' });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let status = Number.isInteger(err.status) ? err.status : 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Server Error';

  if (err.name === 'ValidationError') {
    status = 400;
    code = 'VALIDATION_ERROR';
    message = Object.values(err.errors)[0]?.message || 'Invalid request data';
  } else if (err.name === 'CastError') {
    status = 400;
    code = 'INVALID_VALUE';
    message = `${err.path || 'value'} is invalid`;
  } else if (err.code === 11000) {
    status = 409;
    code = 'DUPLICATE_RECORD';
    message = 'A matching record already exists';
  }

  if (status >= 500) {
    logger.error('request_failed', {
      requestId: res.getHeader('X-Request-Id'),
      method: req.method,
      path: req.path,
      error: err
    });
    message = 'Server Error';
  } else {
    logger.warn('request_rejected', {
      requestId: res.getHeader('X-Request-Id'),
      method: req.method,
      path: req.path,
      status,
      code
    });
  }

  res.status(status).json({ code, error: message });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
