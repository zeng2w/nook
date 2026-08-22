const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { clearSession, issueSession } = require('../middleware/auth');
const { buildEmailLookup, normalizeEmail } = require('../utils/email');

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  email: user.email
});

// === 1. 注册接口 (修改版：注册即登录) ===
router.post('/register', async (req, res) => {
  const body = req.body || {};
  const username = typeof body.username === 'string' ? body.username.trim() : '';
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (username.length < 2 || username.length > 50) {
    return res.status(400).json({ msg: 'Username must contain 2 to 50 characters' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ msg: 'A valid email is required' });
  }
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ msg: 'Password must contain 8 to 72 bytes' });
  }

  try {
    // Older records may contain uppercase characters because the original schema
    // did not normalize email addresses. Keep registration duplicate checks
    // compatible with those records.
    let user = await User.findOne(buildEmailLookup(email));
    if (user) {
      return res.status(409).json({ msg: 'User already exists' });
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
    console.error(err.message);
    if (err.code === 11000) {
      return res.status(409).json({ msg: 'User already exists' });
    }
    res.status(500).send('Server Error');
  }
});

// === 2. 登录接口 (保持不变) ===
router.post('/login', async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ msg: 'Email and password are required' });
  }

  try {
    // Match legacy mixed-case addresses without changing existing user data.
    const user = await User.findOne(buildEmailLookup(email));
    if (!user) return res.status(401).json({ msg: 'Invalid Credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ msg: 'Invalid Credentials' });

    issueSession(res, user.id);
    res.json({
      user: serializeUser(user)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.get('/me', async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      clearSession(res);
      return res.status(401).json({ msg: 'Authentication required' });
    }
    res.json({ user: serializeUser(user) });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.status(204).end();
});

module.exports = router;
