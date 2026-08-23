const getClientKey = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const forwardedIp = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : '';
  return forwardedIp || req.ip || req.socket?.remoteAddress || 'unknown';
};

const createRateLimit = ({ windowMs, max, code = 'RATE_LIMITED' }) => {
  const buckets = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = getClientKey(req);
    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    const remaining = Math.max(0, max - bucket.count);
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', Math.ceil(bucket.resetAt / 1000));

    if (buckets.size > 5000) {
      for (const [bucketKey, value] of buckets) {
        if (value.resetAt <= now) buckets.delete(bucketKey);
      }
      while (buckets.size > 5000) {
        buckets.delete(buckets.keys().next().value);
      }
    }

    if (bucket.count > max) {
      res.setHeader('Retry-After', Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({
        code,
        error: 'Too many requests. Please wait and try again.'
      });
    }

    next();
  };
};

module.exports = { createRateLimit };
