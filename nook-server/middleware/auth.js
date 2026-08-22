const crypto = require('crypto');

const COOKIE_NAME = 'nook_session';
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const DEV_SESSION_SECRET = 'nook-development-secret-change-before-production';

const getSessionSecret = () => {
  const secret = process.env.SESSION_SECRET;

  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret.length < 32) {
      throw new Error('SESSION_SECRET must contain at least 32 characters in production');
    }
    return secret;
  }

  return secret || DEV_SESSION_SECRET;
};

const encodePayload = (payload) => {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
};

const signPayload = (encodedPayload) => {
  return crypto
    .createHmac('sha256', getSessionSecret())
    .update(encodedPayload)
    .digest('base64url');
};

const createSessionToken = (userId, now = Date.now()) => {
  const payload = encodePayload({
    sub: String(userId),
    exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS,
    v: 1
  });

  return `${payload}.${signPayload(payload)}`;
};

const verifySessionToken = (token, now = Date.now()) => {
  if (typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;
  const expected = Buffer.from(signPayload(payload));
  const received = Buffer.from(signature);

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const nowInSeconds = Math.floor(now / 1000);

    if (
      decoded.v !== 1 ||
      typeof decoded.sub !== 'string' ||
      !/^[a-f\d]{24}$/i.test(decoded.sub) ||
      !Number.isFinite(decoded.exp) ||
      decoded.exp <= nowInSeconds
    ) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

const getCookie = (req, name) => {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    if (key === name) return part.slice(separator + 1).trim();
  }

  return null;
};

const sessionCookie = (value, maxAge) => {
  const attributes = [
    `${COOKIE_NAME}=${value}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    `Max-Age=${maxAge}`
  ];

  if (process.env.NODE_ENV === 'production') attributes.push('Secure');
  return attributes.join('; ');
};

const issueSession = (res, userId) => {
  res.setHeader(
    'Set-Cookie',
    sessionCookie(createSessionToken(userId), SESSION_TTL_SECONDS)
  );
};

const clearSession = (res) => {
  res.setHeader('Set-Cookie', sessionCookie('', 0));
};

const validateSessionConfiguration = () => {
  getSessionSecret();
};

const requireAuth = (req, res, next) => {
  const token = getCookie(req, COOKIE_NAME);
  const session = verifySessionToken(token);

  if (!session) {
    return res.status(401).json({
      code: 'AUTHENTICATION_REQUIRED',
      error: 'Authentication required'
    });
  }

  req.user = { id: session.sub };
  next();
};

module.exports = {
  clearSession,
  createSessionToken,
  issueSession,
  requireAuth,
  validateSessionConfiguration,
  verifySessionToken
};
