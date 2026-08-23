const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { clearSession, issueSession } = require('../middleware/auth');
const { buildEmailLookup, normalizeEmail } = require('../utils/email');
const { isRegistrationAllowed } = require('../utils/runtimeConfig');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email
});

// === 1. 注册接口 (修改版：注册即登录) ===
router.post('/register', async (req, res, next) => {
  if (!isRegistrationAllowed()) {
    return res.status(403).json({
      code: 'REGISTRATION_DISABLED',
      error: 'Registration is disabled for this deployment'
    });
  }

  const body = req.body || {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (username.length < 2 || username.length > 50) {
    return res.status(400).json({ code: 'INVALID_USERNAME', error: 'Username must contain 2 to 50 characters' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ code: 'INVALID_EMAIL', error: 'A valid email is required' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ code: 'INVALID_PASSWORD', error: 'Password must contain 8 to 72 bytes' });
  }

  try {
    // Older records may contain uppercase characters because the original schema
    // did not normalize email addresses. Keep registration duplicate checks
    // compatible with those records.
    let user = await User.findOne(buildEmailLookup(email));
    if (user) {
      return res.status(409).json({ code: 'USER_EXISTS', error: 'User already exists' });
    }
    user = new User({ username, email, password });
    
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    
    await user.save();

    issueSession(res, user.id);
    res.status(201).json({
      user: serializeUser(user)
    });

  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ code: 'USER_EXISTS', error: 'User already exists' });
    }
    next(err);
  }
});

// === 2. 登录接口 (保持不变) ===
router.post('/login', async (req, res, next) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ code: 'INVALID_CREDENTIALS', error: 'Email and password are required' });
  }

  try {
    // Match legacy mixed-case addresses without changing existing user data.
    const user = await User.findOne(buildEmailLookup(email));
    if (!user) return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ code: 'INVALID_CREDENTIALS', error: 'Invalid credentials' });

    issueSession(res, user.id);
    res.json({
      user: serializeUser(user)
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      clearSession(res);
      return res.status(401).json({ code: 'AUTHENTICATION_REQUIRED', error: 'Authentication required' });
    }
    res.json({ user: serializeUser(user) });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

module.exports = router;
