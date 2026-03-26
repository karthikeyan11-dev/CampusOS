const { Redis } = require('@upstash/redis');
const config = require('../config/env');

/**
 * UPSTASH REDIS SERVICE (Serverless)
 * Replaces local Redis with Upstash REST-based client for production reliability.
 */

const redis = new Redis({
  url: config.redis.url,
  token: config.redis.token,
});

/**
 * Initialize Redis (No-op for Upstash REST)
 */
const initRedis = async () => {
  console.log('✅ [REDIS] Upstash REST Client initialized.');
  return redis;
};

const getRedisClient = async () => {
  return redis;
};

/**
 * Cache scan results
 */
const cacheScan = async (passId, data, ttlSeconds = 3) => {
  try {
    await redis.set(`gatepass:scan:${passId}`, JSON.stringify(data), {
      ex: ttlSeconds
    });
  } catch (err) {
    console.warn('⚠️ Upstash Redis Cache Set Error:', err.message);
  }
};

/**
 * Get cached scan
 */
const getCachedScan = async (passId) => {
  try {
    const data = await redis.get(`gatepass:scan:${passId}`);
    return data ? (typeof data === 'string' ? JSON.parse(data) : data) : null;
  } catch (err) {
    console.warn('⚠️ Upstash Redis Cache Get Error:', err.message);
    return null;
  }
};

/**
 * Invalidate scan cache
 */
const invalidateScan = async (passId) => {
  try {
    await redis.del(`gatepass:scan:${passId}`);
  } catch (err) {
    console.warn('⚠️ Upstash Redis Cache Del Error:', err.message);
  }
};

/**
 * Distributed Lock for Scheduler
 */
const acquireLock = async (lockName, ttlMs = 60000) => {
  try {
    const result = await redis.set(`lock:${lockName}`, 'locked', {
      nx: true,
      px: ttlMs
    });
    return result === 'OK';
  } catch (err) {
    return false;
  }
};

const releaseLock = async (lockName) => {
  try {
    await redis.del(`lock:${lockName}`);
  } catch (err) {}
};

const getStampedeLock = async (key, ttlMs = 500) => {
  try {
    const result = await redis.set(`stampede:${key}`, '1', { 
      nx: true, 
      px: ttlMs 
    });
    return result === 'OK';
  } catch (e) { return false; }
};

/**
 * COMPREHENSIVE CACHE-ASIDE PATTERN
 */
const getOrSetCache = async (key, dbFetcher, ttlSeconds = 300) => {
  try {
    const cached = await redis.get(key);
    if (cached) {
      console.log(`[REDIS] HIT: ${key}`);
      return typeof cached === 'string' ? JSON.parse(cached) : cached;
    }

    console.log(`[REDIS] MISS: ${key}. Fetching from DB...`);
    const data = await dbFetcher();
    
    // Asynchronous caching
    redis.set(key, JSON.stringify(data), { ex: ttlSeconds }).catch(err => {
      console.error(`🔴 Upstash Redis Async Set Error (${key}):`, err.message);
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
    const keys = await redis.keys(pattern);
    
    if (keys && keys.length > 0) {
      console.log(`[REDIS] Purging ${keys.length} stale nodes matching: ${pattern}`);
      await redis.del(...keys);
      console.log(`[REDIS] Successfully invalidated keys: ${keys.join(', ')}`);
    } else {
      console.log(`[REDIS] No stale nodes found for pattern: ${pattern}`);
    }
  } catch (err) {
    console.error(`🔴 Upstash Redis Invalidation Error (${pattern}):`, err.message);
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
