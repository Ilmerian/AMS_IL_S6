// src/lib/queryCache.js
const cache = new Map()
const CACHE_TTL = 30000

export const queryCache = {
  get(key) {
    const cached = cache.get(key)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data
    }
    return null
  },
  
  set(key, data) {
    cache.set(key, { timestamp: Date.now(), data })
    // Clearing old records
    if (cache.size > 100) {
      const keys = Array.from(cache.keys())
      for (let i = 0; i < 20; i++) {
        cache.delete(keys[i])
      }
    }
  },
  
  invalidate(pattern) {
    const keys = Array.from(cache.keys())
    keys.forEach(key => {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    })
  }
}