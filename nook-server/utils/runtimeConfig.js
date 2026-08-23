const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const isRegistrationAllowed = () => {
  if (process.env.NODE_ENV !== 'production') return true;
  return TRUE_VALUES.has(String(process.env.ALLOW_REGISTRATION || '').trim().toLowerCase());
};

module.exports = { isRegistrationAllowed };
