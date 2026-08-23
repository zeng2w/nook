export const readJsonStorage = (storage, key, fallback, validator = () => true) => {
  if (!storage || !key) return fallback

  try {
    const raw = storage.getItem(key)
    if (raw === null) return fallback
    const parsed = JSON.parse(raw)
    return validator(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export const writeJsonStorage = (storage, key, value) => {
  if (!storage || !key) return false

  try {
    storage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    return false
  }
}
