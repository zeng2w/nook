// Absolute targets make retries idempotent. Each show has only one request in flight.
export function createProgressQueue({ save, onChange, onSaved, delay = 500 }) {
  const entries = new Map();
  const publish = entry => onChange(entry.id, {
    target: entry.target, state: entry.state, error: entry.error, correction: entry.correction,
  });
  const flush = async id => {
    const entry = entries.get(id);
    if (!entry) return;
    clearTimeout(entry.timer);
    if (entry.running) return entry.running;
    const target = entry.target;
    const revision = entry.revision;
    const correction = entry.correction;
    entry.state = 'saving';
    publish(entry);
    entry.running = (async () => {
      try {
        const result = await save(id, target, correction);
        entry.state = entry.revision === revision ? 'saved' : 'saving';
        entry.error = '';
        onSaved(id, result, entry.target);
      } catch (error) {
        entry.state = 'error';
        entry.error = error;
      } finally {
        entry.running = null;
        publish(entry);
      }
      if (entry.state !== 'error' && entry.revision !== revision) await flush(id);
    })();
    return entry.running;
  };
  return {
    restore(id, target, correction) {
      const entry = { id, target, correction, revision: 0, state: 'error', error: new Error('进度未同步，请重试') };
      entries.set(id, entry);
      publish(entry);
    },
    set(id, target, correction) {
      const entry = entries.get(id) || { id, revision: 0 };
      if (entry.state === 'saved') entry.correction = undefined;
      if (correction) entry.correction = correction;
      Object.assign(entry, { target, revision: entry.revision + 1, state: 'saving', error: '' });
      entries.set(id, entry);
      clearTimeout(entry.timer);
      publish(entry);
      entry.timer = setTimeout(() => { void flush(id); }, delay);
    },
    flush,
    flushAll() {
      return Promise.all([...entries.values()].filter(entry => entry.state === 'saving').map(entry => flush(entry.id)));
    },
  };
}
