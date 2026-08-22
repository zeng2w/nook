const serializeError = error => ({
  name: error?.name,
  message: error?.message,
  code: error?.code
});

const write = (level, event, metadata = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...metadata
  };

  const output = JSON.stringify(entry, (key, value) => (
    value instanceof Error ? serializeError(value) : value
  ));

  if (level === 'error') console.error(output);
  else if (level === 'warn') console.warn(output);
  else console.log(output);
};

module.exports = {
  error: (event, metadata) => write('error', event, metadata),
  info: (event, metadata) => write('info', event, metadata),
  warn: (event, metadata) => write('warn', event, metadata)
};
