const { createClient } = require('redis');
const config = require('../config/env');

let redisClient = null;
let isSimulated = false;

/**
 * High-Fidelity In-Memory Redis Simulator
 * Used only when physical Redis is unavailable to prevent system breakdown.
 */
const createMockClient = () => {
  const store = new Map();
  console.warn('🛑 [REDIS] CRITICAL: Physical Redis unreachable. Initializing IN-MEMORY SIMULATION layer.');
  console.warn('⚠️  [REDIS] DATA LOSS PERIL: Simulation is volatile. State will reset on server restart.');
  
  isSimulated = true;
  return {
    isOpen: true,
    isMock: true,
    get: async (key) => store.get(key) || null,
    set: async (key, val, options) => {
      store.set(key, val);
      if (options?.PX) setTimeout(() => store.delete(key), options.PX);
      if (options?.EX) setTimeout(() => store.delete(key), options.EX * 1000);
      return 'OK';
    },
    del: async (key) => {
      if (Array.isArray(key)) {
        key.forEach(k => store.delete(k));
        return key.length;
      }
      return store.delete(key) ? 1 : 0;
    },
    incr: async (key) => {
      const val = parseInt(store.get(key) || '0') + 1;
      store.set(key, val.toString());
      return val;
    },
    expire: async (key, seconds) => {
      setTimeout(() => store.delete(key), seconds * 1000);
      return 1;
    },
    scan: async (cursor, options) => {
      const pattern = options.MATCH.replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      const keys = Array.from(store.keys()).filter(k => regex.test(k));
      return { cursor: 0, keys };
    },
    quit: async () => { isSimulated = false; store.clear(); },
    connect: async () => {},
    on: () => {}
  };
};

/**
 * MANDATORY: Initialize Redis Connection with Exponential Backoff
 */
const initRedis = async (retries = 3, delay = 1000) => {
  if (redisClient && redisClient.isOpen) return redisClient;

  // 🚩 CRITICAL: If retries are exhausted, pivot to simulation immediately
  if (retries <= 0) {
    if (config.nodeEnv === 'production') {
      console.error('🛑 [FATAL] Redis mandatory in Production. System halting.');
      process.exit(1);
    }
    redisClient = createMockClient();
    return redisClient;
  }

  // Use IPv4 explicit to bypass Windows ::1 conflicts
  const redisUrl = (config.redis.url || 'redis://127.0.0.1:6379').replace('localhost', '127.0.0.1');

  if (!redisClient) {
    redisClient = createClient({
      url: redisUrl,
      socket: { 
        reconnectStrategy: false, // Force fast-failure for boot check
        connectTimeout: 2000
      }
    });

    redisClient.on('error', (err) => {
      if (!isSimulated && retries === 1) console.error('🔴 [REDIS] Final connectivity check failed:', err.message);
    });
  }

  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
      console.log('✅ [REDIS] Physical Layer Connected. Synchronization active.');
    }
    return redisClient;
  } catch (err) {
    console.warn(`⏳ [REDIS] No local server at ${redisUrl}. Retrying (${retries})...`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Cleanup for next attempt
    try { await redisClient.quit(); } catch(e) {}
    redisClient = null; 
    return initRedis(retries - 1, delay * 2);
  }
};

const getRedisClient = async () => {
  if (!redisClient) await initRedis();
  return redisClient;
};

/**
 * Cache scan results with Stampede Protection
 */
const cacheScan = async (passId, data, ttlSeconds = 3) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return; // Fallback to DB-only
    
    await client.set(`gatepass:scan:${passId}`, JSON.stringify(data), {
      EX: ttlSeconds
    });
  } catch (err) {
    console.warn('⚠️ Redis Cache Set Error (Degrading to DB-only):', err.message);
  }
};

/**
 * Get cached scan with Fallback
 */
const getCachedScan = async (passId) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return null; // Fallback to DB-only
    
    const data = await client.get(`gatepass:scan:${passId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.warn('⚠️ Redis Cache Get Error (Degrading to DB-only):', err.message);
    return null;
  }
};

/**
 * Invalidate scan cache
 */
const invalidateScan = async (passId) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return;
    
    await client.del(`gatepass:scan:${passId}`);
  } catch (err) {
    console.warn('⚠️ Redis Cache Del Error:', err.message);
  }
};

/**
 * Distributed Lock for Scheduler with Renewal Support
 */
const acquireLock = async (lockName, ttlMs = 60000) => {
  try {
    const client = await initRedis(); // Ensures connection
    if (!client || !client.isOpen) return false; 
    
    const result = await client.set(`lock:${lockName}`, 'locked', {
      NX: true,
      PX: ttlMs
    });
    return result === 'OK';
  } catch (err) {
    return false;
  }
};

const releaseLock = async (lockName) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return;
    await client.del(`lock:${lockName}`);
  } catch (err) {}
};

const getStampedeLock = async (key, ttlMs = 500) => {
  try {
    const client = await initRedis();
    if (!client || !client.isOpen) return false;
    const result = await client.set(`stampede:${key}`, '1', { NX: true, PX: ttlMs });
    return result === 'OK';
  } catch (e) { return false; }
};

/**
 * COMPREHENSIVE CACHE-ASIDE PATTERN
 * Wraps database calls with Redis caching and TTL management.
 */
const getOrSetCache = async (key, dbFetcher, ttlSeconds = 300) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return await dbFetcher();

    const cached = await client.get(key);
    if (cached) {
      console.log(`[REDIS] HIT: ${key}`);
      return JSON.parse(cached);
    }

    console.log(`[REDIS] MISS: ${key}. Fetching from DB...`);
    const data = await dbFetcher();
    
    // Asynchronous caching (don't block the response)
    client.set(key, JSON.stringify(data), { EX: ttlSeconds }).catch(err => {
      console.error(`🔴 Redis Async Set Error (${key}):`, err.message);
    });

    return data;
  } catch (err) {
    console.warn(`⚠️ Cache-Aside Error (${key}):`, err.message);
    return await dbFetcher();
  }
};

/**
 * Invalidate multiple keys by pattern
 */
const invalidatePattern = async (pattern) => {
  try {
    const client = await getRedisClient();
    if (!client || !client.isOpen) return;
    
    // EXHAUSTIVE SCAN: Ensures all shards/slots are purged in development/production
    let cursor = 0;
    let totalInvalidated = 0;

    do {
      const result = await client.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = result.cursor;
      const keys = result.keys;

      if (keys && keys.length > 0) {
        await client.del(keys);
        totalInvalidated += keys.length;
      }
    } while (cursor !== 0);

    if (totalInvalidated > 0) {
      console.log(`[REDIS] Purged ${totalInvalidated} stale nodes matching: ${pattern}`);
    }
  } catch (err) {
    console.error(`🔴 Redis Exhaustive Invalidation Error (${pattern}):`, err.message);
  }
};

module.exports = {
  initRedis,
  getRedisClient,
  cacheScan,
  getCachedScan,
  invalidateScan,
  getOrSetCache,
  invalidatePattern,
  acquireLock,
  releaseLock,
  getStampedeLock
};
