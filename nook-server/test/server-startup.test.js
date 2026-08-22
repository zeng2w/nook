const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const request = require('supertest');

test('serverless app loads even when the production session secret is invalid', () => {
  const serverDirectory = path.resolve(__dirname, '..');
  const result = spawnSync(process.execPath, ['-e', "require('./server')"], {
    cwd: serverDirectory,
    encoding: 'utf8',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      SESSION_SECRET: 'too-short'
    }
  });

  assert.equal(result.status, 0, result.stderr);
});

test('misconfigured production login returns a clear 503 response', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.SESSION_SECRET;

  try {
    process.env.NODE_ENV = 'production';
    process.env.SESSION_SECRET = 'too-short';
    const app = require('../server');
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'password' });

    assert.equal(response.status, 503);
    assert.equal(response.body.code, 'SESSION_CONFIGURATION_ERROR');
    assert.match(response.body.error, /SESSION_SECRET/);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSecret;
  }
});
