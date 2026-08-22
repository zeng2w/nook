const test = require('node:test');
const assert = require('node:assert/strict');

const { buildEmailLookup, normalizeEmail } = require('../utils/email');

test('email normalization trims and lowercases legacy input', () => {
  assert.equal(normalizeEmail('  Old.User@Example.COM  '), 'old.user@example.com');
  assert.equal(normalizeEmail(null), '');
});

test('email lookup is exact, case-insensitive, and escapes regex characters', () => {
  assert.deepEqual(buildEmailLookup('old.user+tv@example.com'), {
    email: {
      $regex: '^old\\.user\\+tv@example\\.com$',
      $options: 'i'
    }
  });
});
