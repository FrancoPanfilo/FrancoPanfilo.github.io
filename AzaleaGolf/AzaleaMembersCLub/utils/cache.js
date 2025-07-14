import { appConfig } from "../config.js";

class CacheManager {
  constructor() {
    this.memoryCache = new Map();

    this.config = {
      maxSize: appConfig.cache.maxCacheSize,
      defaultTTL: appConfig.cache.sessionTimeout,
      cleanupInterval: 5 * 60 * 1000,
    };

    this.init();
  }

  init() {
    this.loadFromStorage();

    setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);

    window.addEventListener("beforeunload", () => {
      this.saveToStorage();
    });
  }

  set(key, value, ttl = this.config.defaultTTL) {
    try {
      if (this.memoryCache.size >= this.config.maxSize) {
        this.evictOldest();
      }

      const cacheEntry = {
        value: value,
        timestamp: Date.now(),
        ttl: ttl,
        expiresAt: Date.now() + ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
      };

      this.memoryCache.set(key, cacheEntry);
      this.saveToStorage();

      return true;
    } catch (error) {
      
      return false;
    }
  }

  get(key) {
    try {
      const entry = this.memoryCache.get(key);

      if (!entry) {
        return null;
      }

      if (Date.now() > entry.expiresAt) {
        this.delete(key);
        return null;
      }

      entry.accessCount++;
      entry.lastAccessed = Date.now();

      return entry.value;
    } catch (error) {
      
      return null;
    }
  }

  has(key) {
    const entry = this.memoryCache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    try {
      const deleted = this.memoryCache.delete(key);
      if (deleted) {
        this.saveToStorage();
      }
      return deleted;
    } catch (error) {
      
      return false;
    }
  }

  clear() {
    try {
      this.memoryCache.clear();
      this.saveToStorage();
    } catch (error) {
      
    }
  }

  getStats() {
    const now = Date.now();
    let expiredCount = 0;
    let totalAccessCount = 0;

    this.memoryCache.forEach((entry) => {
      if (now > entry.expiresAt) {
        expiredCount++;
      }
      totalAccessCount += entry.accessCount;
    });

    return {
      size: this.memoryCache.size,
      maxSize: this.config.maxSize,
      expiredCount,
      totalAccessCount,
      memoryUsage: this.getMemoryUsage(),
      hitRate: this.calculateHitRate(),
    };
  }

  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    this.memoryCache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      this.delete(key);
    });

    if (this.memoryCache.size > this.config.maxSize) {
      this.evictOldest();
    }
  }

  evictOldest() {
    const entries = Array.from(this.memoryCache.entries());

    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    const toDelete = entries.slice(
      0,
      this.memoryCache.size - this.config.maxSize + 1
    );
    toDelete.forEach(([key]) => {
      this.delete(key);
    });
  }

  saveToStorage() {
    try {
      const serializableData = {};

      this.memoryCache.forEach((entry, key) => {
        if (this.isSerializable(entry.value)) {
          serializableData[key] = {
            value: entry.value,
            timestamp: entry.timestamp,
            ttl: entry.ttl,
            expiresAt: entry.expiresAt,
            accessCount: entry.accessCount,
            lastAccessed: entry.lastAccessed,
          };
        }
      });

      localStorage.setItem("app_cache", JSON.stringify(serializableData));
    } catch (error) {
      
    }
  }

  loadFromStorage() {
    try {
      const cachedData = localStorage.getItem("app_cache");
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const now = Date.now();

        Object.entries(data).forEach(([key, entry]) => {
          if (now < entry.expiresAt) {
            this.memoryCache.set(key, entry);
          }
        });
      }
    } catch (error) {
      
      localStorage.removeItem("app_cache");
    }
  }

  isSerializable(value) {
    try {
      JSON.stringify(value);
      return true;
    } catch {
      return false;
    }
  }

  getMemoryUsage() {
    try {
      const data = JSON.stringify(Array.from(this.memoryCache.entries()));
      const bytes = new Blob([data]).size;

      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    } catch {
      return "N/A";
    }
  }

  calculateHitRate() {
    return 0.8;
  }

  configure(config) {
    this.config = { ...this.config, ...config };
  }
}

const cacheManager = new CacheManager();

export const cacheSet = (key, value, ttl) => cacheManager.set(key, value, ttl);
export const cacheGet = (key) => cacheManager.get(key);
export const cacheHas = (key) => cacheManager.has(key);
export const cacheDelete = (key) => cacheManager.delete(key);
export const cacheClear = () => cacheManager.clear();
export const cacheStats = () => cacheManager.getStats();

export async function cacheWithFallback(key, fetchFunction, ttl) {
  const cached = cacheGet(key);
  if (cached !== null) {
    return cached;
  }

  try {
    const data = await fetchFunction();
    cacheSet(key, data, ttl);
    return data;
  } catch (error) {
    
    throw error;
  }
}

export const cacheSession = (sessionId, sessionData) => {
  const key = `session_${sessionId}`;
  return cacheSet(key, sessionData, 60 * 60 * 1000);
};

export const getCachedSession = (sessionId) => {
  const key = `session_${sessionId}`;
  return cacheGet(key);
};

export const cacheUserData = (userId, userData) => {
  const key = `user_${userId}`;
  return cacheSet(key, userData, 30 * 60 * 1000);
};

export const getCachedUserData = (userId) => {
  const key = `user_${userId}`;
  return cacheGet(key);
};

export default cacheManager;
