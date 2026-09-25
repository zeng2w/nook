import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createProgressQueue } from '../src/utils/progressQueue.js';

const deferred = () => { let resolve, reject; const promise = new Promise((res, rej) => { resolve = res; reject = rej; }); return { promise, resolve, reject }; };

test('serializes rapid updates and never overwrites a newer target with an older response', async () => {
  const first = deferred(), second = deferred();
  const requests = [], savedTargets = [];
  const queue = createProgressQueue({ delay: 60000, save: (id, target) => { requests.push([id, target]); return requests.length === 1 ? first.promise : second.promise; }, onChange() {}, onSaved: (_id, _result, target) => savedTargets.push(target) });
  queue.set('a', 3);
  const running = queue.flush('a');
  queue.set('a', 6);
  void queue.flush('a');
  assert.deepEqual(requests, [['a', 3]]);
  first.resolve({ watchedEpisodes: 3 });
  await new Promise(resolve => setTimeout(resolve, 0));
  assert.deepEqual(requests, [['a', 3], ['a', 6]]);
  assert.deepEqual(savedTargets, [6]);
  second.resolve({ watchedEpisodes: 6 });
  await running;
  assert.deepEqual(savedTargets, [6, 6]);
});

test('retains the latest unsaved target and retries it after failure', async () => {
  const pending = deferred();
  const requests = [], states = [];
  const queue = createProgressQueue({ delay: 60000, save: (_id, target) => { requests.push(target); return requests.length === 1 ? pending.promise : Promise.resolve({ watchedEpisodes: target }); }, onChange: (_id, state) => states.push(state), onSaved() {} });
  queue.set('a', 7);
  const running = queue.flush('a');
  queue.set('a', 9);
  pending.reject(new Error('offline'));
  await running;
  assert.equal(states.at(-1).target, 9);
  assert.equal(states.at(-1).state, 'error');
  await queue.flush('a');
  assert.deepEqual(requests, [7, 9]);
  assert.equal(states.at(-1).state, 'saved');
});

test('allows unrelated shows to save independently and flushes pending input', async () => {
  const requests = [];
  const queue = createProgressQueue({ delay: 60000, save: async (id, target) => { requests.push([id, target]); return {}; }, onChange() {}, onSaved() {} });
  queue.set('a', 0); queue.set('b', 12);
  await queue.flushAll();
  assert.deepEqual(requests, [['a', 0], ['b', 12]]);
});


test('restores pending corrections without sending until retry and clears correction after success', async () => {
  const requests = [], states = [];
  const queue = createProgressQueue({ delay: 60000, save: async (id, target, correction) => { requests.push({ id, target, correction }); return {}; }, onChange: (_id, state) => states.push(state), onSaved() {} });
  queue.restore('a', 21, { totalEpisodes: 25 });
  await queue.flushAll();
  assert.equal(requests.length, 0);
  assert.equal(states.at(-1).state, 'error');
  await queue.flush('a');
  assert.deepEqual(requests[0], { id: 'a', target: 21, correction: { totalEpisodes: 25 } });
  queue.set('a', 22);
  await queue.flushAll();
  assert.equal(requests[1].correction, undefined);
});
