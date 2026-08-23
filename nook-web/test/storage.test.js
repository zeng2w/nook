import test from 'node:test'
import assert from 'node:assert/strict'

import { readJsonStorage, writeJsonStorage } from '../src/utils/storage.js'

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial))
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    value: key => values.get(key),
  }
}

test('invalid or unexpected stored JSON safely falls back', () => {
  const storage = createStorage({ broken: '{not-json', wrong: '{"value":1}' })

  assert.deepEqual(readJsonStorage(storage, 'broken', []), [])
  assert.deepEqual(readJsonStorage(storage, 'wrong', [], Array.isArray), [])
  assert.deepEqual(readJsonStorage(storage, 'missing', { ok: true }), { ok: true })
})

test('JSON storage writes values and handles quota failures', () => {
  const storage = createStorage()
  assert.equal(writeJsonStorage(storage, 'settings', { count: 2 }), true)
  assert.equal(storage.value('settings'), '{"count":2}')

  const failingStorage = { setItem() { throw new Error('quota exceeded') } }
  assert.equal(writeJsonStorage(failingStorage, 'settings', {}), false)
})
