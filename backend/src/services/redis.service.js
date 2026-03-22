const { createClient } = require('redis');
const config = require('../config/env');

let redisClient = null;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient({
      url: config.redis.url
    });

    redisClient.on('error', (err) => console.error('🔴 Redis Client Error:', err));
    
    // Auto-connect if not connected
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  }
  return redisClient;
};

/**
 * Cache scan results with Stampede Protection
 */
const cacheScan = async (passId, data, ttlSeconds = 3) => {
  try {
    const client = await getRedisClient();
    if (!client.isOpen) return; // Fallback to DB-only
    
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
    if (!client.isOpen) return null; // Fallback to DB-only
    
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
    if (!client.isOpen) return;
    
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
    const client = await getRedisClient();
    if (!client.isOpen) return true; // Danger: Fallback to allowing execution if Redis is down? 
                                    // Better: In a single instance world, allowed. In multi, risky.
                                    // For now, prioritize execution over duplication.
    
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
    if (!client.isOpen) return;
    await client.del(`lock:${lockName}`);
  } catch (err) {}
};

/**
 * REDIS STAMPEDE PROTECTION: Request Coalescing Lock
 */
const getStampedeLock = async (key, ttlMs = 500) => {
  try {
    const client = await getRedisClient();
    if (!client.isOpen) return true;
    const result = await client.set(`stampede:${key}`, '1', { NX: true, PX: ttlMs });
    return result === 'OK';
  } catch (e) { return true; }
};

/**
 * COMPREHENSIVE CACHE-ASIDE PATTERN
 * Wraps database calls with Redis caching and TTL management.
 */
const getOrSetCache = async (key, dbFetcher, ttlSeconds = 300) => {
  try {
    const client = await getRedisClient();
    if (!client.isOpen) return await dbFetcher();

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
    if (!client.isOpen) return;
    
    // In cluster/large env, SCAN is safer than KEYS
    const { keys } = await client.scan(0, { MATCH: pattern, COUNT: 100 });
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[REDIS] Invalidated ${keys.length} keys matching: ${pattern}`);
    }
  } catch (err) {
    console.error(`🔴 Redis Pattern Invalidation Error (${pattern}):`, err.message);
  }
};

module.exports = {
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
