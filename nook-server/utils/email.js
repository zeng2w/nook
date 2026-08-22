const normalizeEmail = (value) => (
  typeof value === 'string' ? value.trim().toLowerCase() : ''
);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildEmailLookup = (email) => ({
  email: {
    $regex: `^${escapeRegExp(email)}$`,
    $options: 'i'
  }
});

module.exports = { buildEmailLookup, normalizeEmail };
