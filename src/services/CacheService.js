// src/services/CacheService.js

/**
 * Service de cache côté client
 */

class CacheService {
  constructor(namespace = 'app') {
    this.namespace = namespace
    this.memoryCache = new Map()
    this.pendingRequests = new Map()
    this.defaultTTL = 120000
    this.longTTL = 180000
  }

  setMemory(key, value, ttl = 60000) {
    const cacheKey = `${this.namespace}:${key}`
    this.memoryCache.set(cacheKey, {
      value,
      expiry: Date.now() + ttl
    })
  }

  getMemory(key) {
    const cacheKey = `${this.namespace}:${key}`
    const cached = this.memoryCache.get(cacheKey)
    if (!cached) return null

    if (Date.now() > cached.expiry) {
      this.memoryCache.delete(cacheKey)
      return null
    }

    return cached.value
  }

  setSession(key, value, ttl = 300000) {
    try {
      const cacheKey = `${this.namespace}:${key}`
      const data = {
        value,
        expiry: Date.now() + ttl
      }
      sessionStorage.setItem(cacheKey, JSON.stringify(data))
    } catch (e) {
      console.warn('Session storage failed:', e)
    }
  }

  getSession(key) {
    try {
      const cacheKey = `${this.namespace}:${key}`
      const cached = sessionStorage.getItem(cacheKey)
      if (!cached) return null

      const parsed = JSON.parse(cached)
      if (Date.now() > parsed.expiry) {
        sessionStorage.removeItem(cacheKey)
        return null
      }

      return parsed.value
    } catch (e) {
      console.warn('Session storage read failed:', e)
      return null
    }
  }

  setPersistent(key, value, ttl = 600000) {
    const cacheKey = `${this.namespace}:persistent:${key}`;
    try {
      const data = {
        value,
        expiry: Date.now() + ttl,
        timestamp: Date.now()
      };
      localStorage.setItem(cacheKey, JSON.stringify(data));
      console.log(`[CacheService] Persistent cache SET for key: ${key}`);
    } catch (e) {
      console.warn('LocalStorage failed:', e);
      this.setMemory(`persistent_${key}`, value, ttl);
    }
  }

  getPersistent(key) {
    const cacheKey = `${this.namespace}:persistent:${key}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (!cached) {
        console.log(`[CacheService] Persistent cache MISS for key: ${key}`);
        return null;
      }

      const parsed = JSON.parse(cached);
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(cacheKey);
        console.log(`[CacheService] Persistent cache EXPIRED for key: ${key}`);
        return null;
      }

      console.log(`[CacheService] Persistent cache HIT for key: ${key}`);
      return parsed.value;
    } catch (e) {
      console.warn('LocalStorage read failed:', e);
      return this.getMemory(`persistent_${key}`);
    }
  }

  async withDebounce(key, fn, wait = 100) {
    const cacheKey = `${this.namespace}:debounce:${key}`

    if (this.pendingRequests.has(cacheKey)) {
      console.log(`[CacheService] Reusing pending request for ${key}`)
      return this.pendingRequests.get(cacheKey)
    }

    const promise = new Promise((resolve) => {
      setTimeout(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          console.error(`[CacheService] Debounced request failed for ${key}:`, error)
          resolve(null)
        } finally {
          this.pendingRequests.delete(cacheKey)
        }
      }, wait)
    })

    this.pendingRequests.set(cacheKey, promise)
    return promise
  }

  clear() {
    this.memoryCache.clear()
    this.pendingRequests.clear()
    console.log('[CacheService] Cleared all cache')
  }

  invalidate(pattern) {
    const keysToDelete = []
    for (const key of this.memoryCache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.memoryCache.delete(key))
    console.log(`[CacheService] Invalidated ${keysToDelete.length} cache entries for pattern: ${pattern}`)
  }

  cleanup() {
    const now = Date.now()
    let deletedCount = 0

    for (const [key, value] of this.memoryCache.entries()) {
      if (now > value.expiry) {
        this.memoryCache.delete(key)
        deletedCount++
      }
    }

    if (deletedCount > 0) {
      console.log(`[CacheService] Cleaned up ${deletedCount} expired cache entries`)
    }

    if (this.pendingRequests.size > 100) {
      const keys = Array.from(this.pendingRequests.keys())
      for (let i = 0; i < Math.min(10, keys.length); i++) {
        this.pendingRequests.delete(keys[i])
      }
    }
  }
}

export const cacheService = new CacheService('watchwithme')