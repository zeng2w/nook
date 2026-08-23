const isValidTimeZone = (value) => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 100) return false;

  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value.trim() }).format();
    return true;
  } catch {
    return false;
  }
};

const getCalendarDateKeyInTimeZone = (value, timeZone = 'UTC') => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const partMap = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${partMap.year}-${partMap.month}-${partMap.day}`;
};

module.exports = { getCalendarDateKeyInTimeZone, isValidTimeZone };
