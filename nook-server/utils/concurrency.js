const DEFAULT_SYNC_CONCURRENCY = 3;
const MAX_SYNC_CONCURRENCY = 5;

const getSyncConcurrency = () => {
  const configured = Number.parseInt(process.env.TMDB_SYNC_CONCURRENCY, 10);
  if (!Number.isFinite(configured) || configured <= 0) return DEFAULT_SYNC_CONCURRENCY;
  return Math.min(configured, MAX_SYNC_CONCURRENCY);
};

const mapWithConcurrency = async (items, limit, worker) => {
  if (!Array.isArray(items) || items.length === 0) return [];

  const concurrency = Math.max(1, Math.min(Math.floor(limit) || 1, items.length));
  const results = new Array(items.length);
  let nextIndex = 0;

  const runWorker = async () => {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await worker(items[index], index);
    }
  };

  await Promise.all(Array.from({ length: concurrency }, runWorker));
  return results;
};

module.exports = { getSyncConcurrency, mapWithConcurrency };
